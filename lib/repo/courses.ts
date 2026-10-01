import { pool } from "@/lib/db";
import { SEED_COURSES } from "@/lib/data";
import type {
  AssessmentItem,
  ConceptMastery,
  ConceptStatus,
  ConsistencyStatus,
  Course,
  CourseConsistency,
  IngestionMetadata,
  IngestionStatus,
  SourceItem,
  SourceType,
} from "@/lib/types";

/**
 * Repository / data-access layer for course and learner records.
 *
 * Every function takes the owning `userId` (Better Auth's `user.id`) and never
 * scopes a query any other way, so a signed-in learner can only ever read or
 * write their own courses. This is the only module that knows the SQL schema;
 * the rest of the app speaks the `Course` domain type from `lib/types.ts`.
 */

type CourseRow = {
  id: string;
  title: string;
  institution: string;
  lesson: string;
  description: string;
};

type MaterialRow = {
  id: string;
  course_id: string;
  type: string;
  title: string;
  location: string;
  storage_reference: string | null;
  mime_type: string | null;
  size_bytes: string | null;
  job_status: string | null;
  job_error_code: string | null;
  job_error_summary: string | null;
  job_metadata: IngestionMetadata | null;
  chunk_count: string | null;
};

type ConceptRow = {
  id: string;
  course_id: string;
  name: string;
  status: string | null;
  score: number | null;
};

type AssessmentRow = {
  id: string;
  course_id: string;
  lesson: string;
  question_text: string;
};

type ConsistencyRow = {
  course_id: string;
  status: string;
  description: string;
  next_action: string;
};

const DEFAULT_CONSISTENCY: CourseConsistency = {
  status: "insufficient-evidence",
  reason: "No lesson evidence has been added yet, so consistency cannot be evaluated.",
  nextAction: "Add course materials to begin evaluating evidence.",
};

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function mapMaterial(row: MaterialRow): SourceItem {
  return {
    id: row.id,
    type: row.type as SourceType,
    title: row.title,
    location: row.location,
    storageReference: row.storage_reference,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes === null ? null : Number(row.size_bytes),
    ingestion: row.job_status
      ? {
          status: row.job_status as IngestionStatus,
          errorCode: row.job_error_code,
          errorSummary: row.job_error_summary,
          metadata: row.job_metadata ?? {},
          chunkCount: row.chunk_count === null ? 0 : Number(row.chunk_count),
        }
      : null,
  };
}

/**
 * Columns for a material plus its latest ingestion attempt and chunk count.
 * Lives in one place so every read reports the same processing state.
 */
const MATERIAL_COLUMNS = `m.id, m.course_id, m.type, m.title, m.location,
        m.storage_reference, m.mime_type, m.size_bytes,
        j.status as job_status, j.error_code as job_error_code,
        j.error_summary as job_error_summary, j.metadata as job_metadata,
        (select count(*) from material_chunk ch where ch.material_id = m.id) as chunk_count`;

const MATERIAL_LATEST_JOB = `left join lateral (
          select status, error_code, error_summary, metadata
            from material_ingestion_job
           where material_id = m.id
           order by created_at desc
           limit 1
        ) j on true`;

/** Turns a course title into a stable, readable id for the seeded workspaces. */
function slug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function hydrate(userId: string, courseRows: CourseRow[]): Promise<Course[]> {
  if (courseRows.length === 0) return [];
  const ids = courseRows.map((row) => row.id);

  const [materials, concepts, assessments, findings] = await Promise.all([
    pool.query<MaterialRow>(
      `select ${MATERIAL_COLUMNS}
         from learning_material m
         ${MATERIAL_LATEST_JOB}
        where m.course_id = any($1::text[])
        order by m.uploaded_at asc`,
      [ids],
    ),
    pool.query<ConceptRow>(
      `select c.id, c.course_id, c.name, m.status, m.score
         from concept c
         left join mastery_state m
           on m.concept_id = c.id and m.user_id = $2
        where c.course_id = any($1::text[])
        order by c.ordinal asc, c.name asc`,
      [ids, userId],
    ),
    pool.query<AssessmentRow>(
      `select id, course_id, lesson, question_text
         from assessment_question
        where course_id = any($1::text[])
        order by created_at asc`,
      [ids],
    ),
    pool.query<ConsistencyRow>(
      `select distinct on (course_id) course_id, status, description, next_action
         from consistency_finding
        where course_id = any($1::text[])
        order by course_id, created_at desc`,
      [ids],
    ),
  ]);

  const sourcesByCourse = new Map<string, SourceItem[]>();
  for (const row of materials.rows) {
    const list = sourcesByCourse.get(row.course_id) ?? [];
    list.push(mapMaterial(row));
    sourcesByCourse.set(row.course_id, list);
  }

  const conceptsByCourse = new Map<string, ConceptMastery[]>();
  for (const row of concepts.rows) {
    const list = conceptsByCourse.get(row.course_id) ?? [];
    list.push({
      name: row.name,
      status: (row.status ?? "Developing") as ConceptStatus,
      score: row.score ?? 0,
    });
    conceptsByCourse.set(row.course_id, list);
  }

  const assessmentsByCourse = new Map<string, AssessmentItem[]>();
  for (const row of assessments.rows) {
    const list = assessmentsByCourse.get(row.course_id) ?? [];
    list.push({ id: row.id, lesson: row.lesson, question: row.question_text });
    assessmentsByCourse.set(row.course_id, list);
  }

  const consistencyByCourse = new Map<string, CourseConsistency>();
  for (const row of findings.rows) {
    consistencyByCourse.set(row.course_id, {
      status: row.status as ConsistencyStatus,
      reason: row.description,
      nextAction: row.next_action,
    });
  }

  return courseRows.map((row) => ({
    id: row.id,
    name: row.title,
    institution: row.institution,
    lesson: row.lesson,
    summary: row.description,
    concepts: conceptsByCourse.get(row.id) ?? [],
    sources: sourcesByCourse.get(row.id) ?? [],
    assessments: assessmentsByCourse.get(row.id) ?? [],
    consistency: consistencyByCourse.get(row.id) ?? DEFAULT_CONSISTENCY,
  }));
}

export async function listCourses(userId: string): Promise<Course[]> {
  const { rows } = await pool.query<CourseRow>(
    `select id, title, institution, lesson, description
       from course
      where user_id = $1
      order by created_at asc`,
    [userId],
  );
  return hydrate(userId, rows);
}

export async function getCourse(userId: string, courseId: string): Promise<Course | undefined> {
  const { rows } = await pool.query<CourseRow>(
    `select id, title, institution, lesson, description
       from course
      where user_id = $1 and id = $2`,
    [userId, courseId],
  );
  const [course] = await hydrate(userId, rows);
  return course;
}

export async function createCourse(
  userId: string,
  input: { name: string; institution: string; lesson: string },
): Promise<Course> {
  const id = newId("course");
  await pool.query(
    `insert into course (id, user_id, title, institution, lesson, description)
     values ($1, $2, $3, $4, $5, $6)`,
    [
      id,
      userId,
      input.name.trim(),
      input.institution.trim() || "Draft course",
      input.lesson.trim() || "Lesson 1",
      "New workspace. Add learning materials in the Sources section.",
    ],
  );
  // Seed the workspace's own consistency finding so the overview explains why
  // nothing can be evaluated yet.
  await pool.query(
    `insert into consistency_finding (id, course_id, status, description, next_action)
     values ($1, $2, $3, $4, $5)`,
    [newId("finding"), id, DEFAULT_CONSISTENCY.status, DEFAULT_CONSISTENCY.reason, DEFAULT_CONSISTENCY.nextAction],
  );
  return (await getCourse(userId, id))!;
}

export async function addAssessment(
  userId: string,
  courseId: string,
  lesson: string,
  question: string,
): Promise<Course | undefined> {
  const owns = await pool.query("select 1 from course where id = $1 and user_id = $2", [
    courseId,
    userId,
  ]);
  if (owns.rowCount === 0) return undefined;

  const course = await getCourse(userId, courseId);
  await pool.query(
    `insert into assessment_question (id, course_id, lesson, question_text)
     values ($1, $2, $3, $4)`,
    [newId("question"), courseId, lesson.trim() || "Lesson 1", question.trim()],
  );
  return getCourse(userId, courseId).then((updated) => updated ?? course);
}

/** Whether the learner owns this course. Used to authorise uploads before storing anything. */
export async function ownsCourse(userId: string, courseId: string): Promise<boolean> {
  const { rowCount } = await pool.query("select 1 from course where id = $1 and user_id = $2", [
    courseId,
    userId,
  ]);
  return (rowCount ?? 0) > 0;
}

export type NewMaterial = {
  id: string;
  type: SourceType;
  title: string;
  location: string;
  storageReference: string;
  mimeType: string | null;
  sizeBytes: number | null;
};

/**
 * Records an uploaded material in the learner's course. The bytes are already
 * in object storage by the time this is called; `storageReference` is the
 * object key. Returns undefined when the learner does not own the course.
 */
export async function createMaterial(
  userId: string,
  courseId: string,
  input: NewMaterial,
): Promise<SourceItem | undefined> {
  if (!(await ownsCourse(userId, courseId))) return undefined;

  const { rows } = await pool.query<MaterialRow>(
    `insert into learning_material
       (id, course_id, type, title, location, storage_reference, mime_type, size_bytes)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     returning id, course_id, type, title, location,
               storage_reference, mime_type, size_bytes`,
    [
      input.id,
      courseId,
      input.type,
      input.title,
      input.location,
      input.storageReference,
      input.mimeType,
      input.sizeBytes,
    ],
  );
  return mapMaterial(rows[0]);
}

/** The stored object behind one material, scoped to the owning learner. */
export async function getMaterialStorage(
  userId: string,
  materialId: string,
): Promise<{ storageReference: string; title: string; mimeType: string | null } | undefined> {
  const { rows } = await pool.query<{
    storage_reference: string | null;
    title: string;
    mime_type: string | null;
  }>(
    `select m.storage_reference, m.title, m.mime_type
       from learning_material m
       join course c on c.id = m.course_id
      where m.id = $1 and c.user_id = $2`,
    [materialId, userId],
  );
  const row = rows[0];
  if (!row || !row.storage_reference) return undefined;
  return {
    storageReference: row.storage_reference,
    title: row.title,
    mimeType: row.mime_type,
  };
}

/**
 * Removes a material from one of the learner's courses and reports the object
 * key it was stored under, so the caller can clean up object storage.
 *
 * Returns undefined when the learner does not own the material. The database
 * row is removed first and is authoritative: an object left behind in the
 * bucket is invisible to the learner, whereas a row pointing at a deleted
 * object would be a broken record they can see.
 */
export async function deleteMaterial(
  userId: string,
  courseId: string,
  materialId: string,
): Promise<{ storageReference: string | null } | undefined> {
  const { rows } = await pool.query<{ storage_reference: string | null }>(
    `select m.storage_reference
       from learning_material m
       join course c on c.id = m.course_id
      where m.id = $1 and m.course_id = $2 and c.user_id = $3`,
    [materialId, courseId, userId],
  );
  if (rows.length === 0) return undefined;

  await pool.query("delete from learning_material where id = $1 and course_id = $2", [
    materialId,
    courseId,
  ]);
  return { storageReference: rows[0].storage_reference };
}

/** One material's stored object, for the ingestion pipeline to read. */
export async function getMaterialIngestionSource(
  userId: string,
  materialId: string,
): Promise<{ storageReference: string; type: string } | undefined> {
  const { rows } = await pool.query<{ storage_reference: string | null; type: string }>(
    `select m.storage_reference, m.type
       from learning_material m
       join course c on c.id = m.course_id
      where m.id = $1 and c.user_id = $2`,
    [materialId, userId],
  );
  const row = rows[0];
  if (!row || !row.storage_reference) return undefined;
  return { storageReference: row.storage_reference, type: row.type };
}

/** One material with its latest ingestion state, scoped to the owning learner. */
export async function getMaterial(
  userId: string,
  materialId: string,
): Promise<SourceItem | undefined> {
  const { rows } = await pool.query<MaterialRow>(
    `select ${MATERIAL_COLUMNS}
       from learning_material m
       ${MATERIAL_LATEST_JOB}
      where m.id = $1 and m.course_id in (select id from course where user_id = $2)`,
    [materialId, userId],
  );
  return rows[0] ? mapMaterial(rows[0]) : undefined;
}

/**
 * Creates a `pending` extraction job for a material. A material may accumulate
 * jobs over time (an upload, then retries); readers use the most recent one.
 */
export async function createIngestionJob(materialId: string): Promise<string> {
  const id = newId("ingest");
  await pool.query(
    `insert into material_ingestion_job (id, material_id, status) values ($1, $2, 'pending')`,
    [id, materialId],
  );
  return id;
}

export async function markIngestionProcessing(jobId: string): Promise<void> {
  await pool.query(
    `update material_ingestion_job
        set status = 'processing', started_at = now(), updated_at = now()
      where id = $1`,
    [jobId],
  );
}

export async function completeIngestion(
  jobId: string,
  metadata: IngestionMetadata,
): Promise<void> {
  await pool.query(
    `update material_ingestion_job
        set status = 'completed', completed_at = now(), updated_at = now(),
            error_code = null, error_summary = null, metadata = $2::jsonb
      where id = $1`,
    [jobId, JSON.stringify(metadata)],
  );
}

/** Records a safe failure reason; never stores a raw provider error. */
export async function failIngestion(
  jobId: string,
  errorCode: string,
  errorSummary: string,
): Promise<void> {
  await pool.query(
    `update material_ingestion_job
        set status = 'failed', completed_at = now(), updated_at = now(),
            error_code = $2, error_summary = $3
      where id = $1`,
    [jobId, errorCode, errorSummary],
  );
}

/** One evidence chunk as stored: its text, human-readable location and detail. */
export type StoredChunk = {
  content: string;
  sourceLocation: string;
  metadata: Record<string, unknown>;
};

/**
 * Replaces a material's evidence chunks with a fresh, ordered set. Runs in one
 * transaction so a re-ingestion never leaves a half-written chunk list behind.
 */
export async function replaceMaterialChunks(
  materialId: string,
  chunks: StoredChunk[],
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("delete from material_chunk where material_id = $1", [materialId]);
    for (const [ordinal, chunk] of chunks.entries()) {
      await client.query(
        `insert into material_chunk
           (id, material_id, ordinal, content, source_location, metadata)
         values ($1, $2, $3, $4, $5, $6::jsonb)`,
        [
          newId("chunk"),
          materialId,
          ordinal,
          chunk.content,
          chunk.sourceLocation,
          JSON.stringify(chunk.metadata),
        ],
      );
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export type SourceMapping = {
  id: string;
  assessmentQuestionId: string;
  conceptId: string | null;
  materialId: string | null;
  sourceLocation: string | null;
  confidence: number | null;
};

/**
 * Links an assessment question to the concept it tests and the material that
 * evidences it. Populated by the intelligence phases (6–7); exposed here so
 * the data-access layer already covers the full PRD model.
 */
export async function addSourceMapping(
  userId: string,
  input: {
    assessmentQuestionId: string;
    conceptId?: string | null;
    materialId?: string | null;
    sourceLocation?: string | null;
    confidence?: number | null;
  },
): Promise<SourceMapping | undefined> {
  // The join proves the question belongs to one of this learner's courses.
  const owns = await pool.query(
    `select 1
       from assessment_question q
       join course c on c.id = q.course_id
      where q.id = $1 and c.user_id = $2`,
    [input.assessmentQuestionId, userId],
  );
  if (owns.rowCount === 0) return undefined;

  const id = newId("mapping");
  const { rows } = await pool.query<{
    id: string;
    assessment_question_id: string;
    concept_id: string | null;
    material_id: string | null;
    source_location: string | null;
    confidence: string | null;
  }>(
    `insert into source_mapping
       (id, assessment_question_id, concept_id, material_id, source_location, confidence)
     values ($1, $2, $3, $4, $5, $6)
     returning id, assessment_question_id, concept_id, material_id, source_location, confidence`,
    [
      id,
      input.assessmentQuestionId,
      input.conceptId ?? null,
      input.materialId ?? null,
      input.sourceLocation ?? null,
      input.confidence ?? null,
    ],
  );
  const row = rows[0];
  return {
    id: row.id,
    assessmentQuestionId: row.assessment_question_id,
    conceptId: row.concept_id,
    materialId: row.material_id,
    sourceLocation: row.source_location,
    confidence: row.confidence === null ? null : Number(row.confidence),
  };
}

/** Every source mapping attached to one assessment question. */
export async function listSourceMappings(
  userId: string,
  assessmentQuestionId: string,
): Promise<SourceMapping[]> {
  const { rows } = await pool.query<{
    id: string;
    assessment_question_id: string;
    concept_id: string | null;
    material_id: string | null;
    source_location: string | null;
    confidence: string | null;
  }>(
    `select m.id, m.assessment_question_id, m.concept_id, m.material_id,
            m.source_location, m.confidence
       from source_mapping m
       join assessment_question q on q.id = m.assessment_question_id
       join course c on c.id = q.course_id
      where q.id = $1 and c.user_id = $2
      order by m.id asc`,
    [assessmentQuestionId, userId],
  );
  return rows.map((row) => ({
    id: row.id,
    assessmentQuestionId: row.assessment_question_id,
    conceptId: row.concept_id,
    materialId: row.material_id,
    sourceLocation: row.source_location,
    confidence: row.confidence === null ? null : Number(row.confidence),
  }));
}

/**
 * Seeds a brand-new learner with the demo workspaces so their first visit is
 * never empty. Idempotent and concurrency-safe: it takes a per-user advisory
 * lock, re-checks that the learner still has no courses, and writes everything
 * in one transaction. Real ingestion (Phase 5) replaces this with materials the
 * learner uploads.
 */
export async function ensureSeeded(userId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    // Serialise seeding for this learner so two parallel requests cannot both
    // observe an empty workspace and double-seed it.
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [userId]);
    const { rows } = await client.query<{ count: string }>(
      "select count(*)::text as count from course where user_id = $1",
      [userId],
    );
    if (rows[0].count !== "0") {
      await client.query("commit");
      return;
    }

    for (const seed of SEED_COURSES) {
      const courseId = `${slug(seed.name)}-${newId("c").slice(2, 10)}`;
      await client.query(
        `insert into course (id, user_id, title, institution, lesson, description)
         values ($1, $2, $3, $4, $5, $6)`,
        [courseId, userId, seed.name, seed.institution, seed.lesson, seed.summary],
      );

      for (const source of seed.sources) {
        await client.query(
          `insert into learning_material (id, course_id, type, title, location)
           values ($1, $2, $3, $4, $5)`,
          [newId("material"), courseId, source.type, source.title, source.location],
        );
      }

      for (const [ordinal, concept] of seed.concepts.entries()) {
        const conceptId = newId("concept");
        await client.query(
          `insert into concept (id, course_id, name, ordinal) values ($1, $2, $3, $4)`,
          [conceptId, courseId, concept.name, ordinal],
        );
        await client.query(
          `insert into mastery_state (id, user_id, concept_id, status, score)
           values ($1, $2, $3, $4, $5)`,
          [newId("mastery"), userId, conceptId, concept.status, concept.score],
        );
      }

      for (const assessment of seed.assessments) {
        await client.query(
          `insert into assessment_question (id, course_id, lesson, question_text)
           values ($1, $2, $3, $4)`,
          [newId("question"), courseId, assessment.lesson, assessment.question],
        );
      }

      await client.query(
        `insert into consistency_finding (id, course_id, status, description, next_action)
         values ($1, $2, $3, $4, $5)`,
        [
          newId("finding"),
          courseId,
          seed.consistency.status,
          seed.consistency.reason,
          seed.consistency.nextAction,
        ],
      );
    }

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
