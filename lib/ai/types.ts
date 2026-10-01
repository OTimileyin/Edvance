/**
 * Shared types for Edvance's server-only AI layer.
 *
 * Nothing here is React, database or environment aware: these are the shapes
 * the analysis pipeline passes around, so the provider wrapper, the prompt
 * builder and the validator can be reasoned about and tested in isolation.
 *
 * The model never returns Edvance's domain types directly. It returns a raw
 * *model* shape which is validated against the schema in `schemas.ts` and then
 * resolved against real stored evidence by `course-intelligence.ts`.
 */

/** One stored evidence chunk, as offered to the model. */
export type EvidenceChunk = {
  id: string;
  materialId: string;
  materialTitle: string;
  /** Human-readable location, e.g. "Page 7" or "00:04:12–00:04:38". */
  sourceLocation: string;
  content: string;
};

/** Which intelligence pipeline a request belongs to. Defaults to `course`. */
export type AiRequestKind = "course" | "assessment";

/** One analysed concept, as the deterministic provider sees it. */
export type AiConceptInput = { id: string; name: string };

/** A structured generation request handed to the provider. */
export type AiRequest = {
  /** Defaults to `course` when absent. */
  kind?: AiRequestKind;
  systemInstruction: string;
  userPrompt: string;
  /** A JSON Schema the response must conform to. */
  jsonSchema: unknown;
  /** The evidence the prompt was built from, so a mock provider can cite it. */
  evidence: EvidenceChunk[];
  /** Assessment requests only: the analysed concepts the prompt offered. */
  concepts?: AiConceptInput[];
  /** Assessment requests only: the question being judged. */
  question?: string;
  /**
   * Test-only: selects a deterministic scenario in the mock provider. Ignored
   * entirely unless the mock provider is active, which never happens in
   * production. Real provider calls never see this.
   */
  mockScenario?: string;
};

/** Safe usage metadata a provider may report; never contains prompt text. */
export type AiUsage = {
  model: string;
  inputTokens?: number;
  outputTokens?: number;
};

export type AiResponse = {
  /** The raw JSON text the model returned, before validation. */
  text: string;
  usage: AiUsage;
};

/**
 * A provider failure that is safe to record: a short machine code plus a
 * user-safe summary. Raw provider errors never reach the database or the UI.
 */
export class AiProviderError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "AiProviderError";
    this.code = code;
  }
}

/**
 * A model response that is structurally wrong: not JSON, missing fields, or a
 * value outside the allowed set. Always a rejection — never repaired silently.
 */
export class ModelOutputError extends Error {
  readonly reason: string;

  constructor(reason: string, message: string) {
    super(message);
    this.name = "ModelOutputError";
    this.reason = reason;
  }
}
