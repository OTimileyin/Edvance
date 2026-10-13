import { test } from "node:test";
import assert from "node:assert/strict";

import { registerAppImports } from "../lib/app-modules.mjs";

// The truncation rules live in an application module, so teach this process the
// project's import style before loading it.
registerAppImports();
const { TRUNCATED_ATTEMPTS, TRUNCATED_CODE, TRUNCATED_MESSAGE, retryTruncated, truncationError } =
  await import("../../lib/ai/truncation.ts");
const { AiProviderError } = await import("../../lib/ai/types.ts");

/** A response as the provider reports it: only its stop reason matters here. */
const stopped = (finishReason) => ({ finishReason });

/** A cut-short answer, exactly as the provider layer raises it. */
const cutShort = () => new AiProviderError(TRUNCATED_CODE, TRUNCATED_MESSAGE);

test("a response that stopped on its own terms is not a truncation", () => {
  for (const finishReason of ["STOP", "SAFETY", "RECITATION", "FINISH_REASON_UNSPECIFIED", ""]) {
    assert.equal(truncationError(stopped(finishReason)), null, finishReason);
  }
  assert.equal(truncationError(stopped(undefined)), null, "no stop reason at all");
  assert.equal(truncationError({}), null, "an empty completion");
});

test("hitting the output cap is reported as a cut-short answer", () => {
  const error = truncationError(stopped("MAX_TOKENS"));
  assert.ok(error instanceof AiProviderError, "the pipeline records provider failures by instance");
  assert.equal(error.code, TRUNCATED_CODE);
  assert.equal(error.name, "AiProviderError");
});

test("its code names the cause, not a parser's second-hand opinion of it", () => {
  // The whole point of the diagnosis: a cut-off JSON object used to travel on
  // as `malformed-json` → `unverified-output`, which tells a learner nothing true.
  assert.notEqual(TRUNCATED_CODE, "unverified-output");
  assert.notEqual(TRUNCATED_CODE, "malformed-json");
  assert.equal(TRUNCATED_CODE, "response-truncated");
});

test("the summary says what happened, what Oyevolve did, and the way forward", () => {
  const { message } = cutShort();
  assert.match(message, /cut short/i, "names what happened");
  assert.match(message, /discarded/i, "says nothing partial was kept");
  assert.match(message, /Retry analysis/, "names the action that takes it forward");
  assert.doesNotMatch(
    message,
    /MAX_TOKENS|token|finishReason/,
    "no provider vocabulary reaches a learner",
  );
});

test("the re-ask is bounded, so one course cannot spend the day's quota", () => {
  // The pinned model's free tier allows 20 requests/day/model, which is why a
  // truncation may only ever cost one extra call.
  assert.equal(TRUNCATED_ATTEMPTS, 2);
});

test("a complete answer is returned as-is, with no second call", async () => {
  let calls = 0;
  const answer = await retryTruncated(async () => {
    calls += 1;
    return "complete";
  });
  assert.equal(answer, "complete");
  assert.equal(calls, 1);
});

test("a cut-short answer is re-asked, and the re-ask's answer is the one returned", async () => {
  let calls = 0;
  const answer = await retryTruncated(async () => {
    calls += 1;
    if (calls === 1) throw cutShort();
    return "second time lucky";
  });
  assert.equal(answer, "second time lucky");
  assert.equal(calls, 2);
});

test("an answer that is cut short twice fails as a truncation, after exactly two calls", async () => {
  let calls = 0;
  await assert.rejects(
    retryTruncated(async () => {
      calls += 1;
      throw cutShort();
    }),
    (error) => {
      assert.ok(error instanceof AiProviderError);
      assert.equal(error.code, TRUNCATED_CODE);
      assert.equal(error.message, TRUNCATED_MESSAGE);
      return true;
    },
  );
  assert.equal(calls, TRUNCATED_ATTEMPTS);
});

test("a rejected answer is not re-asked: asking again cannot make it valid", async () => {
  let calls = 0;
  await assert.rejects(
    retryTruncated(async () => {
      calls += 1;
      throw new AiProviderError("provider-error", "The analysis service could not be reached.");
    }),
    (error) => error.code === "provider-error",
  );
  assert.equal(calls, 1, "one call, however transient the failure looked");
});

test("an unexpected error is not swallowed by the re-ask", async () => {
  let calls = 0;
  await assert.rejects(
    retryTruncated(async () => {
      calls += 1;
      throw new TypeError("a defect, not a provider failure");
    }),
    (error) => error instanceof TypeError,
  );
  assert.equal(calls, 1);
});

test("the bound can be tightened, and can never be removed", async () => {
  let calls = 0;
  await assert.rejects(
    retryTruncated(
      async () => {
        calls += 1;
        throw cutShort();
      },
      { attempts: 1 },
    ),
    (error) => error.code === TRUNCATED_CODE,
  );
  assert.equal(calls, 1, "attempts: 1 means a single call");

  calls = 0;
  await assert.rejects(
    retryTruncated(
      async () => {
        calls += 1;
        throw cutShort();
      },
      { attempts: 0 },
    ),
    (error) => error.code === TRUNCATED_CODE,
  );
  assert.equal(calls, 1, "zero attempts is still one call, never none");
});
