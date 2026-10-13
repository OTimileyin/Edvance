import { pool } from "@/lib/db";
import {
  MAX_ATTEMPTS,
  STALE_LOCK_MS,
  dedupeKey,
  isRetryableFailure,
  nextRunAfter,
  type JobKind,
  type JobScope,
  type JobStatus,
} from "@/lib/jobs/policy";

/**
 * The durable queue, as PostgreSQL.
 *
 * Every statement here is the SQL side of a rule `lib/jobs/policy.ts` states in
 * the abstract: coalescing is the partial unique index, claiming is
 * `for update skip locked`, a retry is the backoff schedule, staleness is the
 * lock threshold. The rules are testable there; this file is where they are
 * applied, and it deliberately makes no decisions of its own.
 */

/** One queued unit of work, as read back. */
export interface WorkJob {
  id: string;
  userId: string;
  courseId: string;
  kind: JobKind;
  /** The material for `ingest`, the question for `check`; null for course-wide work. */
  targetId: string | null;
  status: JobStatus;
  /** How many times a worker has claimed it, including the attempt in flight. */
  attempts: number;
  /** ISO timestamp: the earliest moment this job may run. */
  runAfter: string;
  lockedAt: string | null;
  errorCode: string | null;
  errorSummary: string | null;
  createdAt: string;
}

type JobRow = {
  id: string;
  user_id: string;
  course_id: string;
  kind: string;
  target_id: string | null;
  status: string;
  attempts: number;
  run_after: Date;
  locked_at: Date | null;
  error_code: string | null;
  error_summary: string | null;
  created_at: Date;
};

const JOB_COLUMNS = `id, user_id, course_id, kind, target_id, status, attempts,
        run_after, locked_at, error_code, error_summary, created_at`;

/** The same columns, qualified for the claim's `update … from` join. */
const JOB_COLUMNS_ALIASED = `j.id, j.user_id, j.course_id, j.kind, j.target_id, j.status,
        j.attempts, j.run_after, j.locked_at, j.error_code, j.error_summary, j.created_at`;

function mapJob(row: JobRow): WorkJob {
  return {
    id: row.id,
    userId: row.user_id,
    courseId: row.course_id,
    kind: row.kind as JobKind,
    targetId: row.target_id,
    status: row.status as JobStatus,
    attempts: Number(row.attempts),
    runAfter: new Date(row.run_after).toISOString(),
    lockedAt: row.locked_at ? new Date(row.locked_at).toISOString() : null,
    errorCode: row.error_code,
    errorSummary: row.error_summary,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export interface EnqueueInput extends JobScope {
  userId: string;
  kind: JobKind;
}

export interface EnqueueResult {
  /** The job that will run — the new one, or the pending one it merged into. */
  id: string;
  /** True when an identical job was already pending and nothing new was created. */
  coalesced: boolean;
}

/**
 * Puts work on the queue, or recognises that it is already there.
 *
 * Coalescing is the database's job, not this function's: the partial unique
 * index admits at most one pending job per dedupe key, and `on conflict … do
 * nothing` turns a race between two uploads into one job. That is what makes
 * "two tabs uploading at once do not analyse the course twice" true rather than
 * likely.
 *
 * A job that is currently `running` does not block a new pending row: the
 * follow-up run is how work that arrived mid-flight is not forgotten.
 */
export async function enqueueJob(input: EnqueueInput): Promise<EnqueueResult> {
  const key = dedupeKey(input.kind, input);
  const id = newId("job");

  const { rows } = await pool.query<{ id: string }>(
    `insert into work_job (id, user_id, course_id, kind, target_id, dedupe_key, status, run_after)
     values ($1, $2, $3, $4, $5, $6, 'pending', now())
     on conflict (dedupe_key) where status = 'pending' do nothing
     returning id`,
    [id, input.userId, input.courseId, input.kind, input.targetId ?? null, key],
  );

  if (rows[0]) return { id: rows[0].id, coalesced: false };

  // Nothing inserted: an identical job is already pending. Report that job, so a
  // caller can still say what will run.
  const existing = await pool.query<{ id: string }>(
    `select id from work_job where dedupe_key = $1 and status = 'pending' limit 1`,
    [key],
  );
  return { id: existing.rows[0]?.id ?? id, coalesced: true };
}

/**
 * Claims the oldest due job, atomically.
 *
 * The subquery locks one candidate and skips rows another worker already holds,
 * so two drains running at the same moment take two different jobs and never the
 * same one. This is the only reason a single `next start` process can host
 * several overlapping drains safely.
 */
export async function claimNextJob(): Promise<WorkJob | null> {
  const { rows } = await pool.query<JobRow>(
    `update work_job j
        set status = 'running',
            locked_at = now(),
            attempts = j.attempts + 1,
            updated_at = now()
       from (
         select id
           from work_job
          where status = 'pending' and run_after <= now()
          order by run_after asc, created_at asc, id asc
          limit 1
          for update skip locked
       ) candidate
      where j.id = candidate.id
      returning ${JOB_COLUMNS_ALIASED}`,
    [],
  );
  return rows[0] ? mapJob(rows[0]) : null;
}

/**
 * Marks a claimed job finished. Records nothing else — success needs no excuse,
 * and the row is kept rather than deleted so the queue can be inspected (and so
 * a finished job's attempts are not silently rewritten by the next one).
 */
export async function completeJob(id: string): Promise<void> {
  await pool.query(
    `update work_job
        set status = 'done', updated_at = now(),
            locked_at = null, error_code = null, error_summary = null
      where id = $1`,
    [id],
  );
}

export interface JobFailure {
  code: string;
  summary: string;
}

export interface FailureOutcome {
  /** True when the job went back to `pending` for another attempt. */
  retrying: boolean;
  /** The attempt count this failure concluded. */
  attempts: number;
}

/**
 * Records a failure and decides what happens next, from the two rules that
 * together make retries honest: retry only what could plausibly succeed, and
 * only as many times as the policy allows. Everything else becomes a visible
 * `failed` job with a reason a learner can read.
 */
export async function failJob(
  job: Pick<WorkJob, "id" | "attempts">,
  failure: JobFailure,
  now = new Date(),
): Promise<FailureOutcome> {
  const retrying = isRetryableFailure(failure.code) && job.attempts < MAX_ATTEMPTS;
  const runAfter = retrying ? nextRunAfter(job.attempts, now) : null;

  await pool.query(
    `update work_job
        set status = $2,
            run_after = coalesce($3, run_after),
            locked_at = null,
            error_code = $4,
            error_summary = $5,
            updated_at = now()
      where id = $1`,
    [job.id, retrying ? "pending" : "failed", runAfter, failure.code, failure.summary],
  );

  return { retrying, attempts: job.attempts };
}

/**
 * Returns abandoned work to the queue.
 *
 * A job left `running` by a process that died would otherwise sit there forever
 * while the learner is shown "working on it". This is the recovery that makes a
 * restart resumable instead of silently lossy, and it is why the upload response
 * does not have to stay open to keep its promise.
 *
 * A job that has already spent its attempts becomes a visible failure rather
 * than another round — a crash loop is not a learner's problem to watch.
 */
export async function reclaimStaleJobs(
  now = new Date(),
): Promise<{ reclaimed: number; failed: number }> {
  const cutoff = new Date(now.getTime() - STALE_LOCK_MS);
  const summary =
    "Oyevolve stopped while this step was running. It has been put back in the queue.";

  const exhausted = await pool.query(
    `update work_job
        set status = 'failed', locked_at = null, updated_at = now(),
            error_code = 'stale-lock',
            error_summary = 'Oyevolve stopped while this step was running, and it has run out of attempts.'
      where status = 'running' and locked_at is not null and locked_at < $1 and attempts >= $2`,
    [cutoff, MAX_ATTEMPTS],
  );

  const reclaimed = await pool.query(
    `update work_job
        set status = 'pending', run_after = now(), locked_at = null, updated_at = now(),
            error_code = 'stale-lock', error_summary = $2
      where status = 'running' and locked_at is not null and locked_at < $1`,
    [cutoff, summary],
  );

  return { reclaimed: reclaimed.rowCount ?? 0, failed: exhausted.rowCount ?? 0 };
}

/** Every unfinished job a learner still has in one course, newest last. */
export async function listQueuedJobs(userId: string, courseId: string): Promise<WorkJob[]> {
  const { rows } = await pool.query<JobRow>(
    `select ${JOB_COLUMNS}
       from work_job
      where user_id = $1 and course_id = $2 and status in ('pending', 'running', 'failed')
      order by created_at asc`,
    [userId, courseId],
  );
  return rows.map(mapJob);
}
