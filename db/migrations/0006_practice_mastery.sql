-- Phase 8 — Practice-based mastery intelligence.
--
-- Mastery is never asserted by a model and never handed to a learner: it is
-- *derived* from the learner's own recorded practice. Each row below is one
-- thing the learner actually did — answered an assessment question, or
-- self-assessed a single concept — and whether they judged it correct.
--
-- `mastery_state` (Phase 4) stays the materialised per-learner, per-concept
-- result. Recording an attempt recomputes that result from the attempt history
-- and upserts it, so the profile is always reproducible from the attempts.

create table if not exists practice_attempt (
  id                     text primary key,
  user_id                text not null references "user"(id) on delete cascade,
  course_id              text not null references course(id) on delete cascade,
  concept_id             text references concept(id) on delete cascade,
  assessment_question_id text references assessment_question(id) on delete set null,
  answer                 text not null default '',
  is_correct             boolean not null,
  created_at             timestamptz not null default now(),
  -- An attempt is always about something: a concept, a question, or both.
  check (concept_id is not null or assessment_question_id is not null)
);

create index if not exists practice_attempt_user_concept_idx
  on practice_attempt (user_id, concept_id);

create index if not exists practice_attempt_course_idx
  on practice_attempt (course_id, created_at desc);

-- Traceability on the materialised state: how much real practice a status rests
-- on, and when it was last touched. Defaults keep seeded demo rows valid.
alter table mastery_state add column if not exists attempt_count integer not null default 0;
alter table mastery_state add column if not exists correct_count integer not null default 0;
alter table mastery_state add column if not exists last_attempt_at timestamptz;
