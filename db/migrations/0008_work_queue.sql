-- Oyevolve V2.2 — Background work that is not a request
--
-- Extraction and analysis used to run inside the HTTP request that uploaded the
-- file. That cannot survive ten files in one action, and it cannot survive a
-- restart at all: a learner who is told "uploaded" has been promised work that a
-- dead process will never do. This migration adds the one table that makes that
-- promise keepable.
--
--   work_job — durable, coalesced, retryable units of work. A job is claimed by
--   a worker, run, and recorded. It survives a restart because it is a row, not a
--   promise in memory.
--
-- The three rules that make it honest, each enforced here rather than by
-- application timing:
--
--   1. Coalescing. At most *one pending* job per `dedupe_key`. Ten files landing
--      together cannot queue ten course analyses; the pending job already covers
--      them. A *running* job plus a newly enqueued one is deliberate and not a
--      duplicate: it is the follow-up run for work that arrived while the first
--      was in flight.
--   2. Claiming. A worker takes the oldest due job with `for update skip locked`,
--      so two workers — or two tabs triggering a drain — cannot run one job
--      twice.
--   3. Reclaiming. A job stuck `running` past its lock threshold is work whose
--      process died. It returns to `pending`, so a restart resumes rather than
--      strands.
--
-- `material_ingestion_job` (0003) stays: it is the per-material extraction record
-- the Sources UI reads. `work_job` is the queue that decides when that work runs.

create table if not exists work_job (
  id            text primary key,
  -- Cascades from the learner and the course, so deleting either removes its
  -- queued work instead of leaving it to run against a missing row.
  user_id       text not null references "user"(id) on delete cascade,
  course_id     text not null references course(id) on delete cascade,
  kind          text not null
                  check (kind in ('ingest', 'analyse', 'check', 'grade', 'revision')),
  -- What the job acts on: a material id for `ingest`, a question id for `check`,
  -- null for course-wide work. Never a payload — a job is a pointer to stored
  -- state, so it cannot go stale or carry data across a learner boundary.
  target_id     text,
  -- The coalescing identity, computed by `lib/jobs/policy.ts` (one material for
  -- `ingest`, one course for `analyse`). Stored rather than derived in SQL so the
  -- rule lives in one testable place.
  dedupe_key    text not null,
  status        text not null default 'pending'
                  check (status in ('pending', 'running', 'done', 'failed')),
  -- Incremented when a job is claimed, so a retry after a crash is still counted.
  attempts      integer not null default 0,
  -- When the job may next run: now for new work, now + backoff after a retryable
  -- failure. A job beyond the daily budget is deferred by the same field in PR 3.
  run_after     timestamptz not null default now(),
  -- Set while `running`; the reclaim sweep compares it against the threshold.
  locked_at     timestamptz,
  -- A short machine code and a user-safe summary, in the same vocabulary as
  -- `material_ingestion_job`. Raw provider errors and material contents must
  -- never be stored here.
  error_code    text,
  error_summary text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Rule 1: coalescing, enforced by the database.
create unique index if not exists work_job_pending_dedupe_idx
  on work_job (dedupe_key) where status = 'pending';

-- Rule 2: the claim scan — oldest due pending job first.
create index if not exists work_job_claim_idx
  on work_job (run_after, created_at) where status = 'pending';

-- Rule 3: the reclaim scan — running jobs whose lock has expired.
create index if not exists work_job_stale_idx
  on work_job (locked_at) where status = 'running';

-- Reads for the UI: a course's queued work, and whether one material has any.
create index if not exists work_job_course_idx on work_job (course_id, created_at desc);
create index if not exists work_job_target_idx
  on work_job (target_id) where status in ('pending', 'running');
