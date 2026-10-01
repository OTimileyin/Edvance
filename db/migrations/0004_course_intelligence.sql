-- Edvance Phase 6 — Course Intelligence
--
-- Turns real `material_chunk` evidence into real, evidence-grounded course
-- intelligence. This migration adds the durable state the analysis pipeline
-- needs and extends `concept` so a stored concept can carry its evidence status
-- and the exact source locations it was drawn from. Every new table cascades
-- from `course`, so deleting a course removes its intelligence with it.
--
-- No new database is introduced: concepts, relationships and evidence all live
-- in PostgreSQL next to the course they belong to.

-- Analysis state --------------------------------------------------------------
-- One row per course. `status` mirrors the states the UI shows. The evidence
-- fingerprint lets the app detect that uploaded materials changed since the
-- last analysis, without re-sending anything to the model.
create table if not exists course_analysis (
  id                    text primary key,
  course_id             text not null unique references course(id) on delete cascade,
  status                text not null default 'not-analyzed'
                          check (status in (
                            'not-analyzed',
                            'analyzing',
                            'ready',
                            'failed',
                            'insufficient-evidence',
                            'needs-reanalysis'
                          )),
  -- A short machine code plus a user-safe summary. Raw provider errors and
  -- model output are never stored here.
  error_code            text,
  error_summary         text,
  -- A hash of the analysable evidence (material ids + chunk counts). Compared
  -- against the current evidence to mark intelligence stale. Never contains
  -- course contents.
  evidence_fingerprint  text,
  concept_count         integer not null default 0,
  relationship_count    integer not null default 0,
  -- Safe provider usage metadata (model name, token counts); never prompts or
  -- response bodies.
  provider_metadata     jsonb not null default '{}'::jsonb,
  analyzed_at           timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists course_analysis_course_idx on course_analysis (course_id);

-- Concept extensions ----------------------------------------------------------
-- `origin` distinguishes concepts seeded for demo workspaces from concepts the
-- learner's own materials produced. Only `analysis` concepts are shown once a
-- course has been analysed, so mock concepts never masquerade as real ones.
alter table concept add column if not exists origin text not null default 'seed';
alter table concept add column if not exists evidence_status text;
alter table concept add column if not exists confidence numeric(4, 3);

create index if not exists concept_course_origin_idx on concept (course_id, origin);

-- Concept evidence ------------------------------------------------------------
-- The exact evidence a concept rests on: a real chunk of a real material, with
-- the human-readable location shown to the learner ("Page 7", "Slide 12",
-- "00:04:12–00:04:38"). A concept with no rows here is INSUFFICIENT_EVIDENCE.
create table if not exists concept_evidence (
  id              text primary key,
  concept_id      text not null references concept(id) on delete cascade,
  material_id     text not null references learning_material(id) on delete cascade,
  chunk_id        text not null references material_chunk(id) on delete cascade,
  source_location text not null,
  -- A short verbatim excerpt from the learner's own material that supports the
  -- concept. Never model-generated text.
  excerpt         text,
  created_at      timestamptz not null default now(),
  unique (concept_id, chunk_id)
);

create index if not exists concept_evidence_concept_idx on concept_evidence (concept_id);
create index if not exists concept_evidence_chunk_idx on concept_evidence (chunk_id);

-- Concept relationships -------------------------------------------------------
-- A small, justified vocabulary — not a graph platform. Every relationship is
-- backed by the course's own evidence and can be removed with its course.
create table if not exists concept_relationship (
  id               text primary key,
  course_id        text not null references course(id) on delete cascade,
  from_concept_id  text not null references concept(id) on delete cascade,
  to_concept_id    text not null references concept(id) on delete cascade,
  kind             text not null
                     check (kind in ('prerequisite', 'part_of', 'related_to', 'contrasts_with')),
  justification    text not null default '',
  created_at       timestamptz not null default now(),
  unique (course_id, from_concept_id, to_concept_id, kind)
);

create index if not exists concept_relationship_course_idx on concept_relationship (course_id);
