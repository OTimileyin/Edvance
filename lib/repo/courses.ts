import { pool } from "@/lib/db";
import { SEED_COURSES } from "@/lib/data";
import type {
  AssessmentItem,
  ConceptMastery,
  ConceptStatus,
  ConsistencyStatus,
  Course,
  CourseConsistency,
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
      `select id, course_id, type, title, location
         from learning_material
        where course_id = any($1::text[])
        order by uploaded_at asc`,
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
    list.push({ id: row.id, type: row.type as SourceType, title: row.title, location: row.location });
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
