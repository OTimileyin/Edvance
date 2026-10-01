import { ModelOutputError } from "./types";

/**
 * The contract between Edvance and the model.
 *
 * `COURSE_INTELLIGENCE_JSON_SCHEMA` is sent to Gemini as a structured-output
 * schema so the model is constrained at generation time.
 * `parseCourseIntelligence` then re-validates everything at runtime: a schema
 * hint is not a guarantee, and a model response is never trusted until it has
 * been checked here.
 *
 * The model refers to concepts by short local `key`s and to evidence by the
 * exact chunk ids it was given. `resolveReferences` then proves every cited
 * chunk is real, belongs to this learner's course, and was actually in the
 * model's input.
 */

export const EVIDENCE_STATUSES = [
  "SUPPORTED",
  "PARTIALLY_SUPPORTED",
  "INSUFFICIENT_EVIDENCE",
] as const;
export type EvidenceStatus = (typeof EVIDENCE_STATUSES)[number];

/** The assessment verdict vocabulary: does the question agree with the evidence? */
export const CONSISTENCY_STATES = [
  "CONSISTENT",
  "POSSIBLE_INCONSISTENCY",
  "INSUFFICIENT_EVIDENCE",
] as const;
export type ConsistencyState = (typeof CONSISTENCY_STATES)[number];

export const RELATIONSHIP_KINDS = [
  "prerequisite",
  "part_of",
  "related_to",
  "contrasts_with",
] as const;
export type RelationshipKind = (typeof RELATIONSHIP_KINDS)[number];

/** A single concept as the model returns it, before reference resolution. */
export type ModelConcept = {
  key: string;
  name: string;
  instructorTerm: string;
  definition: string;
  evidenceStatus: EvidenceStatus;
  confidence: number;
  evidence: { chunkId: string; rationale: string }[];
};

export type ModelRelationship = {
  fromKey: string;
  toKey: string;
  kind: RelationshipKind;
  justification: string;
};

export type ModelCourseIntelligence = {
  concepts: ModelConcept[];
  relationships: ModelRelationship[];
  overallEvidenceStatus: EvidenceStatus;
};

/** The JSON Schema handed to Gemini. Uses only features Gemini supports. */
export const COURSE_INTELLIGENCE_JSON_SCHEMA = {
  type: "object",
  properties: {
    concepts: {
      type: "array",
      description:
        "Every distinct concept the course evidence teaches, one entry per concept.",
      items: {
        type: "object",
        properties: {
          key: {
            type: "string",
            description: "A short unique local id for this concept, e.g. \"c1\".",
          },
          name: {
            type: "string",
            description: "The canonical concept name.",
          },
          instructorTerm: {
            type: "string",
            description:
              "The exact term the course material uses for this concept. Preserve the course's own wording; do not paraphrase.",
          },
          definition: {
            type: "string",
            description:
              "A one or two sentence definition grounded only in the supplied evidence.",
          },
          evidenceStatus: {
            type: "string",
            enum: [...EVIDENCE_STATUSES],
            description:
              "SUPPORTED when the evidence clearly teaches this concept; PARTIALLY_SUPPORTED when it is only partly evidenced; INSUFFICIENT_EVIDENCE when the course does not actually establish it.",
          },
          confidence: {
            type: "number",
            description: "A 0..1 confidence that the evidence supports this concept.",
          },
          evidence: {
            type: "array",
            description:
              "The supplied chunk ids that support this concept. Use INSUFFICIENT_EVIDENCE with an empty list when nothing supports it.",
            items: {
              type: "object",
              properties: {
                chunkId: {
                  type: "string",
                  description: "An exact chunk id from the supplied evidence list.",
                },
                rationale: {
                  type: "string",
                  description: "One short sentence on how this chunk supports the concept.",
                },
              },
              required: ["chunkId", "rationale"],
            },
          },
        },
        required: [
          "key",
          "name",
          "instructorTerm",
          "definition",
          "evidenceStatus",
          "confidence",
          "evidence",
        ],
      },
    },
    relationships: {
      type: "array",
      description:
        "Justified relationships between concepts in this course. Return an empty array when the evidence does not establish any.",
      items: {
        type: "object",
        properties: {
          fromKey: { type: "string", description: "The concept key the relationship starts from." },
          toKey: { type: "string", description: "The concept key the relationship points to." },
          kind: {
            type: "string",
            enum: [...RELATIONSHIP_KINDS],
          },
          justification: {
            type: "string",
            description: "One short sentence, grounded in the evidence, explaining the relationship.",
          },
        },
        required: ["fromKey", "toKey", "kind", "justification"],
      },
    },
    overallEvidenceStatus: {
      type: "string",
      enum: [...EVIDENCE_STATUSES],
      description: "The strongest statement the evidence as a whole supports.",
    },
  },
  required: ["concepts", "relationships", "overallEvidenceStatus"],
} as const;

/**
 * The JSON Schema handed to Gemini for assessment intelligence. The model is
 * given the course's already-extracted concepts and must name the ones the
 * question actually tests by their exact supplied ids — never invent one.
 */
export const ASSESSMENT_INTELLIGENCE_JSON_SCHEMA = {
  type: "object",
  properties: {
    testedConcepts: {
      type: "array",
      description:
        "The supplied concepts this question actually tests. Use the exact concept ids you were given; return an empty array when none apply.",
      items: {
        type: "object",
        properties: {
          conceptId: {
            type: "string",
            description: "An exact concept id from the supplied list.",
          },
          why: {
            type: "string",
            description: "One short sentence on how the question exercises this concept.",
          },
        },
        required: ["conceptId", "why"],
      },
    },
    consistency: {
      type: "string",
      enum: [...CONSISTENCY_STATES],
      description:
        "CONSISTENT when the question agrees with what the evidence teaches; POSSIBLE_INCONSISTENCY when the question presumes something the evidence contradicts, such as a different number of items; INSUFFICIENT_EVIDENCE when the course does not teach enough to judge.",
    },
    reason: {
      type: "string",
      description:
        "One or two sentences, grounded only in the supplied concepts, explaining the verdict. For a possible inconsistency, state exactly what the question assumes and what the evidence shows instead.",
    },
    nextAction: {
      type: "string",
      description: "One concrete action for the learner, grounded in the evidence.",
    },
  },
  required: ["testedConcepts", "consistency", "reason", "nextAction"],
} as const;

export type ModelTestedConcept = { conceptId: string; why: string };

export type ModelAssessmentIntelligence = {
  testedConcepts: ModelTestedConcept[];
  consistency: ConsistencyState;
  reason: string;
  nextAction: string;
};

/**
 * Parses and validates raw assessment output.
 *
 * Beyond shape, it enforces the honesty rule that matters most here: a claim of
 * POSSIBLE_INCONSISTENCY must name at least one existing concept as the evidence
 * that disagrees. Edvance does not raise a contradiction it cannot point at.
 */
export function parseAssessmentIntelligence(raw: string): ModelAssessmentIntelligence {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ModelOutputError("malformed-json", "The model did not return valid JSON.");
  }

  if (!isRecord(parsed)) {
    throw new ModelOutputError("malformed-output", "The model response was not a JSON object.");
  }

  const rawTested = parsed.testedConcepts;
  if (!Array.isArray(rawTested)) {
    throw new ModelOutputError("malformed-output", "Field testedConcepts must be an array.");
  }

  const seen = new Set<string>();
  const testedConcepts: ModelTestedConcept[] = rawTested.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new ModelOutputError("malformed-output", `testedConcepts[${index}] was not an object.`);
    }
    const conceptId = requireString(entry.conceptId, `testedConcepts[${index}].conceptId`, 200);
    if (seen.has(conceptId)) {
      throw new ModelOutputError("duplicate-key", `Concept "${conceptId}" was listed twice.`);
    }
    seen.add(conceptId);
    return {
      conceptId,
      why: optionalString(entry.why, `testedConcepts[${index}].why`, 500),
    };
  });

  const consistency = requireEnum(parsed.consistency, CONSISTENCY_STATES, "consistency");
  const reason = requireString(parsed.reason, "reason", 1200);
  const nextAction = requireString(parsed.nextAction, "nextAction", 600);

  if (consistency === "POSSIBLE_INCONSISTENCY" && testedConcepts.length === 0) {
    throw new ModelOutputError(
      "unjustified-inconsistency",
      "A possible inconsistency must name the concept it disagrees with.",
    );
  }

  return { testedConcepts, consistency, reason, nextAction };
}

/**
 * Proves every concept the model named was one of the analysed concepts it was
 * given. A concept id outside that set is hallucinated, from another course, or
 * from another learner — in every case the whole response is rejected.
 */
export function resolveAssessmentReferences(
  model: ModelAssessmentIntelligence,
  allowedConceptIds: ReadonlySet<string>,
): void {
  for (const tested of model.testedConcepts) {
    if (!allowedConceptIds.has(tested.conceptId)) {
      throw new ModelOutputError(
        "unknown-concept",
        "The question analysis cited a concept that was not supplied.",
      );
    }
  }
}

/**
 * The JSON Schema handed to Gemini for targeted revision. The model is given the
 * learner's weak/untested concepts and the evidence that teaches them, and must
 * write practice questions that name a supplied concept and cite a supplied
 * chunk — never a new concept and never an invented citation.
 */
export const REVISION_INTELLIGENCE_JSON_SCHEMA = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      description:
        "Targeted practice questions, one or more for each supplied concept. Return an empty array only when the supplied evidence cannot support a question.",
      items: {
        type: "object",
        properties: {
          conceptId: {
            type: "string",
            description: "An exact concept id from the supplied focus list.",
          },
          question: {
            type: "string",
            description:
              "One practice question for the learner, answerable from the supplied evidence and using the course's own terminology.",
          },
          rationale: {
            type: "string",
            description: "One short sentence on which part of the concept this question exercises.",
          },
          sourceChunkId: {
            type: "string",
            description: "An exact chunk id from the supplied evidence list, where the answer is taught.",
          },
        },
        required: ["conceptId", "question", "rationale", "sourceChunkId"],
      },
    },
  },
  required: ["questions"],
} as const;

export type ModelPracticeQuestion = {
  conceptId: string;
  question: string;
  rationale: string;
  sourceChunkId: string;
};

export type ModelRevisionIntelligence = { questions: ModelPracticeQuestion[] };

/**
 * Parses and validates raw targeted-practice output. Every field is required:
 * a practice question with no concept or no cited evidence is worthless to the
 * learner, so it is rejected rather than stored half-formed.
 */
export function parseRevisionIntelligence(raw: string): ModelRevisionIntelligence {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ModelOutputError("malformed-json", "The model did not return valid JSON.");
  }

  if (!isRecord(parsed)) {
    throw new ModelOutputError("malformed-output", "The model response was not a JSON object.");
  }
  const rawQuestions = parsed.questions;
  if (!Array.isArray(rawQuestions)) {
    throw new ModelOutputError("malformed-output", "Field questions must be an array.");
  }

  const seen = new Set<string>();
  const questions: ModelPracticeQuestion[] = rawQuestions.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new ModelOutputError("malformed-output", `questions[${index}] was not an object.`);
    }
    const conceptId = requireString(entry.conceptId, `questions[${index}].conceptId`, 200);
    const question = requireString(entry.question, `questions[${index}].question`, 600);
    const dedupe = `${conceptId}::${question.toLowerCase().replace(/\s+/g, " ")}`;
    if (seen.has(dedupe)) {
      throw new ModelOutputError("duplicate-key", "The same practice question was returned twice.");
    }
    seen.add(dedupe);
    return {
      conceptId,
      question,
      rationale: optionalString(entry.rationale, `questions[${index}].rationale`, 600),
      sourceChunkId: requireString(entry.sourceChunkId, `questions[${index}].sourceChunkId`, 200),
    };
  });

  return { questions };
}

/**
 * Proves every reference in the generated practice is real: the concept was one
 * of the weak areas supplied, and the cited chunk was in the supplied evidence
 * (all of which was loaded scoped to this learner and this course).
 */
export function resolveRevisionReferences(
  model: ModelRevisionIntelligence,
  allowedConceptIds: ReadonlySet<string>,
  allowedChunkIds: ReadonlySet<string>,
): void {
  for (const question of model.questions) {
    if (!allowedConceptIds.has(question.conceptId)) {
      throw new ModelOutputError(
        "unknown-concept",
        "Generated practice named a concept that was not supplied.",
      );
    }
    if (!allowedChunkIds.has(question.sourceChunkId)) {
      throw new ModelOutputError(
        "unknown-chunk",
        "Generated practice cited evidence that was not supplied.",
      );
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, field: string, max = 2000): string {
  if (typeof value !== "string") {
    throw new ModelOutputError("invalid-field", `Field ${field} must be a string.`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new ModelOutputError("invalid-field", `Field ${field} must not be empty.`);
  }
  if (trimmed.length > max) {
    throw new ModelOutputError("invalid-field", `Field ${field} is too long.`);
  }
  return trimmed;
}

/** A string that is allowed to be empty (definitions can be terse). */
function optionalString(value: unknown, field: string, max = 2000): string {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") {
    throw new ModelOutputError("invalid-field", `Field ${field} must be a string.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > max) {
    throw new ModelOutputError("invalid-field", `Field ${field} is too long.`);
  }
  return trimmed;
}

function requireConfidence(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ModelOutputError("invalid-field", `Field ${field} must be a number.`);
  }
  if (value < 0 || value > 1) {
    throw new ModelOutputError("invalid-field", `Field ${field} must be between 0 and 1.`);
  }
  return Number(value.toFixed(3));
}

function requireEnum<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  field: string,
): T[number] {
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new ModelOutputError(
      "invalid-field",
      `Field ${field} must be one of: ${allowed.join(", ")}.`,
    );
  }
  return value as T[number];
}

/**
 * Parses and validates raw model output into `ModelCourseIntelligence`.
 *
 * Throws `ModelOutputError` for anything malformed, so a bad response is a
 * clean rejection rather than a half-written course. It deliberately does not
 * check chunk ids — that is `resolveReferences`, which needs the real evidence.
 */
export function parseCourseIntelligence(raw: string): ModelCourseIntelligence {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ModelOutputError("malformed-json", "The model did not return valid JSON.");
  }

  if (!isRecord(parsed)) {
    throw new ModelOutputError("malformed-output", "The model response was not a JSON object.");
  }

  const rawConcepts = parsed.concepts;
  if (!Array.isArray(rawConcepts)) {
    throw new ModelOutputError("malformed-output", "Field concepts must be an array.");
  }

  const seenKeys = new Set<string>();
  const concepts: ModelConcept[] = rawConcepts.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new ModelOutputError("malformed-output", `Concept ${index} was not an object.`);
    }
    const key = requireString(entry.key, `concepts[${index}].key`, 64);
    if (seenKeys.has(key)) {
      throw new ModelOutputError("duplicate-key", `Concept key "${key}" was used twice.`);
    }
    seenKeys.add(key);

    const rawEvidence = entry.evidence;
    if (!Array.isArray(rawEvidence)) {
      throw new ModelOutputError("malformed-output", `concepts[${index}].evidence must be an array.`);
    }
    const evidence = rawEvidence.map((item, evidenceIndex) => {
      if (!isRecord(item)) {
        throw new ModelOutputError(
          "malformed-output",
          `concepts[${index}].evidence[${evidenceIndex}] was not an object.`,
        );
      }
      return {
        chunkId: requireString(item.chunkId, `concepts[${index}].evidence[${evidenceIndex}].chunkId`, 200),
        rationale: optionalString(item.rationale, `concepts[${index}].evidence[${evidenceIndex}].rationale`, 500),
      };
    });

    return {
      key,
      name: requireString(entry.name, `concepts[${index}].name`, 200),
      instructorTerm: requireString(entry.instructorTerm, `concepts[${index}].instructorTerm`, 200),
      definition: optionalString(entry.definition, `concepts[${index}].definition`, 1200),
      evidenceStatus: requireEnum(entry.evidenceStatus, EVIDENCE_STATUSES, `concepts[${index}].evidenceStatus`),
      confidence: requireConfidence(entry.confidence, `concepts[${index}].confidence`),
      evidence,
    };
  });

  const rawRelationships = parsed.relationships;
  if (!Array.isArray(rawRelationships)) {
    throw new ModelOutputError("malformed-output", "Field relationships must be an array.");
  }
  const relationships: ModelRelationship[] = rawRelationships.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new ModelOutputError("malformed-output", `Relationship ${index} was not an object.`);
    }
    return {
      fromKey: requireString(entry.fromKey, `relationships[${index}].fromKey`, 64),
      toKey: requireString(entry.toKey, `relationships[${index}].toKey`, 64),
      kind: requireEnum(entry.kind, RELATIONSHIP_KINDS, `relationships[${index}].kind`),
      justification: optionalString(entry.justification, `relationships[${index}].justification`, 600),
    };
  });

  const overallEvidenceStatus = requireEnum(
    parsed.overallEvidenceStatus,
    EVIDENCE_STATUSES,
    "overallEvidenceStatus",
  );

  return { concepts, relationships, overallEvidenceStatus };
}

/**
 * Proves every reference the model made is real.
 *
 * `allowedChunkIds` is the set of chunks actually included in the model input,
 * all of which were loaded scoped to this learner and this course. A chunk id
 * outside that set is either hallucinated, from another course, or from another
 * learner — in every case it is rejected, and so is the whole response. It also
 * rejects relationships that point at concept keys the model never defined.
 */
export function resolveReferences(
  model: ModelCourseIntelligence,
  allowedChunkIds: ReadonlySet<string>,
): void {
  const keys = new Set(model.concepts.map((concept) => concept.key));

  for (const concept of model.concepts) {
    for (const reference of concept.evidence) {
      if (!allowedChunkIds.has(reference.chunkId)) {
        throw new ModelOutputError(
          "unknown-chunk",
          `Concept "${concept.name}" cited evidence that was not supplied.`,
        );
      }
    }
  }

  for (const relationship of model.relationships) {
    if (!keys.has(relationship.fromKey) || !keys.has(relationship.toKey)) {
      throw new ModelOutputError(
        "unknown-concept",
        "A relationship referenced a concept that was not defined.",
      );
    }
  }
}
