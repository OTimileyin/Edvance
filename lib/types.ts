export type ConceptStatus = "Mastered" | "Developing" | "Weak";

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
}