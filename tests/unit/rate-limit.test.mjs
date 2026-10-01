import { test } from "node:test";
import assert from "node:assert/strict";
import { RateLimiter } from "../../lib/rate-limit.ts";

const RULE = { limit: 3, windowMs: 1000 };

/** A limiter with a controllable clock. */
function withClock() {
  let time = 0;
  const limiter = new RateLimiter(() => time);
  return { limiter, advance: (ms) => (time += ms) };
}

test("allows requests up to the limit", () => {
  const { limiter } = withClock();
  assert.equal(limiter.check("a", RULE).ok, true);
  assert.equal(limiter.check("a", RULE).ok, true);
  assert.equal(limiter.check("a", RULE).ok, true);
});

test("rejects the request beyond the limit with a retry hint", () => {
  const { limiter } = withClock();
  for (let i = 0; i < 3; i += 1) limiter.check("a", RULE);
  const blocked = limiter.check("a", RULE);
  assert.equal(blocked.ok, false);
  assert.ok(blocked.retryAfterSeconds >= 1);
});

test("keys are independent", () => {
  const { limiter } = withClock();
  for (let i = 0; i < 3; i += 1) limiter.check("a", RULE);
  assert.equal(limiter.check("b", RULE).ok, true);
});

test("the window expiring frees the budget", () => {
  const { limiter, advance } = withClock();
  for (let i = 0; i < 3; i += 1) limiter.check("a", RULE);
  assert.equal(limiter.check("a", RULE).ok, false);
  advance(1001);
  assert.equal(limiter.check("a", RULE).ok, true);
});

test("a partial window keeps the earlier hits counted", () => {
  const { limiter, advance } = withClock();
  limiter.check("a", RULE);
  advance(500);
  limiter.check("a", RULE);
  limiter.check("a", RULE);
  // Three hits within 1000ms -> blocked.
  assert.equal(limiter.check("a", RULE).ok, false);
});

test("reset clears all state", () => {
  const { limiter } = withClock();
  for (let i = 0; i < 3; i += 1) limiter.check("a", RULE);
  limiter.reset();
  assert.equal(limiter.check("a", RULE).ok, true);
});
