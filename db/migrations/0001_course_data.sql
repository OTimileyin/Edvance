-- Edvance Phase 4 — Course Data & PostgreSQL
-- Implements the PRD §15 high-level data model. Better Auth already owns the
-- `user`, `session`, `account`, and `verification` tables; this migration adds
-- the course and learner records that reference them.
--
-- All identifiers are text so that seeded demo workspaces keep stable,
-- human-readable ids (e.g. `ai-foundry`) while new records use UUIDs.

-- Course -------------------------------------------------------------------
create table if not exists course (
  id          text primary key,
  user_id     text not null references "user"(id) on delete cascade,
  title       text not null,
  institution text not null default '',
  lesson      text not null default '',
  description text not null default '',
  created_at  timestamptz not null default now()
);

create index if not exists course_user_id_idx on course (user_id);

-- LearningMaterial ---------------------------------------------------------
create table if not exists learning_material (
  id                text primary key,
  course_id         text not null references course(id) on delete cascade,
  type              text not null,
  title             text not null,
  location          text not null default '',
  storage_reference text,
  uploaded_at       timestamptz not null default now()
);

create index if not exists learning_material_course_id_idx on learning_material (course_id);

-- Concept ------------------------------------------------------------------
create table if not exists concept (
  id               text primary key,
  course_id        text not null references course(id) on delete cascade,
  name             text not null,
  instructor_term  text,
  definition       text,
  source_reference text,
  ordinal          integer not null default 0
);

create index if not exists concept_course_id_idx on concept (course_id);

-- AssessmentQuestion -------------------------------------------------------
create table if not exists assessment_question (
  id            text primary key,
  course_id     text not null references course(id) on delete cascade,
  lesson        text not null default '',
  question_text text not null,
  created_at    timestamptz not null default now()
);

create index if not exists assessment_question_course_id_idx on assessment_question (course_id);

-- SourceMapping ------------------------------------------------------------
-- Links an assessment question to the concept it tests and the material that
-- evidences it. Confidence is a 0..1 probability.
create table if not exists source_mapping (
  id                      text primary key,
  assessment_question_id  text not null references assessment_question(id) on delete cascade,
  concept_id              text references concept(id) on delete set null,
  material_id             text references learning_material(id) on delete set null,
  source_location         text,
  confidence              numeric(4, 3)
);

create index if not exists source_mapping_question_idx on source_mapping (assessment_question_id);

-- ConsistencyFinding -------------------------------------------------------
-- Detected contradictions between course materials and assessment wording.
create table if not exists consistency_finding (
  id                      text primary key,
  course_id               text not null references course(id) on delete cascade,
  assessment_question_id  text references assessment_question(id) on delete cascade,
  status                  text not null,
  description             text not null default '',
  source_a                text,
  source_b                text,
  next_action             text not null default '',
  created_at              timestamptz not null default now()
);

create index if not exists consistency_finding_course_id_idx on consistency_finding (course_id);

-- MasteryState -------------------------------------------------------------
-- Per-learner, per-concept status and score.
create table if not exists mastery_state (
  id         text primary key,
  user_id    text not null references "user"(id) on delete cascade,
  concept_id text not null references concept(id) on delete cascade,
  status     text not null default 'Developing',
  score      integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, concept_id)
);

create index if not exists mastery_state_user_id_idx on mastery_state (user_id);
