import { generateStructured } from "./gemini";
import {
  ASSESSMENT_INTELLIGENCE_SYSTEM_INSTRUCTION,
  buildAssessmentIntelligencePrompt,
  type AssessmentConceptInput,
} from "./prompts";
import {
  ASSESSMENT_INTELLIGENCE_JSON_SCHEMA,
  parseAssessmentIntelligence,
  resolveAssessmentReferences,
  type ConsistencyState,
} from "./schemas";
import { ModelOutputError, type AiUsage } from "./types";

/**
 * The assessment-intelligence pipeline, minus persistence.
 *
 *   question + analysed concepts → prompt → provider → strict validation →
 *   reference resolution → a result the repository can store
 *
 * Like the course pipeline it is pure: it takes the question and the concepts
 * the course evidence already established, and returns a verdict. It never
 * reads the raw material itself, so an assessment can only ever be judged
 * against what the learner's own materials were found to teach.
 *
 * No concept is sent that was not extracted from real evidence, and every
 * concept the model names is proven to be one of those — so a hallucinated,
 * cross-course or cross-user concept rejects the whole response.
 */

export type AnalyzedAssessment = {
  status: "ready" | "insufficient-evidence";
  consistency: ConsistencyState;
  reason: string;
  nextAction: string;
  /** The exact ids of the analysed concepts this question was found to test. */
  testedConceptIds: string[];
  usage: AiUsage;
};

/**
 * Judges one assessment question against a course's extracted concepts.
 *
 * `concepts` must be the course's real analysis output (never seed concepts);
 * the caller loads them scoped to this learner and this course, so a cited
 * concept outside that set is rejected here rather than persisted.
 */
export async function analyseAssessment(input: {
  courseName: string;
  lesson: string;
  question: string;
  concepts: AssessmentConceptInput[];
  /** Test-only scenario selector for the mock provider; ignored in production. */
  mockScenario?: string;
}): Promise<AnalyzedAssessment> {
  const allowedConceptIds = new Set(input.concepts.map((concept) => concept.id));

  const response = await generateStructured({
    kind: "assessment",
    systemInstruction: ASSESSMENT_INTELLIGENCE_SYSTEM_INSTRUCTION,
    userPrompt: buildAssessmentIntelligencePrompt({
      courseName: input.courseName,
      lesson: input.lesson,
      question: input.question,
      concepts: input.concepts,
    }),
    jsonSchema: ASSESSMENT_INTELLIGENCE_JSON_SCHEMA,
    evidence: [],
    concepts: input.concepts.map((concept) => ({ id: concept.id, name: concept.name })),
    question: input.question,
    mockScenario: input.mockScenario,
  });

  let model;
  try {
    model = parseAssessmentIntelligence(response.text);
    resolveAssessmentReferences(model, allowedConceptIds);
  } catch (error) {
    if (error instanceof ModelOutputError) {
      // The raw output is never logged — it may contain course contents.
      console.error(`[ai] assessment analysis rejected: ${error.reason}`);
    }
    throw error;
  }

  const testedConceptIds = model.testedConcepts.map((tested) => tested.conceptId);
  const status: AnalyzedAssessment["status"] =
    model.consistency === "INSUFFICIENT_EVIDENCE" || testedConceptIds.length === 0
      ? "insufficient-evidence"
      : "ready";

  return {
    status,
    consistency: model.consistency,
    reason: model.reason,
    nextAction: model.nextAction,
    testedConceptIds,
    usage: response.usage,
  };
}
