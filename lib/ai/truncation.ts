import { AiProviderError } from "./types";

/**
 * What to do when the provider cuts its answer short.
 *
 * Gemini 3 Flash is a *thinking* model, and its reasoning tokens are drawn from
 * the same `maxOutputTokens` cap as the answer. On a course with enough evidence
 * the cap can be spent on thinking, so the JSON object came back cut off
 * mid-field. Nothing downstream could tell that apart from a model that wrote
 * bad JSON: `parseCourseIntelligence` threw `malformed-json`, the route recorded
 * `unverified-output`, and the learner read "the analysis service returned a
 * response Oyevolve could not verify" — a failure naming the wrong cause, with
 * only a button press to escape it.
 *
 * Two rules fix that, and both live here so they can be reasoned about and
 * unit-tested with no network, no credentials and no provider SDK:
 *
 *   1. `truncationError` judges the provider's own `finishReason`. A response
 *      stopped by `MAX_TOKENS` *is* a cut-short answer, and it is reported as
 *      exactly that, before any parser can mislabel it.
 *   2. `retryTruncated` re-asks once, automatically. Truncation is intermittent
 *      — the same evidence and the same prompt fit on one call and are cut off
 *      on the next — so a single re-ask fixes the common case without a human
 *      pressing anything. It is bounded because the pinned model's free tier
 *      allows 20 requests/day/model.
 */

/** The recorded code for an answer the provider cut short. */
export const TRUNCATED_CODE = "response-truncated";

/**
 * The provider's own stop reason for "the output cap was reached" (Gemini's
 * `FinishReason.MAX_TOKENS`). Compared as a string so this module stays free of
 * the provider SDK, which is what makes it testable offline.
 */
export const TRUNCATED_FINISH_REASON = "MAX_TOKENS";

/**
 * What the learner is told, in the product's voice: what happened, what Oyevolve
 * did about it, and the way forward. Never a raw provider string.
 */
export const TRUNCATED_MESSAGE =
  "The analysis service's answer was cut short before it finished, so Oyevolve discarded it rather than " +
  "keep a partial analysis. Use Retry analysis to ask again.";

/**
 * How many provider calls one generation may spend when its answer keeps being
 * cut short. Two: one re-ask is a real remedy exactly because truncation is
 * intermittent, and the free tier's 20 requests/day/model means a longer chain
 * could spend a learner's whole day's budget on one course.
 */
export const TRUNCATED_ATTEMPTS = 2;

/** The part of a provider response this module judges. */
export type Completion = {
  /** The provider's own reason for stopping, e.g. `STOP` or `MAX_TOKENS`. */
  finishReason?: string;
};

/**
 * The error to raise for an answer the provider cut short, or null when the
 * response stopped on its own terms and can be validated normally.
 *
 * A cut-short answer may still carry text — a JSON object missing its closing
 * brace — which is precisely the case that must not reach the parser, where it
 * would be rejected as a malformed answer.
 */
export function truncationError(completion: Completion): AiProviderError | null {
  if (completion.finishReason !== TRUNCATED_FINISH_REASON) return null;
  return new AiProviderError(TRUNCATED_CODE, TRUNCATED_MESSAGE);
}

/**
 * Runs one generation, re-asking when the provider cut the answer short.
 *
 * A failure that is not a truncation is rethrown untouched: a rejected response,
 * a blocked one or an outage is not repaired by asking the identical question
 * again, and the provider client already pins its own transport retries.
 */
export async function retryTruncated<T>(
  attempt: () => Promise<T>,
  options: { attempts?: number } = {},
): Promise<T> {
  const attempts = Math.max(1, Math.floor(options.attempts ?? TRUNCATED_ATTEMPTS));
  let cutShort: AiProviderError | null = null;
  for (let used = 0; used < attempts; used += 1) {
    try {
      return await attempt();
    } catch (error) {
      if (!(error instanceof AiProviderError) || error.code !== TRUNCATED_CODE) throw error;
      cutShort = error;
    }
  }
  // Every attempt was cut short. Report the truncation itself, never a parser's
  // second-hand opinion of it.
  throw cutShort ?? new AiProviderError(TRUNCATED_CODE, TRUNCATED_MESSAGE);
}
