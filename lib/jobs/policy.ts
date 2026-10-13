/**
 * The rules a queued job follows, kept pure so they can be tested without a
 * database, a worker or a clock.
 *
 * This module owns the vocabulary of background work — what a job is, how two
 * jobs are recognised as the same work, when a failed job may be tried again,
 * when a lock is old enough to steal — and `lib/repo/jobs.ts` owns the SQL that
 * applies those rules. The split matters: coalescing and retry boundaries are
 * exactly the things that are wrong in a way nobody notices (a course analysed
 * twice, a job that retries forever, a lock reclaimed while it is still held),
 * so they live where a unit test can reach them.
 *
 * Nothing here reads the clock or touches the database. `now` is a parameter.
 */

/** The five kinds of work the loop will eventually run. */
export const JOB_KINDS = ["ingest", "analyse", "check", "grade", "revision"] as const;
export type JobKind = (typeof JOB_KINDS)[number];

/**
 * `pending` = waiting to run (possibly deferred by a retry backoff),
 * `running` = claimed and in hand, `done` = finished, `failed` = finished badly
 * after exhausting its attempts. There is no silent state.
 */
export const JOB_STATUSES = ["pending", "running", "done", "failed"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

/**
 * What a handler reports back. A failure carries a short code and a reason a
 * learner can read; it never carries a raw provider error.
 */
export type JobResult = { ok: true } | { ok: false; code: string; summary: string };

/** What one job acts on. A job points at stored state; it never carries data. */
export interface JobScope {
  courseId: string;
  /** The material for `ingest`, the question for `check`; null for course-wide work. */
  targetId?: string | null;
}

/**
 * How many attempts a job gets in total. Small on purpose: this is a product for
 * one learner with a twenty-request daily model budget, not a fleet. A job that
 * has failed three times is a real problem and should be reported, not hammered.
 */
export const MAX_ATTEMPTS = 3;

/** The first retry waits this long; each further one doubles. */
export const BASE_BACKOFF_MS = 2_000;

/** The retry ceiling, so a long backoff never becomes "next week". */
export const MAX_BACKOFF_MS = 60_000;

/**
 * How long one attempt may run before it is treated as hung.
 *
 * A handler that never settles is worse than one that fails: it holds the loop,
 * and the loop is what everything else in the queue depends on. Generous, because
 * the slowest real work here is extracting a 25 MB document, but bounded — a
 * storage provider that stops answering has to become a recorded, retryable
 * failure rather than a process that quietly stops working.
 */
export const JOB_TIMEOUT_MS = 60_000;

/**
 * How long a job may stay `running` before it is treated as abandoned.
 *
 * Derived from the attempt bound rather than picked separately, because the two
 * answer the same question. Once `JOB_TIMEOUT_MS` has passed, the claiming loop
 * has already stopped waiting on that attempt and recorded what happened to it —
 * so a row still `running` at a small multiple of the bound is provably not being
 * worked on by anyone: the process that claimed it is gone, or something outside
 * Oyevolve took the row.
 *
 * The number matters because of what the learner sees meanwhile. Until the sweep
 * returns the row, the Sources list says "Queued to be read" for a file nothing is
 * reading, and no retry is scheduled. Twice the attempt bound keeps that window at
 * two minutes instead of five, while staying clear of any attempt a live loop
 * could still be running: a lock shorter than the attempt bound would be stolen
 * out from under a handler that is working normally.
 */
export const STALE_LOCK_MS = 2 * JOB_TIMEOUT_MS;

/**
 * What a job's coalescing identity is, per kind.
 *
 * The distinction is the whole point of coalescing. Reading a file is per file:
 * five uploads must produce five reads, so the material id is part of the key.
 * Analysing a course is per course: analysis reads every material, so ten files
 * landing together are covered by the one pending job, and a second one would
 * spend a model call to compute the same answer.
 */
const DEDUPE_SCOPE: Record<JobKind, "material" | "question" | "course"> = {
  ingest: "material",
  check: "question",
  analyse: "course",
  grade: "course",
  revision: "course",
};

/**
 * The key two jobs of the same kind must share to be the same work. The database
 * enforces uniqueness on this among `pending` rows, so coalescing survives two
 * tabs, two workers and a restart — it is not a check-then-insert race.
 */
export function dedupeKey(kind: JobKind, scope: JobScope): string {
  const where = DEDUPE_SCOPE[kind];
  if (where === "material") {
    if (!scope.targetId) throw new Error(`A ${kind} job must name the material it reads.`);
    return `${kind}:material:${scope.targetId}`;
  }
  if (where === "question") {
    if (!scope.targetId) throw new Error(`A ${kind} job must name the question it checks.`);
    return `${kind}:question:${scope.targetId}`;
  }
  return `${kind}:course:${scope.courseId}`;
}

/**
 * How long to wait before the attempt after `attempts` failures: 2s, 4s, 8s…
 * capped. Deterministic, so a test can state the schedule instead of tolerating
 * a range — and so two retries of the same work are equally spaced rather than
 * fighting each other.
 */
export function backoffMs(attempts: number): number {
  if (attempts <= 0) return 0;
  const growth = BASE_BACKOFF_MS * 2 ** (attempts - 1);
  return Math.min(MAX_BACKOFF_MS, growth);
}

/** When a job that has just failed for the `attempts`-th time may run again. */
export function nextRunAfter(attempts: number, now: Date): Date {
  return new Date(now.getTime() + backoffMs(attempts));
}

/**
 * Whether a claimed job has been `running` long enough to be considered
 * abandoned. A null lock is not stale — it is a job whose claim predates the
 * lock, and the reclaim sweep leaves it to the claim path.
 */
export function isStaleLock(lockedAt: Date | string | null | undefined, now: Date): boolean {
  if (!lockedAt) return false;
  return now.getTime() - new Date(lockedAt).getTime() >= STALE_LOCK_MS;
}

/**
 * Whether there is any point trying a failure again.
 *
 * A file with no readable text, a corrupt archive or an encrypted document will
 * fail identically forever: retrying it wastes the learner's time and then
 * reports the same thing three attempts later. A storage hiccup, a worker error
 * or an unexplained failure may well succeed on the next attempt. An unknown
 * code is treated as retryable, because it is bounded — `MAX_ATTEMPTS` is what
 * stops a loop, not this list.
 *
 * `no-handler` is here for the opposite reason: work with no handler is a defect
 * in Oyevolve, not bad luck, so it must be reported on the first attempt rather
 * than hidden behind two retries.
 */
const PERMANENT_FAILURES = new Set([
  "empty-content",
  "corrupt-file",
  "malformed-transcript",
  "unsupported-format",
  "material-missing",
  "no-handler",
]);

export function isRetryableFailure(code: string | null | undefined): boolean {
  if (!code) return true;
  return !PERMANENT_FAILURES.has(code);
}

/** The fields claim ordering needs — the DB orders by the same three, in the same order. */
export interface Claimable {
  id: string;
  runAfter: Date | string;
  createdAt: Date | string;
}

/**
 * Oldest due job first, then oldest enqueued, then by id so the order is total.
 * Mirrors `order by run_after asc, created_at asc, id asc` in the claim query;
 * a unit test keeps the two from drifting apart.
 */
export function claimOrder(a: Claimable, b: Claimable): number {
  const due = new Date(a.runAfter).getTime() - new Date(b.runAfter).getTime();
  if (due !== 0) return due;
  const born = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  if (born !== 0) return born;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** The subset of a job the queue summary needs. */
export interface QueueEntry {
  kind: JobKind;
  status: JobStatus;
  runAfter: Date | string;
  errorCode?: string | null;
}

export interface QueueSummary {
  /** Claimed, or due now: work actually happening. */
  active: number;
  /** Deferred by a retry backoff after a failure. */
  retrying: number;
  /** Waiting for another reason — the daily budget in PR 3 defers work this way. */
  waiting: number;
  failed: number;
}

/** Counts queued work by what it means to the learner right now. */
export function summariseQueue(entries: QueueEntry[], now: Date): QueueSummary {
  const summary: QueueSummary = { active: 0, retrying: 0, waiting: 0, failed: 0 };
  for (const entry of entries) {
    if (entry.status === "failed") {
      summary.failed += 1;
      continue;
    }
    if (entry.status === "done") continue;
    if (entry.status === "running" || new Date(entry.runAfter).getTime() <= now.getTime()) {
      summary.active += 1;
      continue;
    }
    if (entry.errorCode) summary.retrying += 1;
    else summary.waiting += 1;
  }
  return summary;
}

/**
 * One plain sentence about the queue, or null when there is nothing to say.
 *
 * A learner should never have to guess whether the app is still working. This is
 * the whole visible vocabulary of the queue: something is happening, something
 * is waiting to be tried again, or nothing is outstanding.
 */
export function queueLine(entries: QueueEntry[], now: Date): string | null {
  const { active, retrying, waiting } = summariseQueue(entries, now);
  const parts: string[] = [];
  if (active > 0) {
    parts.push(`Oyevolve is working on ${active} ${active === 1 ? "step" : "steps"}`);
  }
  if (retrying > 0) {
    parts.push(
      `${retrying} ${retrying === 1 ? "step is" : "steps are"} waiting to be tried again after a failure`,
    );
  }
  if (waiting > 0) {
    parts.push(`${waiting} ${waiting === 1 ? "step is" : "steps are"} queued for later`);
  }
  return parts.length > 0 ? `${parts.join(" · ")}.` : null;
}

/** Everything the UI needs to report a course's queue: the counts and the sentence. */
export interface QueueState extends QueueSummary {
  line: string | null;
}

export function queueState(entries: QueueEntry[], now: Date = new Date()): QueueState {
  return { ...summariseQueue(entries, now), line: queueLine(entries, now) };
}
