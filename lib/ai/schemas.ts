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
