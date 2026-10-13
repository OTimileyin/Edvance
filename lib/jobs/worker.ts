import { runIngestJob } from "@/lib/ingestion";
import { JOB_TIMEOUT_MS, queueState, type JobKind, type JobResult } from "@/lib/jobs/policy";
import {
  claimNextJob,
  completeJob,
  failJob,
  listQueuedJobs,
  reclaimStaleJobs,
} from "@/lib/repo/jobs";
import type { WorkJob } from "@/lib/repo/jobs";

/**
 * The loop that actually does queued work.
 *
 * It runs inside the single `next start` process Specific deploys, started once
 * from `instrumentation.ts`. There is no queue platform here on purpose: one
 * Postgres table and one loop is what this scale needs, and it keeps the promise
 * the product already makes — no new services.
 *
 * Three properties it has to have, because each one is a way a background worker
 * fails badly:
 *
 *   - **It never dies.** A rejected promise inside a loop is a dead worker that
 *     looks alive, so every tick catches, logs a code, and schedules the next
 *     one. Nothing here is allowed to escape.
 *   - **It never blocks a response.** `drainNow()` runs *after* the response is
 *     sent (`after()` in the upload route), and the loop's own ticks are
 *     independent of any request. A drain is a head start, not a dependency.
 *   - **It never runs one job twice.** Claiming is atomic in SQL, so several
 *     overlapping drains — several tabs uploading at once — take different jobs.
 */

type JobHandler = (job: WorkJob) => Promise<JobResult>;

/**
 * How a job is named in a log line.
 *
 * The id alone is useless the moment something looks stuck: "which material is
 * not being read" is the question every log line here has to be able to answer,
 * and the id of an internal row never answers it. The target is what a learner
 * can point at, so it comes first and the id stays for correlation.
 */
function jobLabel(job: Pick<WorkJob, "id" | "kind" | "targetId" | "courseId">): string {
  return `${job.kind} ${job.targetId ?? job.courseId} (${job.id})`;
}

/**
 * The handlers that exist. `ingest` is the only kind anything enqueues yet:
 * analysis, checks, grading and revision arrive with their own PRs, and until
 * then nothing may enqueue them — a job that quietly did nothing would be worse
 * than a job that is not offered.
 */
const HANDLERS: Partial<Record<JobKind, JobHandler>> = {
  ingest: runIngestJob,
};

/** How many jobs one drain runs before it hands the event loop back. */
const DRAIN_BATCH = 5;
/**
 * How long to wait between ticks when there is nothing to do.
 *
 * Short, because an idle tick is one indexed claim query and because a learner
 * who has just uploaded something should not wait five seconds to find out that
 * reading it is under way. Also the worst-case delay for work that no request
 * can hand over — a file whose page was abandoned — since the drain the upload
 * route triggers is only ever a head start.
 */
const IDLE_INTERVAL_MS = 2_000;
/** How long to wait when the last tick found work — keeps a backlog moving. */
const BUSY_INTERVAL_MS = 200;
/** How often the reclaim sweep runs, so a restart resumes without a long silence. */
const RECLAIM_INTERVAL_MS = 60_000;

/**
 * Runs `work`, but gives up waiting after `ms`.
 *
 * The handler itself cannot be cancelled — nothing in Node can cancel an awaited
 * promise — so a timed-out attempt keeps running in the background and may still
 * finish. That is why the timeout records a *retryable* failure: the run may have
 * half-completed, and the retry re-derives everything from stored state rather
 * than trusting either attempt. The alternative — awaiting forever — is a loop
 * that stops claiming work for every learner because one job hung.
 */
async function withTimeout<T>(work: Promise<T>, ms: number, what: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(`${what} timed out after ${ms}ms`)), ms);
        timer.unref?.();
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Runs one claimed job and records the outcome. The only place a job's fate is
 * decided, so "what happened to this job" has one answer.
 */
async function runClaimed(job: WorkJob): Promise<void> {
  const handler = HANDLERS[job.kind];
  try {
    if (!handler) {
      // Permanent by policy: retrying work Oyevolve has no way to do would only
      // hide the defect behind two attempts.
      await failJob(job, {
        code: "no-handler",
        summary: `Oyevolve has no way to run a “${job.kind}” step yet.`,
      });
      return;
    }

    const result = await withTimeout(handler(job), JOB_TIMEOUT_MS, `${job.kind} ${job.id}`);
    if (result.ok) {
      await completeJob(job.id);
      return;
    }
    await failJob(job, { code: result.code, summary: result.summary });
  } catch (error) {
    // An escaping error is a bug or an outage, not a learner's mistake: record
    // it against the job (bounded by the policy's attempts) and keep the loop.
    const hung = error instanceof Error && error.message.includes("timed out after");
    console.error(
      `[jobs] ${jobLabel(job)} ${hung ? "timed out" : "threw"}: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
    await failJob(job, {
      code: hung ? "job-timeout" : "worker-error",
      summary: hung
        ? "Oyevolve took too long to finish this step. It will be tried again."
        : "Something went wrong while Oyevolve was working on this. It will be tried again.",
    }).catch((retryError: unknown) => {
      // The database itself is unreachable. The job stays `running` and the
      // reclaim sweep will return it — being stuck is recoverable, lying is not.
      console.error(
        `[jobs] could not record the failure of ${jobLabel(job)}: ${
          retryError instanceof Error ? retryError.message : "unknown error"
        }`,
      );
    });
  }
}

/**
 * Claims and runs due jobs, at most `limit` of them, and reports how many ran.
 * Stops as soon as the queue has nothing due, so an idle call costs one query.
 */
export async function drainOnce(limit = DRAIN_BATCH): Promise<number> {
  let ran = 0;
  for (let taken = 0; taken < limit; taken += 1) {
    const job = await claimNextJob();
    if (!job) break;
    // The one line a worker should always leave: what it took on, and how many
    // times it has now tried. Without it, "the queue is not moving" has no
    // evidence anywhere — which is the failure mode this whole PR exists to end.
    console.log(`[jobs] claimed ${jobLabel(job)} attempt ${job.attempts}`);
    await runClaimed(job);
    ran += 1;
  }
  return ran;
}

/**
 * Drains the queue now, driven by the request that produced the work.
 *
 * Deliberately rare: this is the upload route's head start so progress does not
 * wait for the loop's next tick. Each call is chained behind the previous one
 * rather than skipped, because a job enqueued while a drain is finishing would
 * otherwise be left for the interval — the exact delay this exists to remove.
 */
/** The tail of the drain chain. Never rejects; see the two arms below. */
let pendingDrain: Promise<void> = Promise.resolve();

export function drainNow(): Promise<void> {
  pendingDrain = pendingDrain.then(
    () => drainOnce().then(() => undefined),
    () => drainOnce().then(() => undefined),
  );
  return pendingDrain;
}

/**
 * The loop's own state, kept on `globalThis` rather than in module scope.
 *
 * Development loads this module again on every edit, and a fresh module scope
 * would mean a fresh `running` flag — a second loop per reload, all claiming
 * from one queue. The flag has to outlive the module for the guard to mean
 * anything, exactly as `lib/db.ts` caches its pool.
 */
const globalForQueue = globalThis as unknown as {
  oyevolveWorkerRunning?: boolean;
  oyevolveWorkerTimer?: ReturnType<typeof setTimeout> | null;
  oyevolveWorkerLastReclaim?: number;
};

/** One tick: recover abandoned work, then take whatever is due. */
async function tick(): Promise<void> {
  let wait = IDLE_INTERVAL_MS;
  try {
    const now = Date.now();
    if (now - (globalForQueue.oyevolveWorkerLastReclaim ?? 0) >= RECLAIM_INTERVAL_MS) {
      globalForQueue.oyevolveWorkerLastReclaim = now;
      const reclaimed = await reclaimStaleJobs();
      if (reclaimed.reclaimed > 0 || reclaimed.failed > 0) {
        console.log(
          `[jobs] reclaimed ${reclaimed.reclaimed} abandoned job(s), failed ${reclaimed.failed} out of attempts`,
        );
      }
    }
    const ran = await drainOnce();
    if (ran > 0) wait = BUSY_INTERVAL_MS;
  } catch (error) {
    // A database that is down must not end the loop; the next tick tries again.
    console.error(
      `[jobs] tick failed: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
  if (!globalForQueue.oyevolveWorkerRunning) return;
  const timer = setTimeout(() => void tick(), wait);
  globalForQueue.oyevolveWorkerTimer = timer;
  // Do not hold the process open on this timer alone: the HTTP server is what
  // keeps a server alive, and a one-off script must still be able to exit.
  timer.unref?.();
}

/**
 * Starts the loop, once per process.
 *
 * Idempotent because Next.js may load the instrumentation hook more than once in
 * development (hot reload), and a second loop would be a second claimer racing
 * the first for no benefit. Returns immediately: the caller — `register()` — must
 * finish before the server serves requests.
 */
export function startWorker(): void {
  if (globalForQueue.oyevolveWorkerRunning) return;
  globalForQueue.oyevolveWorkerRunning = true;
  // 0, not RECLAIM_INTERVAL_MS: a restart should resume abandoned work and pick
  // up its backlog immediately, not a minute later.
  globalForQueue.oyevolveWorkerLastReclaim = 0;
  console.log("[jobs] worker started");
  const timer = setTimeout(() => void tick(), 0);
  globalForQueue.oyevolveWorkerTimer = timer;
  timer.unref?.();
}

/** Stops the loop. For tests and scripts that must exit deterministically. */
export function stopWorker(): void {
  globalForQueue.oyevolveWorkerRunning = false;
  const timer = globalForQueue.oyevolveWorkerTimer;
  if (timer) clearTimeout(timer);
  globalForQueue.oyevolveWorkerTimer = null;
}

/** The queue as the UI shows it for one course: counts plus one honest sentence. */
export async function courseQueueState(userId: string, courseId: string) {
  return queueState(await listQueuedJobs(userId, courseId));
}
