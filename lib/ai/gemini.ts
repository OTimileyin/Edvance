import { GoogleGenAI } from "@google/genai";
import { optionalEnv } from "@/lib/env";
import { AiProviderError, type AiRequest, type AiResponse, type EvidenceChunk } from "./types";

/**
 * The one AI provider Edvance uses: Google Gemini, called only from the server.
 *
 * Browser code must never import this module. The API key lives in Infisical
 * (`GEMINI_API_KEY`) and is read here, never sent to a client, and never logged.
 *
 * `EDVANCE_AI_MOCK` selects a deterministic, evidence-grounded test provider.
 * It exists so the analysis pipeline can be exercised end-to-end without a key
 * or a network call, and it is refused outright in production builds — a mock
 * can never answer a real learner in production.
 */

const DEFAULT_MODEL = "gemini-flash-latest";

/** The model id, overridable so a deployment can pin a specific version. */
export function aiModelName(): string {
  return optionalEnv("GEMINI_MODEL") ?? DEFAULT_MODEL;
}

/** True when the deterministic test provider is active (never in production). */
export function isMockProvider(): boolean {
  return process.env.NODE_ENV !== "production" && Boolean(optionalEnv("EDVANCE_AI_MOCK"));
}

/** Whether course analysis can run at all: a key, or the test provider. */
export function isAiConfigured(): boolean {
  return isMockProvider() || Boolean(optionalEnv("GEMINI_API_KEY"));
}

let client: GoogleGenAI | null = null;

function geminiClient(apiKey: string): GoogleGenAI {
  // Memoised so repeated analyses reuse one HTTP client. The key is captured
  // once and never re-read or exposed.
  client ??= new GoogleGenAI({ apiKey, httpOptions: { retryOptions: { ...PROVIDER_RETRY } } });
  return client;
}

/**
 * Retry policy for transient provider failures (capacity 503s, rate-limit
 * 429s, gateway 5xx). The SDK retries by default, but its default is up to
 * five attempts with delays growing to a minute — far too generous for a
 * learner waiting on a button, and wasteful of a free-tier quota. We pin it
 * explicitly: at most three HTTP attempts per analysis, with a short capped
 * backoff. A non-transient error is never retried.
 */
const PROVIDER_RETRY = {
  attempts: 3,
  initialDelay: 1,
  maxDelay: 8,
  expBase: 2,
  jitter: 1,
} as const;

/**
 * Sends one structured-generation request and returns the raw JSON text.
 *
 * Failures are normalised to `AiProviderError` with a short code and a
 * user-safe summary; the raw provider error is never surfaced to a learner.
 */
export async function generateStructured(request: AiRequest): Promise<AiResponse> {
  if (isMockProvider()) return mockGenerate(request);

  const apiKey = optionalEnv("GEMINI_API_KEY");
  if (!apiKey) {
    throw new AiProviderError(
      "ai-not-configured",
      "Course analysis is not configured on this server yet.",
    );
  }

  const model = aiModelName();
  try {
    const response = await geminiClient(apiKey).models.generateContent({
      model,
      contents: request.userPrompt,
      config: {
        systemInstruction: request.systemInstruction,
        responseMimeType: "application/json",
        responseJsonSchema: request.jsonSchema,
        temperature: 0.2,
        maxOutputTokens: 8192,
      },
    });

    const text = response.text;
    if (!text) {
      throw new AiProviderError("empty-response", "The analysis service returned nothing.");
    }

    const usage = response.usageMetadata;
    return {
      text,
      usage: {
        model,
        inputTokens: usage?.promptTokenCount ?? undefined,
        outputTokens: usage?.candidatesTokenCount ?? undefined,
      },
    };
  } catch (error) {
    if (error instanceof AiProviderError) throw error;
    // Transient retries are handled by the SDK's pinned policy above. Only the
    // status is reported — never the prompt or the response body.
    const status = (error as { status?: number }).status;
    throw new AiProviderError(
      "provider-error",
      status
        ? `The analysis service rejected the request (${status}).`
        : "The analysis service could not be reached.",
    );
  }
}

// ---------------------------------------------------------------------------
// Deterministic test provider. Selected only by EDVANCE_AI_MOCK, and refused in
// production. It derives concepts from the supplied evidence so every citation
// it makes is real, which is exactly what the pipeline's validators expect.
// ---------------------------------------------------------------------------

/** A short display label for a chunk: its section heading, else its opening words. */
function labelFor(chunk: EvidenceChunk): string {
  const section = /^Section:\s*(.+)$/i.exec(chunk.sourceLocation);
  if (section) return section[1].trim();
  const words = chunk.content.replace(/\s+/g, " ").trim().split(" ").slice(0, 8).join(" ");
  return words || chunk.sourceLocation;
}

function firstSentence(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  const match = /^(.{20,240}?[.!?])(\s|$)/.exec(normalized);
  return (match ? match[1] : normalized.slice(0, 240)).trim();
}

function mockConceptsFor(evidence: EvidenceChunk[]) {
  // Group by label so a concept taught in two materials (two chunks) becomes
  // one concept with evidence from both — the multi-source case.
  const groups = new Map<string, EvidenceChunk[]>();
  for (const chunk of evidence) {
    const label = labelFor(chunk);
    const list = groups.get(label.toLowerCase()) ?? [];
    list.push(chunk);
    groups.set(label.toLowerCase(), list);
  }

  return [...groups.entries()].map(([key, chunks], index) => ({
    key: `c${index + 1}`,
    name: labelFor(chunks[0]),
    instructorTerm: labelFor(chunks[0]),
    definition: firstSentence(chunks[0].content),
    evidenceStatus: "SUPPORTED" as const,
    confidence: 0.9,
    evidence: chunks.map((chunk) => ({
      chunkId: chunk.id,
      rationale: `The ${chunk.sourceLocation} chunk states this.`,
    })),
    _key: key,
  }));
}

/** Maps the first spelled-out or numeric quantity in a question, e.g. "five" → 5. */
const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

function quantityIn(question: string): number | null {
  const match = /\b(one|two|three|four|five|six|seven|eight|nine|ten|\d{1,3})\b/i.exec(question);
  if (!match) return null;
  return /^\d+$/.test(match[1]) ? Number(match[1]) : (NUMBER_WORDS[match[1].toLowerCase()] ?? null);
}

/**
 * Deterministic assessment answer, derived from the concepts it was actually
 * given. It models the one inconsistency Edvance most wants to catch: a question
 * that asks for a number of items the evidence does not establish. Because it
 * only ever names supplied concept ids, the pipeline's validators accept it.
 */
function mockAssessment(request: AiRequest, scenario: string, usage: AiResponse["usage"]): AiResponse {
  const concepts = request.concepts ?? [];
  const question = request.question ?? "";
  const json = (value: unknown) => ({ text: JSON.stringify(value), usage });
  const tested = concepts.map((concept) => ({
    conceptId: concept.id,
    why: `The question exercises ${concept.name}.`,
  }));

  if (scenario === "invalid-concept-id") {
    return json({
      testedConcepts: [{ conceptId: "concept-does-not-exist", why: "Fabricated evidence." }],
      consistency: "CONSISTENT",
      reason: "A claim with no evidence behind it.",
      nextAction: "Nothing to do.",
    });
  }
  if (scenario === "unjustified-inconsistency") {
    return json({
      testedConcepts: [],
      consistency: "POSSIBLE_INCONSISTENCY",
      reason: "The question seems wrong, but no evidence is cited.",
      nextAction: "Nothing to do.",
    });
  }
  if (scenario === "insufficient" || concepts.length === 0) {
    return json({
      testedConcepts: [],
      consistency: "INSUFFICIENT_EVIDENCE",
      reason: "The course does not yet teach enough to judge this question.",
      nextAction: "Add material that covers this question.",
    });
  }

  const asked = quantityIn(question);
  if (asked !== null && asked !== concepts.length) {
    return json({
      testedConcepts: tested,
      consistency: "POSSIBLE_INCONSISTENCY",
      reason: `The question asks for ${asked} while the course evidence establishes ${concepts.length} (${concepts
        .map((concept) => concept.name)
        .join(", ")}).`,
      nextAction: "Review the material this question is based on before attempting it.",
    });
  }

  return json({
    testedConcepts: tested,
    consistency: "CONSISTENT",
    reason: `The evidence teaches the concepts this question covers: ${concepts
      .map((concept) => concept.name)
      .join(", ")}.`,
    nextAction: "Attempt the question and compare your answer with the evidence.",
  });
}

function mockGenerate(request: AiRequest): AiResponse {
  const scenario = request.mockScenario ?? optionalEnv("EDVANCE_AI_MOCK") ?? "simple";
  const usage = { model: `mock:${scenario}`, inputTokens: 0, outputTokens: 0 };

  if (scenario === "provider-failure") {
    throw new AiProviderError("provider-error", "The analysis service could not be reached.");
  }
  if (scenario === "malformed") {
    return { text: "not json at all", usage };
  }
  if (request.kind === "assessment") {
    return mockAssessment(request, scenario, usage);
  }
  if (scenario === "invalid-chunk-id") {
    const concepts = mockConceptsFor(request.evidence).slice(0, 1);
    return {
      text: JSON.stringify({
        concepts: [
          {
            key: "c1",
            name: concepts[0]?.name ?? "Unknown concept",
            instructorTerm: concepts[0]?.instructorTerm ?? "Unknown concept",
            definition: "A concept the model claims to have found.",
            evidenceStatus: "SUPPORTED",
            confidence: 0.8,
            evidence: [{ chunkId: "chunk-does-not-exist", rationale: "Fabricated evidence." }],
          },
        ],
        relationships: [],
        overallEvidenceStatus: "SUPPORTED",
      }),
      usage,
    };
  }
  if (scenario === "insufficient") {
    return {
      text: JSON.stringify({
        concepts: [
          {
            key: "c1",
            name: "Unverified claim",
            instructorTerm: "Unverified claim",
            definition: "",
            evidenceStatus: "INSUFFICIENT_EVIDENCE",
            confidence: 0,
            evidence: [],
          },
        ],
        relationships: [],
        overallEvidenceStatus: "INSUFFICIENT_EVIDENCE",
      }),
      usage,
    };
  }
  if (scenario === "duplicate") {
    const base = mockConceptsFor(request.evidence)[0];
    const one = {
      key: "c1",
      name: base?.name ?? "Concept",
      instructorTerm: base?.instructorTerm ?? "Concept",
      definition: "First mention.",
      evidenceStatus: "SUPPORTED",
      confidence: 0.9,
      evidence: base ? [{ chunkId: base.evidence[0].chunkId, rationale: "Mentioned here." }] : [],
    };
    return {
      text: JSON.stringify({
        concepts: [one, { ...one, key: "c2", definition: "Second mention of the same concept." }],
        relationships: [],
        overallEvidenceStatus: "SUPPORTED",
      }),
      usage,
    };
  }

  const concepts = mockConceptsFor(request.evidence);
  const relationships =
    concepts.length >= 2
      ? [
          {
            fromKey: concepts[0].key,
            toKey: concepts[1].key,
            kind: "related_to" as const,
            justification: "The course introduces them together in the same lesson.",
          },
        ]
      : [];

  return {
    text: JSON.stringify({
      concepts: concepts.map(({ _key: _ignored, ...concept }) => concept),
      relationships,
      overallEvidenceStatus: concepts.length > 0 ? "SUPPORTED" : "INSUFFICIENT_EVIDENCE",
    }),
    usage,
  };
}
