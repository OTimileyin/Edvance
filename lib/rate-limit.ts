/**
 * A small, dependency-free fixed-window rate limiter.
 *
 * Edvance runs as a single local process, so an in-memory limiter is honest and
 * sufficient: it protects the expensive, user-triggered actions (model calls,
 * uploads, account deletion) from accidental or abusive repetition. It is
 * deliberately pure — no framework imports — so it can be unit-tested, and a
 * deployment that runs multiple instances would swap the store without changing
 * the call sites.
 *
 * A window is fixed rather than sliding: once the first request in a window is
 * recorded, the window lasts `windowMs`. This is the simplest correct-enough
 * policy for this product and is easy to reason about.
 */

export type RateLimitRule = {
  /** How many requests are allowed per window. */
  limit: number;
  /** The window length in milliseconds. */
  windowMs: number;
};

export type RateLimitResult =
  { ok: true; remaining: number } | { ok: false; retryAfterSeconds: number };

export class RateLimiter {
  private readonly hits = new Map<string, number[]>();
  // Assigned explicitly rather than declared as a constructor parameter
  // property: that syntax needs a transform, and this module is unit-tested by
  // running the TypeScript directly under Node's type-stripping loader.
  private readonly now: () => number;

  constructor(now?: () => number) {
    this.now = now ?? (() => Date.now());
  }

  /** Records one request for `key` and reports whether it is allowed. */
  check(key: string, rule: RateLimitRule): RateLimitResult {
    const time = this.now();
    const windowStart = time - rule.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((timestamp) => timestamp > windowStart);

    if (recent.length >= rule.limit) {
      const oldest = recent[0];
      const retryAfterSeconds = Math.max(1, Math.ceil((oldest + rule.windowMs - time) / 1000));
      this.hits.set(key, recent);
      return { ok: false, retryAfterSeconds };
    }

    recent.push(time);
    this.hits.set(key, recent);
    return { ok: true, remaining: rule.limit - recent.length };
  }

  /** Clears all state; used by tests. */
  reset(): void {
    this.hits.clear();
  }
}

/**
 * The shared limiter for the running server. One process, one instance.
 */
export const appRateLimiter = new RateLimiter();

/** The limits that matter: expensive, learner-triggered actions. */
export const RATE_LIMITS = {
  /** A model call is the most expensive thing a learner can trigger. */
  ai: { limit: 12, windowMs: 60_000 },
  /** Uploads are bounded by size and course quota too; this is the burst guard. */
  upload: { limit: 20, windowMs: 60_000 },
  /** Recording practice is cheap but should not be scriptable without limit. */
  practice: { limit: 60, windowMs: 60_000 },
  /** Account deletion / changes are rare and consequential. */
  account: { limit: 5, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitRule>;
