import { generateStructured } from "./gemini";
import {
  REVISION_SYSTEM_INSTRUCTION,
  buildRevisionPrompt,
  type RevisionConceptInput,
} from "./prompts";
import {
  REVISION_INTELLIGENCE_JSON_SCHEMA,
  parseRevisionIntelligence,
  resolveRevisionReferences,
} from "./schemas";
import { ModelOutputError, type AiUsage, type EvidenceChunk } from "./types";

/**
 * The targeted-revision pipeline, minus persistence.
 *
 *   weak concepts + their evidence → prompt → provider → strict validation →
 *   reference resolution → practice the repository can store
 *
 * It is pure: the caller supplies only the concepts the learner is weakest on
 * (from mastery) and the chunks that teach them, so a question can only ever be
 * written for a real weak area and cite real evidence. A question about a
 * concept outside that set, or citing a chunk that was not supplied, rejects the
 * whole response.
 *
 * No model is called when there is nothing to revise; the recommendation itself
 * is deterministic and lives in `lib/revision.ts`.
 */

/** Cost control: how many practice questions one generation may store. */
export const MAX_PRACTICE_QUESTIONS = 12;

export type AnalyzedPracticeQuestion = {
  conceptId: string;
  question: string;
  rationale: string;
  chunkId: string;
};

export type AnalyzedRevision = {
  status: "ready" | "insufficient-evidence";
  questions: AnalyzedPracticeQuestion[];
  usage: AiUsage;
};

/**
 * Generates targeted practice for the supplied weak concepts.
 *
 * `concepts` must be concepts the learner is actually weak on, and `evidence`
 * must be the chunks that teach them — both loaded scoped to this learner and
 * this course, so a fabricated concept or citation is rejected here rather than
 * persisted.
 */
export async function generateTargetedPractice(input: {
  courseName: string;
  lesson: string;
  concepts: RevisionConceptInput[];
  evidence: EvidenceChunk[];
  /** Test-only scenario selector for the mock provider; ignored in production. */
  mockScenario?: string;
}): Promise<AnalyzedRevision> {
  const allowedConceptIds = new Set(input.concepts.map((concept) => concept.id));
  const allowedChunkIds = new Set(input.evidence.map((chunk) => chunk.id));

  const response = await generateStructured({
    kind: "revision",
    systemInstruction: REVISION_SYSTEM_INSTRUCTION,
    userPrompt: buildRevisionPrompt({
      courseName: input.courseName,
      lesson: input.lesson,
      concepts: input.concepts,
      evidence: input.evidence,
    }),
    jsonSchema: REVISION_INTELLIGENCE_JSON_SCHEMA,
    evidence: input.evidence,
    concepts: input.concepts.map((concept) => ({ id: concept.id, name: concept.name })),
    mockScenario: input.mockScenario,
  });

  let model;
  try {
    model = parseRevisionIntelligence(response.text);
    resolveRevisionReferences(model, allowedConceptIds, allowedChunkIds);
  } catch (error) {
    if (error instanceof ModelOutputError) {
      // The raw output is never logged — it may contain course contents.
      console.error(`[ai] revision generation rejected: ${error.reason}`);
    }
    throw error;
  }

  // Bound the stored set: a free-tier model that returns far more than asked is
  // trimmed rather than trusted to respect the budget.
  const questions: AnalyzedPracticeQuestion[] = model.questions
    .slice(0, MAX_PRACTICE_QUESTIONS)
    .map((question) => ({
      conceptId: question.conceptId,
      question: question.question,
      rationale: question.rationale,
      chunkId: question.sourceChunkId,
    }));

  return {
    status: questions.length > 0 ? "ready" : "insufficient-evidence",
    questions,
    usage: response.usage,
  };
}
