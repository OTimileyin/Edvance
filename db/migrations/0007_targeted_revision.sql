-- Phase 9 — Targeted Revision.
--
-- The revision *recommendation* is derived deterministically from mastery (Phase
-- 8) and the course's evidence (Phase 6): it needs no model and no table. This
-- migration exists for the one part that does need a model — targeted practice
-- questions written for the learner's weak areas.
--
--   * `practice_question`  — generated practice, each grounded in one real
--                            concept and one real evidence chunk.
--   * `revision_plan`      — the per-course generation state, mirroring
--                            `course_analysis` and `assessment_analysis`.
--
--   not-analyzed | analyzing | ready | failed | insufficient-evidence | needs-reanalysis

create table if not exists practice_question (
  id                 text primary key,
  course_id          text not null references course(id) on delete cascade,
  concept_id         text references concept(id) on delete set null,
  question_text      text not null,
  rationale          text not null default '',
  source_material_id text references learning_material(id) on delete set null,
  source_location    text,
  created_at         timestamptz not null default now()
);

create index if not exists practice_question_course_idx
  on practice_question (course_id, created_at desc);

create table if not exists revision_plan (
  id                 text primary key,
  course_id          text not null unique references course(id) on delete cascade,
  status             text not null default 'not-analyzed'
                       check (status in ('not-analyzed', 'analyzing', 'ready', 'failed',
                                         'insufficient-evidence', 'needs-reanalysis')),
  error_code         text,
  error_summary      text,
  -- The weak-area fingerprint (concept + mastery state) this generation was
  -- written for. When the learner practises and mastery moves, the stored plan
  -- becomes needs-reanalysis with no model call.
  generated_for      text,
  question_count     integer not null default 0,
  provider_metadata  jsonb,
  generated_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
