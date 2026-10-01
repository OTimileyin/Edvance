-- Phase 7 — Assessment Intelligence.
--
-- `source_mapping` (Phase 4) already models "this question tests this concept,
-- evidenced by this material/location"; Phase 7 is what finally populates it.
-- This migration adds the per-question analysis state that the rest of the
-- product reports honestly, mirroring `course_analysis` exactly.
--
--   not-analyzed | analyzing | ready | failed | insufficient-evidence | needs-reanalysis

create table if not exists assessment_analysis (
  id                      text primary key,
  assessment_question_id  text not null unique
                            references assessment_question(id) on delete cascade,
  status                  text not null default 'not-analyzed'
                            check (status in ('not-analyzed', 'analyzing', 'ready', 'failed',
                                              'insufficient-evidence', 'needs-reanalysis')),
  error_code              text,
  error_summary           text,
  -- The course evidence fingerprint at analysis time. When materials change,
  -- the stored signature becomes needs-reanalysis with no model call.
  evidence_fingerprint    text,
  tested_concept_count    integer not null default 0,
  provider_metadata       jsonb,
  analyzed_at             timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists assessment_analysis_status_idx on assessment_analysis (status);

-- One consistency finding per analysed question, so re-analysis replaces rather
-- than appends. Course-level findings (assessment_question_id is null) are not
-- constrained by this.
create unique index if not exists consistency_finding_question_idx
  on consistency_finding (assessment_question_id)
  where assessment_question_id is not null;

-- A question maps to a concept once per evidence location; the index keeps a
-- re-analysis from duplicating the same trail.
create unique index if not exists source_mapping_question_concept_location_idx
  on source_mapping (assessment_question_id, concept_id, source_location)
  where concept_id is not null and source_location is not null;
