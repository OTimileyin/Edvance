import { pool } from "@/lib/db";
import { SEED_COURSES } from "@/lib/data";
import { deriveMastery } from "@/lib/mastery";
import {
  buildRevisionFocus,
  buildRevisionNextAction,
  revisionFingerprint,
  type RevisionConceptInput,
} from "@/lib/revision";
import type { AiUsage, EvidenceChunk } from "@/lib/ai/types";
import type { AnalyzedConcept, AnalyzedRelationship } from "@/lib/ai/course-intelligence";
import type { AnalyzedRevision } from "@/lib/ai/revision-intelligence";
import type {
  AnalysisStatus,
  AssessmentItem,
  AssessmentSignature,
  ConceptEvidenceRef,
  ConceptMastery,
  ConceptStatus,
  ConsistencyStatus,
  Course,
  CourseConcept,
  CourseConsistency,
  CourseIntelligence,
  CourseRelationship,
  EvidenceStatus,
  IngestionMetadata,
  IngestionStatus,
  PracticeAttempt,
  PracticeQuestion,
  RelationshipKind,
  RevisionFocus,
  RevisionPlan,
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

type AnalysisRow = {
  course_id: string;
  status: string;
  error_code: string | null;
  error_summary: string | null;
  evidence_fingerprint: string | null;
  concept_count: number;
  relationship_count: number;
  provider_metadata: { model?: string; inputTokens?: number; outputTokens?: number } | null;
  analyzed_at: Date | null;
};

type CourseConceptRow = {
  id: string;
  course_id: string;
  name: string;
  instructor_term: string | null;
  definition: string | null;
  evidence_status: string | null;
  confidence: string | null;
};

type ConceptEvidenceRow = {
  id: string;
  concept_id: string;
  material_id: string;
  material_title: string;
  source_location: string;
  excerpt: string | null;
};

type ConceptRelationshipRow = {
  id: string;
  course_id: string;
  from_concept_id: string;
  to_concept_id: string;
  from_name: string;
  to_name: string;
  kind: string;
  justification: string;
};

type AssessmentAnalysisRow = {
  assessment_question_id: string;
  status: string;
  error_code: string | null;
  error_summary: string | null;
  evidence_fingerprint: string | null;
  tested_concept_count: number;
  provider_metadata: { model?: string; inputTokens?: number; outputTokens?: number } | null;
  analyzed_at: Date | null;
};

type QuestionFindingRow = {
  assessment_question_id: string | null;
  status: string;
  description: string;
  next_action: string;
};

type SourceMappingRow = {
  assessment_question_id: string;
  concept_id: string | null;
  material_id: string | null;
  source_location: string | null;
};

type RevisionRow = {
  course_id: string;
  status: string;
  error_code: string | null;
  error_summary: string | null;
  generated_for: string | null;
  question_count: number;
  provider_metadata: { model?: string; inputTokens?: number; outputTokens?: number } | null;
  generated_at: Date | null;
};

type PracticeQuestionRow = {
  id: string;
  course_id: string;
  concept_id: string | null;
  concept_name: string | null;
  question_text: string;
  rationale: string;
  material_title: string | null;
  source_location: string | null;
  created_at: Date;
};

type PracticeAttemptRow = {
  id: string;
  course_id: string;
  concept_id: string | null;
  concept_name: string | null;
  assessment_question_id: string | null;
  question_text: string | null;
  answer: string;
  is_correct: boolean;
  created_at: Date;
};

/** How many recent attempts a course view carries, so a long history stays bounded. */
const MAX_RECENT_ATTEMPTS = 50;

const DEFAULT_CONSISTENCY: CourseConsistency = {
  status: "insufficient-evidence",
  reason: "No lesson evidence has been added yet, so consistency cannot be evaluated.",
  nextAction: "Add course materials to begin evaluating evidence.",
};

const DEFAULT_INTELLIGENCE: CourseIntelligence = {
  status: "not-analyzed",
  errorCode: null,
  errorSummary: null,
  conceptCount: 0,
  relationshipCount: 0,
  analyzedAt: null,
  provider: null,
  concepts: [],
  relationships: [],
};

/** A question that has never been checked against the course's evidence. */
const DEFAULT_SIGNATURE: AssessmentSignature = {
  status: "not-analyzed",
  errorCode: null,
  errorSummary: null,
  consistency: "insufficient-evidence",
  reason: "This question has not been checked against the course evidence yet.",
  nextAction: "Analyse the course, then analyse this question.",
  analyzedAt: null,
  provider: null,
  concepts: [],
};

/** A course whose targeted practice has never been generated. */
const DEFAULT_REVISION: RevisionPlan = {
  status: "not-analyzed",
  errorCode: null,
  errorSummary: null,
  generatedAt: null,
  provider: null,
  nextAction: "Analyse the course to extract the concepts your materials teach, then record some practice.",
  focus: [],
  practiceQuestions: [],
};

/** Maps the stored consistency verdict onto the vocabulary the UI shows. */
function consistencyFromStatus(status: string | null | undefined): ConsistencyStatus {
  if (status === "consistent" || status === "possible-inconsistency") return status;
  return "insufficient-evidence";
}

/**
 * A stable fingerprint of the analysable evidence in a course: the ids and
 * chunk counts of every material that yielded chunks. It changes whenever a
 * material is added or removed or its extraction changes, which is exactly when
 * stored intelligence becomes stale. It contains no course contents.
 */
export function evidenceFingerprint(sources: SourceItem[]): string {
  const parts = sources
    .map((source) => ({ id: source.id, chunks: source.ingestion?.chunkCount ?? 0 }))
    .filter((entry) => entry.chunks > 0)
    .map((entry) => `${entry.id}:${entry.chunks}`)
    .sort();
  return `v1:${parts.join(",")}`;
}

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

  const [
    materials,
    concepts,
    assessments,
    findings,
    analysis,
    courseConcepts,
    assessmentAnalysis,
    questionFindings,
    mappings,
    practice,
    revision,
    practiceQuestions,
  ] = await Promise.all([
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
    // The course-level verdict is the most severe, most recent finding for the
    // course — so one question flagged as inconsistent is never hidden by a
    // later, milder result.
    pool.query<ConsistencyRow>(
      `select distinct on (course_id) course_id, status, description, next_action
         from consistency_finding
        where course_id = any($1::text[])
        order by course_id,
                 case status
                   when 'possible-inconsistency' then 0
                   when 'insufficient-evidence' then 1
                   else 2
                 end,
                 created_at desc`,
      [ids],
    ),
    pool.query<AnalysisRow>(
      `select course_id, status, error_code, error_summary, evidence_fingerprint,
              concept_count, relationship_count, provider_metadata, analyzed_at
         from course_analysis
        where course_id = any($1::text[])`,
      [ids],
    ),
    pool.query<CourseConceptRow>(
      `select id, course_id, name, instructor_term, definition, evidence_status, confidence
         from concept
        where course_id = any($1::text[]) and origin = 'analysis'
        order by ordinal asc, name asc`,
      [ids],
    ),
    pool.query<AssessmentAnalysisRow>(
      `select a.assessment_question_id, a.status, a.error_code, a.error_summary,
              a.evidence_fingerprint, a.tested_concept_count, a.provider_metadata, a.analyzed_at
         from assessment_analysis a
         join assessment_question q on q.id = a.assessment_question_id
        where q.course_id = any($1::text[])`,
      [ids],
    ),
    pool.query<QuestionFindingRow>(
      `select f.assessment_question_id, f.status, f.description, f.next_action
         from consistency_finding f
        where f.course_id = any($1::text[]) and f.assessment_question_id is not null`,
      [ids],
    ),
    pool.query<SourceMappingRow>(
      `select m.assessment_question_id, m.concept_id, m.material_id, m.source_location
         from source_mapping m
         join assessment_question q on q.id = m.assessment_question_id
        where q.course_id = any($1::text[])
        order by m.id asc`,
      [ids],
    ),
    pool.query<PracticeAttemptRow>(
      `select a.id, a.course_id, a.concept_id, c.name as concept_name,
              a.assessment_question_id, q.question_text, a.answer, a.is_correct, a.created_at
         from practice_attempt a
         left join concept c on c.id = a.concept_id
         left join assessment_question q on q.id = a.assessment_question_id
        where a.course_id = any($1::text[])
        order by a.created_at desc, a.id desc`,
      [ids],
    ),
    pool.query<RevisionRow>(
      `select course_id, status, error_code, error_summary, generated_for,
              question_count, provider_metadata, generated_at
         from revision_plan
        where course_id = any($1::text[])`,
      [ids],
    ),
    pool.query<PracticeQuestionRow>(
      `select q.id, q.course_id, q.concept_id, c.name as concept_name,
              q.question_text, q.rationale, m.title as material_title,
              q.source_location, q.created_at
         from practice_question q
         left join concept c on c.id = q.concept_id
         left join learning_material m on m.id = q.source_material_id
        where q.course_id = any($1::text[])
        order by q.created_at asc, q.id asc`,
      [ids],
    ),
  ]);

  const conceptIds = courseConcepts.rows.map((row) => row.id);
  const [evidenceRows, relationshipRows] = await Promise.all([
    pool.query<ConceptEvidenceRow>(
      `select e.id, e.concept_id, e.material_id, m.title as material_title,
              e.source_location, e.excerpt
         from concept_evidence e
         join learning_material m on m.id = e.material_id
        where e.concept_id = any($1::text[])
        order by e.created_at asc`,
      [conceptIds],
    ),
    pool.query<ConceptRelationshipRow>(
      `select r.id, r.course_id, r.from_concept_id, r.to_concept_id,
              cf.name as from_name, ct.name as to_name, r.kind, r.justification
         from concept_relationship r
         join concept cf on cf.id = r.from_concept_id
         join concept ct on ct.id = r.to_concept_id
        where r.course_id = any($1::text[])
        order by r.created_at asc`,
      [ids],
    ),
  ]);

  const sourcesByCourse = new Map<string, SourceItem[]>();
  for (const row of materials.rows) {
    const list = sourcesByCourse.get(row.course_id) ?? [];
    list.push(mapMaterial(row));
    sourcesByCourse.set(row.course_id, list);
  }

  // --- Practice-derived mastery (Phase 8) ------------------------------------
  // A concept's status is derived only from the learner's recorded attempts.
  // A concept with no attempts falls back to its stored (seeded) state; nothing
  // here can invent a status a learner has not practised for.
  const attemptsByCourse = new Map<string, PracticeAttempt[]>();
  const statsByConcept = new Map<string, { correct: boolean }[]>();
  const lastAttemptByConcept = new Map<string, string>();
  for (const row of practice.rows) {
    const list = attemptsByCourse.get(row.course_id) ?? [];
    if (list.length < MAX_RECENT_ATTEMPTS) {
      list.push({
        id: row.id,
        conceptId: row.concept_id,
        conceptName: row.concept_name,
        questionId: row.assessment_question_id,
        question: row.question_text,
        answer: row.answer,
        correct: row.is_correct,
        createdAt: row.created_at.toISOString(),
      });
    }
    attemptsByCourse.set(row.course_id, list);

    if (row.concept_id) {
      const attempts = statsByConcept.get(row.concept_id) ?? [];
      attempts.push({ correct: row.is_correct });
      statsByConcept.set(row.concept_id, attempts);
      // Rows arrive most-recent-first, so the first seen is the latest.
      if (!lastAttemptByConcept.has(row.concept_id)) {
        lastAttemptByConcept.set(row.concept_id, row.created_at.toISOString());
      }
    }
  }

  const conceptsByCourse = new Map<string, ConceptMastery[]>();
  for (const row of concepts.rows) {
    const list = conceptsByCourse.get(row.course_id) ?? [];
    const stats = statsByConcept.get(row.id);
    if (stats && stats.length > 0) {
      const derived = deriveMastery(stats);
      list.push({
        name: row.name,
        status: derived.status,
        score: derived.score,
        attempts: derived.attemptCount,
        correct: derived.correctCount,
        lastAttemptAt: lastAttemptByConcept.get(row.id) ?? null,
      });
    } else {
      list.push({
        name: row.name,
        status: (row.status ?? "Untested") as ConceptStatus,
        score: row.score ?? 0,
      });
    }
    conceptsByCourse.set(row.course_id, list);
  }

  const assessmentsByCourse = new Map<string, Omit<AssessmentItem, "signature">[]>();
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

  // --- Course intelligence -------------------------------------------------
  const analysisByCourse = new Map<string, AnalysisRow>();
  for (const row of analysis.rows) analysisByCourse.set(row.course_id, row);

  const evidenceByConcept = new Map<string, ConceptEvidenceRef[]>();
  for (const row of evidenceRows.rows) {
    const list = evidenceByConcept.get(row.concept_id) ?? [];
    list.push({
      id: row.id,
      materialId: row.material_id,
      materialTitle: row.material_title,
      sourceLocation: row.source_location,
      excerpt: row.excerpt,
    });
    evidenceByConcept.set(row.concept_id, list);
  }

  const courseConceptsByCourse = new Map<string, CourseConcept[]>();
  for (const row of courseConcepts.rows) {
    const list = courseConceptsByCourse.get(row.course_id) ?? [];
    list.push({
      id: row.id,
      name: row.name,
      instructorTerm: row.instructor_term,
      definition: row.definition,
      evidenceStatus: (row.evidence_status as EvidenceStatus | null) ?? null,
      confidence: row.confidence === null ? null : Number(row.confidence),
      evidence: evidenceByConcept.get(row.id) ?? [],
    });
    courseConceptsByCourse.set(row.course_id, list);
  }

  const relationshipsByCourse = new Map<string, CourseRelationship[]>();
  for (const row of relationshipRows.rows) {
    const list = relationshipsByCourse.get(row.course_id) ?? [];
    list.push({
      id: row.id,
      fromConceptId: row.from_concept_id,
      toConceptId: row.to_concept_id,
      fromConcept: row.from_name,
      toConcept: row.to_name,
      kind: row.kind as RelationshipKind,
      justification: row.justification,
    });
    relationshipsByCourse.set(row.course_id, list);
  }

  // --- Assessment signatures (Phase 7) -------------------------------------
  // Every concept is addressed by its own id, so a question's signature is
  // built from real `source_mapping` rows pointing at real analysed concepts.
  const conceptById = new Map<string, CourseConcept>();
  for (const list of courseConceptsByCourse.values()) {
    for (const concept of list) conceptById.set(concept.id, concept);
  }

  const signatureRowByQuestion = new Map<string, AssessmentAnalysisRow>();
  for (const row of assessmentAnalysis.rows) {
    signatureRowByQuestion.set(row.assessment_question_id, row);
  }

  const findingByQuestion = new Map<string, QuestionFindingRow>();
  for (const row of questionFindings.rows) {
    if (row.assessment_question_id) findingByQuestion.set(row.assessment_question_id, row);
  }

  const conceptsByQuestion = new Map<string, CourseConcept[]>();
  for (const row of mappings.rows) {
    if (!row.concept_id) continue;
    const concept = conceptById.get(row.concept_id);
    if (!concept) continue;
    const list = conceptsByQuestion.get(row.assessment_question_id) ?? [];
    if (!list.some((entry) => entry.id === concept.id)) list.push(concept);
    conceptsByQuestion.set(row.assessment_question_id, list);
  }

  // --- Targeted revision (Phase 9) -------------------------------------------
  // The recommendation is derived from mastery and evidence, so no model is
  // needed to build it. Stored generated practice is attached, and turns stale
  // when the learner's mastery moves.
  const revisionRowByCourse = new Map<string, RevisionRow>();
  for (const row of revision.rows) revisionRowByCourse.set(row.course_id, row);

  const questionsByCourse = new Map<string, PracticeQuestion[]>();
  for (const row of practiceQuestions.rows) {
    const list = questionsByCourse.get(row.course_id) ?? [];
    list.push({
      id: row.id,
      conceptId: row.concept_id,
      conceptName: row.concept_name,
      question: row.question_text,
      rationale: row.rationale,
      materialTitle: row.material_title,
      sourceLocation: row.source_location,
      createdAt: row.created_at.toISOString(),
    });
    questionsByCourse.set(row.course_id, list);
  }

  return courseRows.map((row) => {
    const sources = sourcesByCourse.get(row.id) ?? [];
    const courseConcepts = courseConceptsByCourse.get(row.id) ?? [];
    const focus = focusForCourse(courseConcepts, conceptsByCourse.get(row.id) ?? []);
    const analysisRow = analysisByCourse.get(row.id);
    const intelligence = mapIntelligence(row.id, analysisRow, sources, {
      concepts: courseConceptsByCourse.get(row.id) ?? [],
      relationships: relationshipsByCourse.get(row.id) ?? [],
    });
    const fingerprint = evidenceFingerprint(sources);
    return {
      id: row.id,
      name: row.title,
      institution: row.institution,
      lesson: row.lesson,
      summary: row.description,
      concepts: conceptsByCourse.get(row.id) ?? [],
      sources,
      assessments: (assessmentsByCourse.get(row.id) ?? []).map((item) => ({
        ...item,
        signature: mapSignature(
          signatureRowByQuestion.get(item.id),
          findingByQuestion.get(item.id),
          conceptsByQuestion.get(item.id) ?? [],
          fingerprint,
          intelligence.status,
        ),
      })),
      consistency: consistencyByCourse.get(row.id) ?? DEFAULT_CONSISTENCY,
      intelligence,
      attempts: attemptsByCourse.get(row.id) ?? [],
      revision: mapRevision(
        revisionRowByCourse.get(row.id),
        focus,
        questionsByCourse.get(row.id) ?? [],
        courseConcepts.length > 0,
      ),
    };
  });
}

/** The concepts worth revising, weakest first, matched to the learner's mastery. */
function focusForCourse(concepts: CourseConcept[], mastery: ConceptMastery[]): RevisionFocus[] {
  const byName = new Map<string, ConceptMastery>();
  for (const entry of mastery) byName.set(entry.name.trim().toLowerCase(), entry);
  const inputs: RevisionConceptInput[] = concepts.map((concept) => ({
    conceptId: concept.id,
    name: concept.name,
    evidence: concept.evidence,
    mastery: byName.get(concept.name.trim().toLowerCase()),
  }));
  return buildRevisionFocus(inputs);
}

/**
 * Builds the revision view for one course, computing staleness live: when the
 * learner practises and mastery moves, the fingerprint changes and a stored plan
 * becomes `needs-reanalysis` without any model call.
 */
function mapRevision(
  row: RevisionRow | undefined,
  focus: RevisionFocus[],
  questions: PracticeQuestion[],
  hasConcepts: boolean,
): RevisionPlan {
  const nextAction = buildRevisionNextAction(focus, hasConcepts);
  if (!row) return { ...DEFAULT_REVISION, nextAction, focus };

  let status = row.status as AnalysisStatus;
  if (
    (status === "ready" || status === "insufficient-evidence") &&
    row.generated_for !== revisionFingerprint(focus)
  ) {
    status = "needs-reanalysis";
  }

  return {
    status,
    errorCode: row.error_code,
    errorSummary: row.error_summary,
    generatedAt: row.generated_at ? row.generated_at.toISOString() : null,
    provider: row.provider_metadata ?? null,
    nextAction,
    focus,
    practiceQuestions: questions,
  };
}

/**
 * Builds one question's signature, computing staleness live.
 *
 * A signature is stale when the course evidence changed since it was produced,
 * or when the course's own concepts are themselves stale — the question was
 * judged against those concepts, so it cannot be fresher than them. Neither
 * case costs a model call.
 */
function mapSignature(
  row: AssessmentAnalysisRow | undefined,
  finding: QuestionFindingRow | undefined,
  concepts: CourseConcept[],
  currentFingerprint: string,
  courseStatus: AnalysisStatus,
): AssessmentSignature {
  if (!row) return { ...DEFAULT_SIGNATURE, concepts };

  let status = row.status as AnalysisStatus;
  if (
    (status === "ready" || status === "insufficient-evidence") &&
    (row.evidence_fingerprint !== currentFingerprint || courseStatus === "needs-reanalysis")
  ) {
    status = "needs-reanalysis";
  }

  return {
    status,
    errorCode: row.error_code,
    errorSummary: row.error_summary,
    consistency: consistencyFromStatus(finding?.status),
    reason: finding?.description ?? DEFAULT_SIGNATURE.reason,
    nextAction: finding?.next_action ?? DEFAULT_SIGNATURE.nextAction,
    analyzedAt: row.analyzed_at ? row.analyzed_at.toISOString() : null,
    provider: row.provider_metadata ?? null,
    concepts,
  };
}

/**
 * Builds the intelligence view for one course, computing staleness live: if the
 * stored analysis is complete but the evidence fingerprint has changed, the
 * status becomes `needs-reanalysis` without any model call.
 */
function mapIntelligence(
  courseId: string,
  row: AnalysisRow | undefined,
  sources: SourceItem[],
  loaded: { concepts: CourseConcept[]; relationships: CourseRelationship[] },
): CourseIntelligence {
  if (!row) return DEFAULT_INTELLIGENCE;

  let status = row.status as AnalysisStatus;
  if (
    (status === "ready" || status === "insufficient-evidence") &&
    row.evidence_fingerprint !== evidenceFingerprint(sources)
  ) {
    status = "needs-reanalysis";
  }

  return {
    status,
    errorCode: row.error_code,
    errorSummary: row.error_summary,
    conceptCount: row.concept_count,
    relationshipCount: row.relationship_count,
    analyzedAt: row.analyzed_at ? row.analyzed_at.toISOString() : null,
    provider: row.provider_metadata ?? null,
    concepts: loaded.concepts,
    relationships: loaded.relationships,
  };
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

/**
 * Renames / re-labels a course. Only the presenter fields change; evidence,
 * concepts and mastery are untouched. Returns the refreshed course, or
 * `undefined` when the learner does not own it.
 */
export async function updateCourse(
  userId: string,
  courseId: string,
  input: { name?: string; institution?: string; lesson?: string },
): Promise<Course | undefined> {
  const fields: string[] = [];
  const values: unknown[] = [userId, courseId];
  if (input.name !== undefined && input.name.trim()) {
    values.push(input.name.trim());
    fields.push(`title = $${values.length}`);
  }
  if (input.institution !== undefined) {
    values.push(input.institution.trim());
    fields.push(`institution = $${values.length}`);
  }
  if (input.lesson !== undefined) {
    values.push(input.lesson.trim());
    fields.push(`lesson = $${values.length}`);
  }
  if (fields.length === 0) return getCourse(userId, courseId);

  const result = await pool.query(
    `update course set ${fields.join(", ")} where id = $2 and user_id = $1`,
    values,
  );
  if (result.rowCount === 0) return undefined;
  return getCourse(userId, courseId);
}

/**
 * Deletes a course and everything that cascades from it (materials, chunks,
 * concepts, evidence, assessments, findings, practice, plans). Returns the
 * stored object keys that the caller must also remove from object storage, or
 * `undefined` when the learner does not own the course.
 */
export async function deleteCourse(
  userId: string,
  courseId: string,
): Promise<{ storageReferences: string[] } | undefined> {
  const owned = await pool.query<{ storage_reference: string | null }>(
    `select m.storage_reference
       from learning_material m
       join course c on c.id = m.course_id
      where c.id = $1 and c.user_id = $2 and m.storage_reference is not null`,
    [courseId, userId],
  );
  const result = await pool.query("delete from course where id = $1 and user_id = $2", [
    courseId,
    userId,
  ]);
  if (result.rowCount === 0) return undefined;
  return {
    storageReferences: owned.rows
      .map((row) => row.storage_reference)
      .filter((key): key is string => Boolean(key)),
  };
}

/**
 * Edits an assessment question. Because the stored signature judged the old
 * wording, editing the question invalidates its analysis: the per-question
 * findings, source mappings and signature are removed so it must be checked
 * again against the evidence. Returns the refreshed course, or `undefined`.
 */
export async function updateAssessment(
  userId: string,
  courseId: string,
  assessmentId: string,
  input: { question?: string; lesson?: string },
): Promise<Course | undefined> {
  const course = await getCourse(userId, courseId);
  if (!course) return undefined;
  const existing = course.assessments.find((item) => item.id === assessmentId);
  if (!existing) return undefined;

  const question = input.question?.trim() || existing.question;
  const lesson = input.lesson !== undefined ? input.lesson.trim() : existing.lesson;

  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(
      "update assessment_question set question_text = $3, lesson = $4 where id = $1 and course_id = $2",
      [assessmentId, courseId, question, lesson],
    );
    // The old verdict was about the old wording; discard it rather than let it
    // imply a judgement the learner never asked for.
    await client.query("delete from source_mapping where assessment_question_id = $1", [assessmentId]);
    await client.query("delete from consistency_finding where assessment_question_id = $1", [assessmentId]);
    await client.query("delete from assessment_analysis where assessment_question_id = $1", [assessmentId]);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }

  return getCourse(userId, courseId);
}

/** Deletes one assessment question and its analysis. Returns the refreshed course. */
export async function deleteAssessment(
  userId: string,
  courseId: string,
  assessmentId: string,
): Promise<Course | undefined> {
  const owns = await pool.query("select 1 from course where id = $1 and user_id = $2", [
    courseId,
    userId,
  ]);
  if (owns.rowCount === 0) return undefined;
  await pool.query("delete from assessment_question where id = $1 and course_id = $2", [
    assessmentId,
    courseId,
  ]);
  return getCourse(userId, courseId);
}

/** Material count and total stored bytes for a course, for quota checks. */
export async function getCourseMaterialQuota(
  userId: string,
  courseId: string,
): Promise<{ count: number; bytes: number } | undefined> {
  const { rows } = await pool.query<{ count: string; bytes: string | null }>(
    `select count(*)::text as count, coalesce(sum(m.size_bytes), 0)::text as bytes
       from learning_material m
       join course c on c.id = m.course_id
      where c.id = $1 and c.user_id = $2`,
    [courseId, userId],
  );
  const row = rows[0];
  if (!row) return undefined;
  return { count: Number(row.count), bytes: Number(row.bytes ?? 0) };
}

/**
 * Deletes a learner's account and everything it owns. Because every course,
 * material, concept, attempt and plan references the user (or a course) with
 * `on delete cascade`, a single delete removes all of it. Returns the email
 * (for a confirmation message) and the stored object keys the caller must also
 * remove, or `undefined` when the account does not exist.
 */
export async function deleteAccount(
  userId: string,
): Promise<{ email: string | null; storageReferences: string[] } | undefined> {
  const owned = await pool.query<{ storage_reference: string | null }>(
    `select m.storage_reference
       from learning_material m
       join course c on c.id = m.course_id
      where c.user_id = $1 and m.storage_reference is not null`,
    [userId],
  );
  const account = await pool.query<{ email: string }>(
    'select email from "user" where id = $1',
    [userId],
  );
  const result = await pool.query('delete from "user" where id = $1', [userId]);
  if (result.rowCount === 0) return undefined;
  return {
    email: account.rows[0]?.email ?? null,
    storageReferences: owned.rows
      .map((row) => row.storage_reference)
      .filter((key): key is string => Boolean(key)),
  };
}

/** What a practice request asked to record. */
export interface PracticeInput {
  /** An assessment question to practise; its tested concepts get the attempt. */
  assessmentId?: string;
  /** A single concept to self-assess, when no question is involved. */
  conceptId?: string;
  answer?: string;
  correct: boolean;
}

export type PracticeOutcome =
  | { ok: true; course: Course }
  | {
      ok: false;
      reason: "not-found" | "question-not-found" | "question-not-checked" | "unknown-concept";
    };

/**
 * Records one real practice attempt and recomputes the mastery it affects.
 *
 * A question attempt is attributed to every concept the question was checked
 * against (its real source mappings), one row per concept, so the trail
 * survives a later re-analysis. Mastery is then re-derived from the learner's
 * full attempt history and written to `mastery_state`; nothing here can set a
 * status that the attempts do not support.
 */
export async function recordPractice(
  userId: string,
  courseId: string,
  input: PracticeInput,
): Promise<PracticeOutcome> {
  const course = await getCourse(userId, courseId);
  if (!course) return { ok: false, reason: "not-found" };

  const targets: { conceptId: string; questionId: string | null }[] = [];
  if (input.assessmentId) {
    const assessment = course.assessments.find((item) => item.id === input.assessmentId);
    if (!assessment) return { ok: false, reason: "question-not-found" };
    const tested = assessment.signature.concepts;
    if (tested.length === 0) return { ok: false, reason: "question-not-checked" };
    for (const concept of tested) {
      targets.push({ conceptId: concept.id, questionId: assessment.id });
    }
  } else if (input.conceptId) {
    const concept = course.intelligence.concepts.find((item) => item.id === input.conceptId);
    if (!concept) return { ok: false, reason: "unknown-concept" };
    targets.push({ conceptId: concept.id, questionId: null });
  } else {
    return { ok: false, reason: "unknown-concept" };
  }

  const conceptIds = [...new Set(targets.map((target) => target.conceptId))];
  const client = await pool.connect();
  try {
    await client.query("begin");
    for (const target of targets) {
      await client.query(
        `insert into practice_attempt
           (id, user_id, course_id, concept_id, assessment_question_id, answer, is_correct)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [
          newId("attempt"),
          userId,
          courseId,
          target.conceptId,
          target.questionId,
          input.answer ?? "",
          input.correct,
        ],
      );
    }

    for (const conceptId of conceptIds) {
      const { rows } = await client.query<{ is_correct: boolean; created_at: Date }>(
        `select is_correct, created_at
           from practice_attempt
          where user_id = $1 and concept_id = $2
          order by created_at asc, id asc`,
        [userId, conceptId],
      );
      const derived = deriveMastery(rows.map((row) => ({ correct: row.is_correct })));
      const lastAt = rows.length > 0 ? rows[rows.length - 1].created_at : null;
      await client.query(
        `insert into mastery_state
           (id, user_id, concept_id, status, score, attempt_count, correct_count, last_attempt_at, updated_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, now())
         on conflict (user_id, concept_id) do update set
           status = excluded.status,
           score = excluded.score,
           attempt_count = excluded.attempt_count,
           correct_count = excluded.correct_count,
           last_attempt_at = excluded.last_attempt_at,
           updated_at = now()`,
        [
          newId("mastery"),
          userId,
          conceptId,
          derived.status,
          derived.score,
          derived.attemptCount,
          derived.correctCount,
          lastAt,
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

  const refreshed = await getCourse(userId, courseId);
  return { ok: true, course: refreshed ?? course };
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

// ---------------------------------------------------------------------------
// Course intelligence (Phase 6)
// ---------------------------------------------------------------------------

/**
 * Every stored evidence chunk for one of the learner's courses, in material and
 * ordinal order. Scoped by the course's owner, so this can never return another
 * learner's evidence. The caller bounds how much is sent to the model.
 */
export async function getCourseEvidence(
  userId: string,
  courseId: string,
): Promise<EvidenceChunk[] | undefined> {
  if (!(await ownsCourse(userId, courseId))) return undefined;
  const { rows } = await pool.query<{
    id: string;
    material_id: string;
    material_title: string;
    source_location: string;
    content: string;
  }>(
    `select ch.id, ch.material_id, m.title as material_title,
            ch.source_location, ch.content
       from material_chunk ch
       join learning_material m on m.id = ch.material_id
       join course c on c.id = m.course_id
      where c.id = $1 and c.user_id = $2
      order by m.uploaded_at asc, ch.ordinal asc`,
    [courseId, userId],
  );
  return rows.map((row) => ({
    id: row.id,
    materialId: row.material_id,
    materialTitle: row.material_title,
    sourceLocation: row.source_location,
    content: row.content,
  }));
}

/** The stored analysis state for one of the learner's courses. */
export async function getStoredAnalysis(
  userId: string,
  courseId: string,
): Promise<{ status: AnalysisStatus; fingerprint: string | null } | undefined> {
  const { rows } = await pool.query<{ status: string; evidence_fingerprint: string | null }>(
    `select a.status, a.evidence_fingerprint
       from course_analysis a
       join course c on c.id = a.course_id
      where a.course_id = $1 and c.user_id = $2`,
    [courseId, userId],
  );
  const row = rows[0];
  if (!row) return undefined;
  return { status: row.status as AnalysisStatus, fingerprint: row.evidence_fingerprint };
}

/** The stored revision-generation state for one of the learner's courses. */
export async function getStoredRevisionPlan(
  userId: string,
  courseId: string,
): Promise<{ status: AnalysisStatus; generatedFor: string | null } | undefined> {
  const { rows } = await pool.query<{ status: string; generated_for: string | null }>(
    `select r.status, r.generated_for
       from revision_plan r
       join course c on c.id = r.course_id
      where r.course_id = $1 and c.user_id = $2`,
    [courseId, userId],
  );
  const row = rows[0];
  if (!row) return undefined;
  return { status: row.status as AnalysisStatus, generatedFor: row.generated_for };
}

/**
 * Marks targeted-practice generation as in progress and records the weak-area
 * fingerprint it is running for. Also acts as a light lock against a double click.
 */
export async function markRevisionAnalyzing(courseId: string, fingerprint: string): Promise<void> {
  await pool.query(
    `insert into revision_plan (id, course_id, status, generated_for, updated_at)
     values ($1, $2, 'analyzing', $3, now())
     on conflict (course_id) do update
        set status = 'analyzing', generated_for = $3,
            error_code = null, error_summary = null, updated_at = now()`,
    [newId("revision"), courseId, fingerprint],
  );
}

/** Records a safe failure summary for a revision generation; never raw output. */
export async function failRevisionPlan(
  courseId: string,
  code: string,
  summary: string,
): Promise<void> {
  await pool.query(
    `update revision_plan
        set status = 'failed', error_code = $2, error_summary = $3, updated_at = now()
      where course_id = $1`,
    [courseId, code, summary],
  );
}

/**
 * The evidence chunks that teach the given concepts, loaded scoped to this
 * learner and this course. This is exactly the evidence a generation may cite,
 * so a question can only ever be grounded in the weak areas' real material.
 */
export async function getConceptEvidenceChunks(
  userId: string,
  courseId: string,
  conceptIds: string[],
): Promise<EvidenceChunk[]> {
  if (conceptIds.length === 0) return [];
  const { rows } = await pool.query<{
    id: string;
    material_id: string;
    material_title: string;
    source_location: string;
    content: string;
  }>(
    `select ch.id, ch.material_id, m.title as material_title, ch.source_location, ch.content
       from concept_evidence e
       join material_chunk ch on ch.id = e.chunk_id
       join learning_material m on m.id = ch.material_id
       join course c on c.id = m.course_id
      where c.id = $1 and c.user_id = $2 and e.concept_id = any($3::text[])
      order by m.uploaded_at asc, ch.ordinal asc`,
    [courseId, userId, conceptIds],
  );

  const seen = new Set<string>();
  const chunks: EvidenceChunk[] = [];
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    chunks.push({
      id: row.id,
      materialId: row.material_id,
      materialTitle: row.material_title,
      sourceLocation: row.source_location,
      content: row.content,
    });
  }
  return chunks;
}

/**
 * Replaces a course's generated practice with a validated result and records the
 * weak-area fingerprint it was written for. Replacing rather than appending keeps
 * the plan honest: the questions always belong to the current focus.
 */
export async function saveTargetedPractice(
  courseId: string,
  fingerprint: string,
  result: AnalyzedRevision,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const chunkIds = [...new Set(result.questions.map((question) => question.chunkId))];
    const chunkRows =
      chunkIds.length > 0
        ? (
            await client.query<{ id: string; material_id: string; source_location: string }>(
              `select id, material_id, source_location
                 from material_chunk
                where id = any($1::text[])`,
              [chunkIds],
            )
          ).rows
        : [];
    const chunkById = new Map(chunkRows.map((row) => [row.id, row]));

    await client.query("delete from practice_question where course_id = $1", [courseId]);
    for (const question of result.questions) {
      const chunk = chunkById.get(question.chunkId);
      await client.query(
        `insert into practice_question
           (id, course_id, concept_id, question_text, rationale, source_material_id, source_location)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [
          newId("practice"),
          courseId,
          question.conceptId,
          question.question,
          question.rationale,
          chunk?.material_id ?? null,
          chunk?.source_location ?? null,
        ],
      );
    }

    await client.query(
      `insert into revision_plan
         (id, course_id, status, generated_for, question_count, provider_metadata, generated_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, now(), now())
       on conflict (course_id) do update set
         status = $3, error_code = null, error_summary = null, generated_for = $4,
         question_count = $5, provider_metadata = $6, generated_at = now(), updated_at = now()`,
      [
        newId("revision"),
        courseId,
        result.status,
        fingerprint,
        result.questions.length,
        {
          model: result.usage.model,
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
        },
      ],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Marks an analysis as in progress and records the evidence it is running on.
 * Setting `analyzing` also acts as a light lock so a double-click cannot start
 * two overlapping analyses of the same course.
 */
export async function markCourseAnalysisAnalyzing(
  courseId: string,
  fingerprint: string,
): Promise<void> {
  await pool.query(
    `insert into course_analysis (id, course_id, status, evidence_fingerprint, updated_at)
     values ($1, $2, 'analyzing', $3, now())
     on conflict (course_id) do update
        set status = 'analyzing', evidence_fingerprint = $3,
            error_code = null, error_summary = null, updated_at = now()`,
    [newId("analysis"), courseId, fingerprint],
  );
}

/** Records a safe analysis failure; never stores raw provider output. */
export async function failCourseAnalysis(
  courseId: string,
  errorCode: string,
  errorSummary: string,
): Promise<void> {
  await pool.query(
    `insert into course_analysis (id, course_id, status, error_code, error_summary, updated_at)
     values ($1, $2, 'failed', $3, $4, now())
     on conflict (course_id) do update
        set status = 'failed', error_code = $3, error_summary = $4, updated_at = now()`,
    [newId("analysis"), courseId, errorCode, errorSummary],
  );
}

export type IntelligenceToSave = {
  status: "ready" | "insufficient-evidence";
  concepts: AnalyzedConcept[];
  relationships: AnalyzedRelationship[];
  usage: AiUsage;
};

function normaliseConceptName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Replaces a course's intelligence with a freshly validated result, in one
 * transaction.
 *
 * The course's existing concepts — including the demo concepts seeded for a new
 * workspace — are removed first, so after a real analysis a learner only ever
 * sees concepts their own materials taught. Every evidence row is resolved
 * against the exact evidence that was sent to the model: a cited chunk that did
 * not exist, or belonged to another course, simply has no stored row to attach
 * to and is dropped rather than persisted.
 */
export async function saveCourseIntelligence(
  courseId: string,
  fingerprint: string,
  result: IntelligenceToSave,
  evidence: EvidenceChunk[],
): Promise<void> {
  const chunkById = new Map(evidence.map((chunk) => [chunk.id, chunk]));
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("delete from concept_relationship where course_id = $1", [courseId]);
    await client.query("delete from concept where course_id = $1", [courseId]);

    const idByName = new Map<string, string>();
    let ordinal = 0;
    for (const concept of result.concepts) {
      const conceptId = newId("concept");
      idByName.set(normaliseConceptName(concept.name), conceptId);
      await client.query(
        `insert into concept
           (id, course_id, name, instructor_term, definition, source_reference,
            ordinal, origin, evidence_status, confidence)
         values ($1, $2, $3, $4, $5, $6, $7, 'analysis', $8, $9)`,
        [
          conceptId,
          courseId,
          concept.name,
          concept.instructorTerm,
          concept.definition,
          concept.evidence[0]?.rationale ?? null,
          ordinal,
          concept.evidenceStatus,
          concept.confidence,
        ],
      );
      ordinal += 1;

      for (const reference of concept.evidence) {
        const chunk = chunkById.get(reference.chunkId);
        if (!chunk) continue; // Cannot happen after validation; defensive only.
        await client.query(
          `insert into concept_evidence
             (id, concept_id, material_id, chunk_id, source_location, excerpt)
           values ($1, $2, $3, $4, $5, $6)
           on conflict (concept_id, chunk_id) do nothing`,
          [
            newId("evidence"),
            conceptId,
            chunk.materialId,
            chunk.id,
            chunk.sourceLocation,
            chunk.content,
          ],
        );
      }
    }

    for (const relationship of result.relationships) {
      const fromId = idByName.get(relationship.fromKey);
      const toId = idByName.get(relationship.toKey);
      if (!fromId || !toId || fromId === toId) continue;
      await client.query(
        `insert into concept_relationship
           (id, course_id, from_concept_id, to_concept_id, kind, justification)
         values ($1, $2, $3, $4, $5, $6)
         on conflict (course_id, from_concept_id, to_concept_id, kind) do nothing`,
        [newId("relationship"), courseId, fromId, toId, relationship.kind, relationship.justification],
      );
    }

    await client.query(
      `insert into course_analysis
         (id, course_id, status, error_code, error_summary, evidence_fingerprint,
          concept_count, relationship_count, provider_metadata, analyzed_at, updated_at)
       values ($1, $2, $3, null, null, $4, $5, $6, $7::jsonb, now(), now())
       on conflict (course_id) do update
          set status = $3, error_code = null, error_summary = null,
              evidence_fingerprint = $4, concept_count = $5, relationship_count = $6,
              provider_metadata = $7::jsonb, analyzed_at = now(), updated_at = now()`,
      [
        newId("analysis"),
        courseId,
        result.status,
        fingerprint,
        result.concepts.length,
        result.relationships.length,
        JSON.stringify(result.usage),
      ],
    );

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Assessment intelligence (Phase 7)
// ---------------------------------------------------------------------------

/** Maps the model's verdict vocabulary onto the stored consistency vocabulary. */
const CONSISTENCY_TO_STORED: Record<string, ConsistencyStatus> = {
  CONSISTENT: "consistent",
  POSSIBLE_INCONSISTENCY: "possible-inconsistency",
  INSUFFICIENT_EVIDENCE: "insufficient-evidence",
};

export type AssessmentToSave = {
  status: "ready" | "insufficient-evidence";
  consistency: "CONSISTENT" | "POSSIBLE_INCONSISTENCY" | "INSUFFICIENT_EVIDENCE";
  reason: string;
  nextAction: string;
  /** The ids of the analysed concepts the question was found to test. */
  testedConceptIds: string[];
  usage: AiUsage;
};

/** Marks a question's signature as in progress. Mirrors course analysis exactly. */
export async function markAssessmentAnalysisAnalyzing(
  questionId: string,
  fingerprint: string,
): Promise<void> {
  await pool.query(
    `insert into assessment_analysis
       (id, assessment_question_id, status, evidence_fingerprint, updated_at)
     values ($1, $2, 'analyzing', $3, now())
     on conflict (assessment_question_id) do update
        set status = 'analyzing', evidence_fingerprint = $3,
            error_code = null, error_summary = null, updated_at = now()`,
    [newId("qanalysis"), questionId, fingerprint],
  );
}

/** Records a safe assessment failure; never stores raw provider output. */
export async function failAssessmentAnalysis(
  questionId: string,
  errorCode: string,
  errorSummary: string,
): Promise<void> {
  await pool.query(
    `insert into assessment_analysis
       (id, assessment_question_id, status, error_code, error_summary, updated_at)
     values ($1, $2, 'failed', $3, $4, now())
     on conflict (assessment_question_id) do update
        set status = 'failed', error_code = $3, error_summary = $4, updated_at = now()`,
    [newId("qanalysis"), questionId, errorCode, errorSummary],
  );
}

/**
 * Replaces one question's signature in a single transaction: its source
 * mappings, its consistency finding, and its analysis state.
 *
 * Only concepts the course actually established can be mapped, and only real
 * evidence rows become source locations — the model names ids, and Edvance
 * looks up what those ids actually point at. A concept that is not in the
 * course has no stored row to attach to, so nothing invented is persisted.
 *
 * Writing a real signature also removes the seeded course-level finding, so the
 * demo narrative is never shown alongside genuine analysis.
 */
export async function saveAssessmentIntelligence(
  courseId: string,
  questionId: string,
  fingerprint: string,
  result: AssessmentToSave,
  concepts: CourseConcept[],
): Promise<void> {
  const consistency = CONSISTENCY_TO_STORED[result.consistency] ?? "insufficient-evidence";
  const conceptById = new Map(concepts.map((concept) => [concept.id, concept]));
  const tested = result.testedConceptIds
    .map((id) => conceptById.get(id))
    .filter((concept): concept is CourseConcept => Boolean(concept));

  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(
      `delete from consistency_finding where course_id = $1 and assessment_question_id is null`,
      [courseId],
    );
    await client.query(`delete from source_mapping where assessment_question_id = $1`, [questionId]);
    await client.query(
      `delete from consistency_finding where assessment_question_id = $1`,
      [questionId],
    );

    for (const concept of tested) {
      const trail: (ConceptEvidenceRef | null)[] =
        concept.evidence.length > 0 ? concept.evidence : [null];
      for (const evidence of trail) {
        await client.query(
          `insert into source_mapping
             (id, assessment_question_id, concept_id, material_id, source_location, confidence)
           values ($1, $2, $3, $4, $5, $6)
           on conflict do nothing`,
          [
            newId("mapping"),
            questionId,
            concept.id,
            evidence?.materialId ?? null,
            evidence?.sourceLocation ?? null,
            concept.confidence,
          ],
        );
      }
    }

    await client.query(
      `insert into consistency_finding
         (id, course_id, assessment_question_id, status, description, next_action)
       values ($1, $2, $3, $4, $5, $6)`,
      [newId("finding"), courseId, questionId, consistency, result.reason, result.nextAction],
    );

    await client.query(
      `insert into assessment_analysis
         (id, assessment_question_id, status, error_code, error_summary, evidence_fingerprint,
          tested_concept_count, provider_metadata, analyzed_at, updated_at)
       values ($1, $2, $3, null, null, $4, $5, $6::jsonb, now(), now())
       on conflict (assessment_question_id) do update
          set status = $3, error_code = null, error_summary = null,
              evidence_fingerprint = $4, tested_concept_count = $5,
              provider_metadata = $6::jsonb, analyzed_at = now(), updated_at = now()`,
      [
        newId("qanalysis"),
        questionId,
        result.status,
        fingerprint,
        tested.length,
        JSON.stringify(result.usage),
      ],
    );

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
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
