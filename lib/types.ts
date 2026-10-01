export type ConceptStatus = "Mastered" | "Developing" | "Weak";

export type SourceType = "Lecture" | "Slide" | "Transcript" | "Notes" | "Outline" | "PDF";

export type ConsistencyStatus = "consistent" | "possible-inconsistency" | "insufficient-evidence";

export interface SourceItem {
  id: string;
  type: SourceType;
  title: string;
  location: string;
  /** The R2 object key for uploaded materials; absent for seeded/cited sources. */
  storageReference?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
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