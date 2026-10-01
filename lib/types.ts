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
  | "not-analyzed"
  | "analyzing"
  | "ready"
  | "failed"
  | "insufficient-evidence"
  | "needs-reanalysis";

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

export interface AssessmentItem {
  id: string;
  lesson: string;
  question: string;
}

export interface ConceptMastery {
  name: string;
  status: ConceptStatus;
  score: number;
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
}