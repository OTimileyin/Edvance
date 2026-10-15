-- Retain concept identity, mastery and practice when course analysis changes.
alter table concept add column if not exists archived_at timestamptz;
create index if not exists concept_active_course_idx
  on concept (course_id) where archived_at is null;
