-- Edvance Phase 5 — Course Material Ingestion (Cloudflare R2)
-- `learning_material.storage_reference` (the object key in R2) already exists
-- from Phase 4. This migration adds the metadata an upload needs so the
-- Sources section can describe a stored file without contacting object storage.

alter table learning_material
  add column if not exists mime_type text;

alter table learning_material
  add column if not exists size_bytes bigint;
