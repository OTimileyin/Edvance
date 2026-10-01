import { generateStructured } from "./gemini";
import { COURSE_INTELLIGENCE_SYSTEM_INSTRUCTION, buildCourseIntelligencePrompt } from "./prompts";
import {
  COURSE_INTELLIGENCE_JSON_SCHEMA,
  EVIDENCE_STATUSES,
  parseCourseIntelligence,
  resolveReferences,
  type EvidenceStatus,
  type ModelConcept,
  type RelationshipKind,
} from "./schemas";
import { ModelOutputError, type AiUsage, type EvidenceChunk } from "./types";

/**
 * The course-intelligence pipeline, minus persistence.
 *
 *   evidence → bounded prompt → provider → strict validation → reference
 *   resolution → de-duplication → a result the repository can store
 *
 * It is deliberately pure: it takes evidence and returns intelligence, so it
 * can be unit-tested with a mocked provider and no database. Anything that
 * fails validation throws and is never partially applied.
 */

/** Cost control: bound how much evidence one analysis may send. */
export const MAX_EVIDENCE_CHUNKS = 150;
export const MAX_EVIDENCE_CHARS = 120_000;

export type AnalyzedConcept = {
  key: string;
  name: string;
  instructorTerm: string;
  definition: string;
  evidenceStatus: EvidenceStatus;
  confidence: number;
  evidence: { chunkId: string; rationale: string }[];
};

export type AnalyzedRelationship = {
  fromKey: string;
  toKey: string;
  kind: RelationshipKind;
  justification: string;
};

export type AnalyzedIntelligence = {
  status: "ready" | "insufficient-evidence";
  overall: EvidenceStatus;
  concepts: AnalyzedConcept[];
  relationships: AnalyzedRelationship[];
  usage: AiUsage;
};

/**
 * Trims evidence to the analysis budget: at most `MAX_EVIDENCE_CHUNKS` chunks
 * and `MAX_EVIDENCE_CHARS` characters, in their stored order. The returned list
 * is exactly what the model is allowed to cite.
 */
export function boundEvidence(chunks: EvidenceChunk[]): EvidenceChunk[] {
  const bounded: EvidenceChunk[] = [];
  let budget = MAX_EVIDENCE_CHARS;
  for (const chunk of chunks) {
    if (bounded.length >= MAX_EVIDENCE_CHUNKS) break;
    if (chunk.content.length > budget) {
      if (bounded.length === 0) {
        bounded.push({ ...chunk, content: chunk.content.slice(0, budget) });
      }
      break;
    }
    bounded.push(chunk);
    budget -= chunk.content.length;
  }
  return bounded;
}

function statusRank(status: EvidenceStatus): number {
  return EVIDENCE_STATUSES.indexOf(status);
}

/** Normalises a name for de-duplication (case/space insensitive). */
function normaliseName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Merges concepts the model reported more than once for the same idea.
 *
 * Two mentions become one concept: their evidence is combined, the strongest
 * evidence status wins, and the highest confidence is kept. This keeps the
 * stored concept list honest without silently dropping evidence the model cited.
 */
function mergeConcepts(concepts: ModelConcept[]): AnalyzedConcept[] {
  const byName = new Map<string, AnalyzedConcept>();
  for (const concept of concepts) {
    const nameKey = normaliseName(concept.name);
    const existing = byName.get(nameKey);
    if (!existing) {
      byName.set(nameKey, {
        key: concept.key,
        name: concept.name,
        instructorTerm: concept.instructorTerm,
        definition: concept.definition,
        evidenceStatus: concept.evidenceStatus,
        confidence: concept.confidence,
        evidence: [...concept.evidence],
      });
      continue;
    }
    const seen = new Set(existing.evidence.map((entry) => entry.chunkId));
    for (const entry of concept.evidence) {
      if (!seen.has(entry.chunkId)) existing.evidence.push(entry);
    }
    if (statusRank(concept.evidenceStatus) < statusRank(existing.evidenceStatus)) {
      existing.evidenceStatus = concept.evidenceStatus;
    }
    existing.confidence = Math.max(existing.confidence, concept.confidence);
    if (!existing.definition && concept.definition) existing.definition = concept.definition;
  }
  return [...byName.values()];
}

/**
 * Runs one course analysis.
 *
 * Every chunk id the model cites must be in `evidence`, which the caller loaded
 * scoped to this learner and this course — so a fabricated, cross-course or
 * cross-user citation is rejected here rather than persisted.
 */
export async function analyseCourseEvidence(input: {
  courseName: string;
  lesson: string;
  evidence: EvidenceChunk[];
  /** Test-only scenario selector for the mock provider; ignored in production. */
  mockScenario?: string;
}): Promise<AnalyzedIntelligence> {
  const bounded = boundEvidence(input.evidence);
  const allowedChunkIds = new Set(bounded.map((chunk) => chunk.id));

  const response = await generateStructured({
    systemInstruction: COURSE_INTELLIGENCE_SYSTEM_INSTRUCTION,
    userPrompt: buildCourseIntelligencePrompt({
      courseName: input.courseName,
      lesson: input.lesson,
      evidence: bounded,
    }),
    jsonSchema: COURSE_INTELLIGENCE_JSON_SCHEMA,
    evidence: bounded,
    mockScenario: input.mockScenario,
  });

  let model;
  try {
    model = parseCourseIntelligence(response.text);
    resolveReferences(model, allowedChunkIds);
  } catch (error) {
    if (error instanceof ModelOutputError) {
      // The raw output is never logged — it may contain course contents.
      console.error(`[ai] course analysis rejected: ${error.reason}`);
    }
    throw error;
  }

  const concepts = mergeConcepts(model.concepts);

  // Relationships are re-expressed against the surviving concepts. A
  // relationship whose endpoints were merged together is dropped as meaningless.
  const keyToName = new Map<string, string>();
  for (const concept of model.concepts) keyToName.set(concept.key, normaliseName(concept.name));
  const relationships = model.relationships
    .map((relationship) => {
      const fromName = keyToName.get(relationship.fromKey);
      const toName = keyToName.get(relationship.toKey);
      if (!fromName || !toName || fromName === toName) return null;
      return {
        fromKey: fromName,
        toKey: toName,
        kind: relationship.kind,
        justification: relationship.justification,
      };
    })
    .filter((relationship): relationship is AnalyzedRelationship => relationship !== null);

  const hasSupported = concepts.some(
    (concept) => concept.evidenceStatus !== "INSUFFICIENT_EVIDENCE" && concept.evidence.length > 0,
  );
  const status: AnalyzedIntelligence["status"] = hasSupported ? "ready" : "insufficient-evidence";

  return {
    status,
    overall: model.overallEvidenceStatus,
    concepts,
    relationships,
    usage: response.usage,
  };
}
