import { NextResponse } from "next/server";
import { isMockProvider } from "./ai/gemini";
import { appRateLimiter, type RateLimitRule } from "./rate-limit";

/**
 * Applies a rate limit to a learner-triggered action and returns the 429 the
 * route should send when the limit is exceeded, or null when the request may
 * proceed. Keys are always scoped to the signed-in learner, so one learner can
 * never exhaust another's budget.
 *
 * The unit-testable policy lives in `lib/rate-limit.ts`; this module is the thin
 * HTTP adapter and is the only place that imports Next.
 */
export function rateLimit(
  bucket: string,
  userId: string,
  rule: RateLimitRule,
): NextResponse | null {
  // The deterministic test provider makes no external calls, so there is
  // nothing to protect and the suites may run their many requests unthrottled.
  // Production can never take this branch (the mock is refused there), so real
  // limits are always enforced for a real learner.
  if (isMockProvider()) return null;

  const result = appRateLimiter.check(`${bucket}:${userId}`, rule);
  if (result.ok) return null;
  return NextResponse.json(
    {
      error: `You're doing that a little too quickly. Try again in ${result.retryAfterSeconds} second${
        result.retryAfterSeconds === 1 ? "" : "s"
      }.`,
    },
    { status: 429, headers: { "retry-after": String(result.retryAfterSeconds) } },
  );
}
