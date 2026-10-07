export type ConceptStatus = "Mastered" | "Developing" | "Weak" | "Untested";

/** How well the course's own evidence establishes a concept. */
export type EvidenceStatus = "SUPPORTED" | "PARTIALLY_SUPPORTED" | "INSUFFICIENT_EVIDENCE";

/** The small, justified relationship vocabulary concepts may use. */
export type RelationshipKind = "prerequisite" | "part_of" | "related_to" | "contrasts_with";

/**
 * Where a course's intelligence stands. `needs-reanalysis` means materials
 * changed after the last analysis; `insufficient-evidence` is a valid outcome,
 * not a failure.
 */
export type AnalysisStatus =
  "not-analyzed" | "analyzing" | "ready" | "failed" | "insufficient-evidence" | "needs-reanalysis";

/** One piece of real evidence behind a concept: a chunk of a real material. */
export interface ConceptEvidenceRef {
  id: string;
  materialId: string;
  materialTitle: string;
  /** Human-readable location, e.g. "Page 7" or "00:04:12–00:04:38". */
  sourceLocation: string;
  excerpt: string | null;
}

/** A concept the course's own evidence teaches, with its evidence trail. */
export interface CourseConcept {
  id: string;
  name: string;
  /** The exact term the course uses, preserved verbatim. */
  instructorTerm: string | null;
  definition: string | null;
  evidenceStatus: EvidenceStatus | null;
  confidence: number | null;
  evidence: ConceptEvidenceRef[];
}

/** A justified relationship between two of a course's concepts. */
export interface CourseRelationship {
  id: string;
  fromConceptId: string;
  toConceptId: string;
  fromConcept: string;
  toConcept: string;
  kind: RelationshipKind;
  justification: string;
}

/** The complete intelligence state shown on a course's Intelligence page. */
export interface CourseIntelligence {
  status: AnalysisStatus;
  errorCode: string | null;
  errorSummary: string | null;
  conceptCount: number;
  relationshipCount: number;
  analyzedAt: string | null;
  /** Safe provider metadata (model and token counts); never prompt contents. */
  provider: { model?: string; inputTokens?: number; outputTokens?: number } | null;
  concepts: CourseConcept[];
  relationships: CourseRelationship[];
}

export type SourceType = "Lecture" | "Slide" | "Transcript" | "Notes" | "Outline" | "PDF";

export type ConsistencyStatus = "consistent" | "possible-inconsistency" | "insufficient-evidence";

export type IngestionStatus = "pending" | "processing" | "completed" | "failed";

/** Derived, factual metadata about a completed extraction (never fabricated). */
export interface IngestionMetadata {
  /** What `count` counts: "page", "slide", "cue", "section" or "line". */
  unit?: string;
  /** The number of those units actually extracted. */
  count?: number;
  /** How many evidence chunks were stored. */
  chunks?: number;
}

/** The latest text-extraction attempt for an uploaded material. */
export interface MaterialIngestion {
  status: IngestionStatus;
  errorCode?: string | null;
  /** A user-safe failure summary; never a raw provider error. */
  errorSummary?: string | null;
  metadata?: IngestionMetadata | null;
  /** Number of stored evidence chunks (0 until ingestion completes). */
  chunkCount?: number;
}

export interface SourceItem {
  id: string;
  type: SourceType;
  title: string;
  location: string;
  /** The object key for uploaded materials; absent for seeded/demo sources. */
  storageReference?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  /** The latest ingestion attempt; null/absent for seeded demo sources. */
  ingestion?: MaterialIngestion | null;
}

/**
 * What a course's own evidence says about one assessment question: which
 * concepts it actually tests, and whether the question agrees with the evidence.
 * `status` uses the same honest vocabulary as course analysis; `consistency` is
 * the assessment-specific verdict.
 */
export interface AssessmentSignature {
  status: AnalysisStatus;
  errorCode: string | null;
  errorSummary: string | null;
  consistency: ConsistencyStatus;
  /** Why Edvance reached that verdict, grounded in the evidence. */
  reason: string;
  /** One concrete thing to do about it (review the evidence, attempt it, etc.). */
  nextAction: string;
  analyzedAt: string | null;
  /** Safe provider metadata (model and token counts); never prompt contents. */
  provider: { model?: string; inputTokens?: number; outputTokens?: number } | null;
  /** The concepts this question tests, each with its own evidence trail. */
  concepts: CourseConcept[];
}

export interface AssessmentItem {
  id: string;
  lesson: string;
  question: string;
  signature: AssessmentSignature;
}

export interface ConceptMastery {
  name: string;
  status: ConceptStatus;
  score: number;
  /** Real practice attempts behind this status; absent/0 for seeded demo rows. */
  attempts?: number;
  correct?: number;
  /** When the learner last practised this concept, if ever. */
  lastAttemptAt?: string | null;
}

/** Why a concept is worth revising right now, weakest evidence of mastery first. */
export type RevisionPriority = "weak" | "developing" | "untested";

/** One concept the learner should revise next, with the evidence that teaches it. */
export interface RevisionFocus {
  conceptId: string;
  name: string;
  status: ConceptStatus;
  priority: RevisionPriority;
  /** Why this is the next thing to revise, in plain words. */
  reason: string;
  /** Real recorded attempts behind the status. */
  attempts: number;
  /** Where the course's own evidence teaches this concept. */
  evidence: ConceptEvidenceRef[];
}

/** Model-generated practice for a weak area, grounded in real evidence. */
export interface PracticeQuestion {
  id: string;
  conceptId: string | null;
  conceptName: string | null;
  question: string;
  rationale: string;
  materialTitle: string | null;
  sourceLocation: string | null;
  createdAt: string;
}

/**
 * The revision state for a course: a deterministic recommendation plus the
 * targeted practice generated for it. The recommendation is derived from
 * mastery and evidence; only the practice questions need a model.
 */
export interface RevisionPlan {
  status: AnalysisStatus;
  errorCode: string | null;
  errorSummary: string | null;
  generatedAt: string | null;
  /** Safe provider metadata (model and token counts); never prompt contents. */
  provider: { model?: string; inputTokens?: number; outputTokens?: number } | null;
  /** The smallest useful next action, derived from mastery alone. */
  nextAction: string;
  /** Weak/untested concepts, weakest first; empty when nothing needs revising. */
  focus: RevisionFocus[];
  /** Generated practice for the focus areas; empty until generated. */
  practiceQuestions: PracticeQuestion[];
}

/**
 * One thing a learner actually did: answered an assessment question, or
 * self-assessed a single concept, and judged it correct or not. Mastery is
 * derived from these rows — never stored as an assertion.
 */
export interface PracticeAttempt {
  id: string;
  conceptId: string | null;
  conceptName: string | null;
  questionId: string | null;
  question: string | null;
  answer: string;
  correct: boolean;
  createdAt: string;
}

export interface CourseConsistency {
  status: ConsistencyStatus;
  reason: string;
  nextAction: string;
}

export interface Course {
  id: string;
  name: string;
  institution: string;
  lesson: string;
  summary: string;
  concepts: ConceptMastery[];
  sources: SourceItem[];
  assessments: AssessmentItem[];
  consistency: CourseConsistency;
  intelligence: CourseIntelligence;
  /** The learner's recorded practice, most recent first (bounded). */
  attempts: PracticeAttempt[];
  revision: RevisionPlan;
}
