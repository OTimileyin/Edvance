import { GoogleGenAI } from "@google/genai";
import { optionalEnv } from "@/lib/env";
import { TRUNCATED_CODE, TRUNCATED_MESSAGE, retryTruncated, truncationError } from "./truncation";
import { AiProviderError, type AiRequest, type AiResponse, type EvidenceChunk } from "./types";

/**
 * The one AI provider Oyevolve uses: Google Gemini, called only from the server.
 *
 * Browser code must never import this module. The API key lives in Infisical
 * (`GEMINI_API_KEY`) and is read here, never sent to a client, and never logged.
 *
 * `OYEVOLVE_AI_MOCK` selects a deterministic, evidence-grounded test provider.
 * It exists so the analysis pipeline can be exercised end-to-end without a key
 * or a network call, and it is refused outright in production builds — a mock
 * can never answer a real learner in production.
 */

const DEFAULT_MODEL = "gemini-3.6-flash";

/** The model id, overridable so a deployment can pin a specific version. */
export function aiModelName(): string {
  return optionalEnv("GEMINI_MODEL") ?? DEFAULT_MODEL;
}

/** True when the deterministic test provider is active (never in production). */
export function isMockProvider(): boolean {
  return process.env.NODE_ENV !== "production" && Boolean(optionalEnv("OYEVOLVE_AI_MOCK"));
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
 * The output cap for one generation.
 *
 * This is deliberately far larger than an analysis needs (~1k tokens for a
 * six-chunk course, measured): a real course may need an order of magnitude
 * more, and a cap that is merely big enough for the fixture is how the JSON
 * answer came back cut off mid-object in the first place. Measured on the live
 * provider with the old 8192 cap: a realistic six-chunk course returned
 * `finishReason=MAX_TOKENS` after 315 visible tokens, intermittently, and the
 * pipeline could only report it as JSON it could not parse. 32768 is the largest
 * value measured as accepted by the pinned model.
 */
const MAX_OUTPUT_TOKENS = 32_768;

/**
 * Thinking is switched off for structured extraction.
 *
 * Thinking was the cause of the truncation: on this model reasoning tokens and
 * the answer are drawn from the same `maxOutputTokens` cap, so a long
 * deliberation left the JSON answer cut off mid-object. Measurements on the
 * live provider, same evidence and prompt, interleaved so throttling drift could
 * not masquerade as a configuration effect:
 *
 *   thinkingBudget 0     5.0s /  4.7s   thoughts      0   answer ~1000 tokens
 *   thinkingBudget 4096   184s         thoughts 31_453   answer ~726 tokens
 *
 * The second run was ignored by the model and came within 600 tokens of the cap
 * — a nonzero thinking allowance cannot be relied on to stay bounded, which is
 * why only `0` is used and why the cap below is left generous. Both settings
 * returned the same six evidence-backed concepts, so nothing measurable is lost
 * by not thinking here: the evidence is already in the prompt and the answer is
 * schema-constrained.
 */
const THINKING_BUDGET = 0;

/**
 * One provider call. Separated from `generateStructured` so a cut-short answer
 * can be re-asked without re-reading configuration or rebuilding the request.
 */
async function requestOnce(apiKey: string, model: string, request: AiRequest): Promise<AiResponse> {
  const response = await geminiClient(apiKey).models.generateContent({
    model,
    contents: request.userPrompt,
    config: {
      systemInstruction: request.systemInstruction,
      responseMimeType: "application/json",
      responseJsonSchema: request.jsonSchema,
      temperature: 0.2,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      thinkingConfig: { thinkingBudget: THINKING_BUDGET },
    },
  });

  // Completeness is judged before anything else. A cut-short answer still has
  // text — a JSON object missing its closing brace — so letting it through
  // would surface as a syntax error further down and record a cause that is not
  // the true one.
  const truncated = truncationError({ finishReason: response.candidates?.[0]?.finishReason });
  if (truncated) throw truncated;

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
}

/**
 * Sends one structured-generation request and returns the raw JSON text.
 *
 * Failures are normalised to `AiProviderError` with a short code and a
 * user-safe summary; the raw provider error is never surfaced to a learner.
 */
export async function generateStructured(request: AiRequest): Promise<AiResponse> {
  if (isMockProvider()) {
    const response = mockGenerate(request);
    if ((request.kind ?? "course") === "course") {
      // Keep the test provider on the same identity contract as Gemini.
      try {
        const output = JSON.parse(response.text);
        for (const concept of output.concepts ?? []) {
          if (request.mockScenario === "null-concept-ids") {
            concept.id = null;
            concept.name = `  ${concept.name.toUpperCase().replace(/\s+/g, " \t ")}  `;
            continue;
          }
          concept.id =
            request.existingConcepts?.find(
              (existing) =>
                existing.name.toLowerCase().trim() === concept.name.toLowerCase().trim(),
            )?.id ?? null;
        }
        response.text = JSON.stringify(output);
      } catch {
        /* Malformed-output scenarios must still reach the validator. */
      }
    }
    return response;
  }

  const apiKey = optionalEnv("GEMINI_API_KEY");
  if (!apiKey) {
    throw new AiProviderError(
      "ai-not-configured",
      "Course analysis is not configured on this server yet.",
    );
  }

  const model = aiModelName();
  try {
    // One automatic re-ask when the answer is cut short: the common case costs
    // no learner action, and it is bounded so a persistent failure cannot spend
    // the day's quota. Every other failure is thrown as-is.
    return await retryTruncated(() => requestOnce(apiKey, model, request));
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
// Deterministic test provider. Selected only by OYEVOLVE_AI_MOCK, and refused in
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

  return [...groups.values()].map((chunks, index) => ({
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
  }));
}

/** Maps the first spelled-out or numeric quantity in a question, e.g. "five" → 5. */
const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

function quantityIn(question: string): number | null {
  const match = /\b(one|two|three|four|five|six|seven|eight|nine|ten|\d{1,3})\b/i.exec(question);
  if (!match) return null;
  return /^\d+$/.test(match[1]) ? Number(match[1]) : (NUMBER_WORDS[match[1].toLowerCase()] ?? null);
}

/**
 * Deterministic assessment answer, derived from the concepts it was actually
 * given. It models the one inconsistency Oyevolve most wants to catch: a question
 * that asks for a number of items the evidence does not establish. Because it
 * only ever names supplied concept ids, the pipeline's validators accept it.
 */
function mockAssessment(
  request: AiRequest,
  scenario: string,
  usage: AiResponse["usage"],
): AiResponse {
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

/**
 * Deterministic revision answer: one practice question per supplied weak
 * concept, each citing a real supplied chunk. Every id it returns was given to
 * it, which is what the pipeline's validators then check.
 */
function mockRevision(
  request: AiRequest,
  scenario: string,
  usage: AiResponse["usage"],
): AiResponse {
  const concepts = request.concepts ?? [];
  const evidence = request.evidence ?? [];
  const json = (value: unknown) => ({ text: JSON.stringify(value), usage });

  if (scenario === "invalid-concept-id") {
    return json({
      questions: [
        {
          conceptId: "concept-does-not-exist",
          question: "A question about a concept that was never supplied.",
          rationale: "Fabricated.",
          sourceChunkId: evidence[0]?.id ?? "chunk-does-not-exist",
        },
      ],
    });
  }
  if (scenario === "invalid-chunk-id") {
    return json({
      questions: [
        {
          conceptId: concepts[0]?.id ?? "concept-does-not-exist",
          question: "A question citing evidence that does not exist.",
          rationale: "Fabricated evidence.",
          sourceChunkId: "chunk-does-not-exist",
        },
      ],
    });
  }
  if (scenario === "insufficient" || concepts.length === 0 || evidence.length === 0) {
    return json({ questions: [] });
  }

  return json({
    questions: concepts.map((concept, index) => ({
      conceptId: concept.id,
      question: `Practice ${concept.name}: explain it in your own words.`,
      rationale: `Exercises ${concept.name}, which you are currently working on.`,
      sourceChunkId: evidence[index % evidence.length].id,
    })),
  });
}

function mockGenerate(request: AiRequest): AiResponse {
  const scenario = request.mockScenario ?? optionalEnv("OYEVOLVE_AI_MOCK") ?? "simple";
  const usage = { model: `mock:${scenario}`, inputTokens: 0, outputTokens: 0 };

  if (scenario === "provider-failure") {
    throw new AiProviderError("provider-error", "The analysis service could not be reached.");
  }
  if (scenario === "truncated") {
    // Models the end of the bounded re-ask: both attempts were cut short, so the
    // run reports exactly what a real truncation reports — its own code and its
    // own honest summary — with no network call.
    throw new AiProviderError(TRUNCATED_CODE, TRUNCATED_MESSAGE);
  }
  if (scenario === "malformed") {
    return { text: "not json at all", usage };
  }
  if (request.kind === "assessment") {
    return mockAssessment(request, scenario, usage);
  }
  if (request.kind === "revision") {
    return mockRevision(request, scenario, usage);
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
      concepts,
      relationships,
      overallEvidenceStatus: concepts.length > 0 ? "SUPPORTED" : "INSUFFICIENT_EVIDENCE",
    }),
    usage,
  };
}
