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
