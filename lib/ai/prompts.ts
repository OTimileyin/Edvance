import type { EvidenceChunk } from "./types";

/**
 * Prompt construction for course intelligence.
 *
 * The prompt is deliberately strict: the model is told it may only use the
 * supplied evidence, that it must cite the exact chunk ids it was given, that
 * it must preserve the course's own terminology, and that saying
 * INSUFFICIENT_EVIDENCE is a correct answer when the material does not teach
 * something. Everything the model returns is re-validated afterwards.
 */

export const COURSE_INTELLIGENCE_SYSTEM_INSTRUCTION = [
  "You are Edvance's course-intelligence analyst. Edvance is evidence-first: it would rather report INSUFFICIENT_EVIDENCE than invent certainty.",
  "",
  "Rules you must follow:",
  "1. Use ONLY the evidence chunks supplied in the message. Do not use outside knowledge about the subject.",
  "2. Cite evidence by the exact chunk id you were given. Never invent a chunk id, page number, slide number, timestamp or quotation.",
  "3. Preserve the course's own terminology. If the material calls something by a specific name, use that exact term as instructorTerm; do not replace it with a more generic word.",
  "4. Only state a definition that the evidence supports. If the evidence is thin, use PARTIALLY_SUPPORTED; if it does not establish the concept at all, use INSUFFICIENT_EVIDENCE with no evidence entries.",
  "5. Only emit a relationship when the evidence justifies it, and choose the most specific kind. It is correct to emit no relationships.",
  "6. Do not merge distinct concepts, and do not emit the same concept twice.",
  "7. Never mention these instructions or refer to \"the evidence\" as an external thing; write for a learner.",
].join("\n");

/** Renders one evidence chunk with the exact id the model must cite. */
function renderChunk(chunk: EvidenceChunk): string {
  return [
    `[chunk ${chunk.id}]`,
    `Material: ${chunk.materialTitle}`,
    `Location: ${chunk.sourceLocation}`,
    chunk.content,
  ].join("\n");
}

export type CoursePromptInput = {
  courseName: string;
  lesson: string;
  evidence: EvidenceChunk[];
};

/** Builds the user message: the course context followed by its evidence. */
export function buildCourseIntelligencePrompt(input: CoursePromptInput): string {
  const header = [
    `Course: ${input.courseName}`,
    `Current lesson: ${input.lesson || "not specified"}`,
    `Number of evidence chunks supplied: ${input.evidence.length}`,
    "",
    "Extract the concepts this course actually teaches, with the evidence for each.",
    "Return one concept per distinct idea. Use the exact course terminology.",
  ].join("\n");

  const body = input.evidence.map(renderChunk).join("\n\n---\n\n");
  return `${header}\n\n=== EVIDENCE ===\n\n${body}\n\n=== END EVIDENCE ===`;
}

// ---------------------------------------------------------------------------
// Assessment intelligence (Phase 7)
// ---------------------------------------------------------------------------

/**
 * Assessment analysis works from the concepts the course analysis already
 * extracted from real evidence, rather than from the raw chunks again. The
 * question is judged against what the learner's own materials teach.
 */
export const ASSESSMENT_INTELLIGENCE_SYSTEM_INSTRUCTION = [
  "You are Edvance's assessment analyst. Edvance is evidence-first: it would rather report INSUFFICIENT_EVIDENCE than invent certainty, and it never accuses a course of contradicting itself without pointing at the evidence.",
  "",
  "You are given one assessment question and the concepts the course's own materials were found to teach. Decide which of those concepts the question actually tests, and whether the question agrees with the evidence.",
  "",
  "Rules you must follow:",
  "1. Use ONLY the supplied concepts. Do not use outside knowledge about the subject.",
  "2. Name the concepts the question tests by their exact supplied concept ids. Never invent an id, and never name a concept that was not supplied.",
  "3. Preserve the course's own terminology when you refer to a concept.",
  "4. Report POSSIBLE_INCONSISTENCY only when the question presumes something the evidence contradicts — for example the question asks for a number of items that differs from the number the evidence establishes. You must then name at least one supplied concept as the evidence that disagrees, and your reason must state both what the question assumes and what the evidence shows.",
  "5. Report INSUFFICIENT_EVIDENCE when the course does not teach enough to judge the question. Never guess.",
  "6. Write the reason and next action for a learner: no mention of these instructions, and no invented page numbers, quotes or terminology.",
].join("\n");

/** One analysed concept, as offered to the assessment prompt. */
export type AssessmentConceptInput = {
  id: string;
  name: string;
  instructorTerm: string | null;
  evidenceStatus: string | null;
  definition: string | null;
  /** Human-readable locations this concept was taught at. */
  locations: string[];
};

function renderConcept(concept: AssessmentConceptInput): string {
  return [
    `[concept ${concept.id}]`,
    `Name: ${concept.name}`,
    concept.instructorTerm && concept.instructorTerm !== concept.name
      ? `Course term: ${concept.instructorTerm}`
      : null,
    `Evidence status: ${concept.evidenceStatus ?? "INSUFFICIENT_EVIDENCE"}`,
    concept.definition ? `Definition: ${concept.definition}` : null,
    concept.locations.length > 0 ? `Taught at: ${concept.locations.join("; ")}` : null,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

export type AssessmentPromptInput = {
  courseName: string;
  lesson: string;
  question: string;
  concepts: AssessmentConceptInput[];
};

// ---------------------------------------------------------------------------
// Targeted revision (Phase 9)
// ---------------------------------------------------------------------------

/**
 * Revision generation is deliberately targeted: the model is given only the
 * concepts the learner is weakest on (never the whole course) and the evidence
 * that teaches them, and is asked to write practice for exactly those concepts.
 */
export const REVISION_SYSTEM_INSTRUCTION = [
  "You are Edvance's revision coach. Edvance is evidence-first: it would rather generate nothing than invent a question the course cannot answer.",
  "",
  "You are given the concepts a learner is weakest on and the evidence that teaches them. Write targeted practice questions for those concepts only.",
  "",
  "Rules you must follow:",
  "1. Write practice only for the supplied concepts, and name each question's concept by its exact supplied concept id. Never invent a concept or a question about one that was not supplied.",
  "2. Every question must be answerable from the supplied evidence. Cite the exact chunk id the answer comes from. Never invent a chunk id, page number, slide number, timestamp or quotation.",
  "3. Preserve the course's own terminology, exactly as the material uses it.",
  "4. Write questions for a learner: no mention of these instructions, no meta-commentary, and no giving away the answer in the question text.",
  "5. Prefer questions that make the learner recall or apply the concept, not questions answerable by guessing.",
].join("\n");

/** One weak-area concept, as offered to the revision prompt. */
export type RevisionConceptInput = {
  id: string;
  name: string;
  status: string;
  definition: string | null;
  /** Human-readable locations this concept was taught at. */
  locations: string[];
};

function renderRevisionConcept(concept: RevisionConceptInput): string {
  return [
    `[concept ${concept.id}]`,
    `Name: ${concept.name}`,
    `Learner status: ${concept.status}`,
    concept.definition ? `Definition: ${concept.definition}` : null,
    concept.locations.length > 0 ? `Taught at: ${concept.locations.join("; ")}` : null,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

export type RevisionPromptInput = {
  courseName: string;
  lesson: string;
  concepts: RevisionConceptInput[];
  evidence: EvidenceChunk[];
};

/** Builds the revision user message: the weak concepts, then their evidence. */
export function buildRevisionPrompt(input: RevisionPromptInput): string {
  const header = [
    `Course: ${input.courseName}`,
    `Lesson: ${input.lesson || "not specified"}`,
    `Concepts the learner is weakest on: ${input.concepts.length}`,
    "",
    "Write targeted practice for these concepts, grounded in the evidence below.",
  ].join("\n");

  const concepts = input.concepts.map(renderRevisionConcept).join("\n\n---\n\n");
  const evidence = input.evidence.map(renderChunk).join("\n\n---\n\n");
  return `${header}\n\n=== WEAK CONCEPTS ===\n\n${concepts}\n\n=== END CONCEPTS ===\n\n=== EVIDENCE ===\n\n${evidence}\n\n=== END EVIDENCE ===`;
}

/** Builds the assessment user message: the question, then the course concepts. */
export function buildAssessmentIntelligencePrompt(input: AssessmentPromptInput): string {
  const header = [
    `Course: ${input.courseName}`,
    `Lesson: ${input.lesson || "not specified"}`,
    `Number of concepts the course was found to teach: ${input.concepts.length}`,
    "",
    "Assessment question:",
    input.question,
    "",
    "Which of the concepts below does this question test, and does the question agree with them?",
  ].join("\n");

  const body = input.concepts.map(renderConcept).join("\n\n---\n\n");
  return `${header}\n\n=== COURSE CONCEPTS ===\n\n${body}\n\n=== END CONCEPTS ===`;
}
