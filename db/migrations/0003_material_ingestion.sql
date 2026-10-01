-- Edvance Phase 5.6 — Text Extraction & Evidence Chunking
--
-- Uploaded materials live in private object storage (`learning_material`). This
-- migration adds the two tables that turn those opaque files into structured,
-- location-aware evidence for later AI phases:
--
--   * material_ingestion_job — one row per extraction attempt, so the Sources
--     UI can show real per-material processing state and a safe failure reason.
--   * material_chunk — the ordered, location-tagged evidence extracted from a
--     material. Re-ingesting a material replaces its chunks.
--
-- Both cascade from `learning_material`, so removing a material also removes its
-- jobs and chunks. No new database is introduced.

-- Ingestion jobs --------------------------------------------------------------
create table if not exists material_ingestion_job (
  id             text primary key,
  material_id    text not null references learning_material(id) on delete cascade,
  status         text not null default 'pending'
                   check (status in ('pending', 'processing', 'completed', 'failed')),
  started_at     timestamptz,
  completed_at   timestamptz,
  -- A short machine code (e.g. `corrupt-file`) plus a user-safe summary. Raw
  -- provider errors and material contents must never be stored here.
  error_code     text,
  error_summary  text,
  -- Derived, factual metadata about the completed extraction, e.g.
  -- { "unit": "page", "count": 14 }. Never fabricated.
  metadata       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists material_ingestion_job_material_idx
  on material_ingestion_job (material_id, created_at desc);

-- Evidence chunks -------------------------------------------------------------
create table if not exists material_chunk (
  id              text primary key,
  material_id     text not null references learning_material(id) on delete cascade,
  ordinal         integer not null,
  content         text not null,
  -- Human-readable location: "Page 7", "Slide 12", "00:04:12–00:04:38",
  -- "Section: Introduction to PROMPT", "Lines 1–12".
  source_location text not null,
  -- Structured location detail ({ type, page, slide, startTime, endTime, … }).
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  unique (material_id, ordinal)
);

create index if not exists material_chunk_material_idx
  on material_chunk (material_id, ordinal);
