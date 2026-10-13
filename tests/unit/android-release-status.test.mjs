import { test } from "node:test";
import assert from "node:assert/strict";

import {
  RELEASE_STATE_MAX_AGE_SECONDS,
  checkReleaseAvailability,
  releaseStateForStatus,
} from "../../lib/android-release-status.ts";

const APK_URL = "https://github.com/owner/repo/releases/download/android-v1/oyevolve-1.apk";

/** A `fetch` that answers with one status, recording what it was asked. */
function answering(status, calls = []) {
  return async (url, init) => {
    calls.push({ url, init });
    return { status };
  };
}

test("a 2xx is evidence the release is there", () => {
  assert.equal(releaseStateForStatus(200), "published");
  assert.equal(releaseStateForStatus(206), "published");
});

test("404 and 410 are evidence it is not", () => {
  assert.equal(releaseStateForStatus(404), "missing");
  assert.equal(releaseStateForStatus(410), "missing");
});

test("anything else is not evidence either way", () => {
  for (const status of [301, 302, 403, 429, 500, 503]) {
    assert.equal(releaseStateForStatus(status), "unknown", `status ${status}`);
  }
});

test("asks with HEAD and follows the redirect to the object store", async () => {
  const calls = [];
  assert.equal(
    await checkReleaseAvailability(APK_URL, { fetchImpl: answering(200, calls) }),
    "published",
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, APK_URL);
  assert.equal(calls[0].init.method, "HEAD");
  assert.equal(calls[0].init.redirect, "follow");
});

test("carries no signal, because Next.js will not cache a request that has one", async () => {
  const calls = [];
  await checkReleaseAvailability(APK_URL, { fetchImpl: answering(404, calls) });
  assert.equal(calls[0].init.signal, undefined);
});

test("the answer is cached for a bounded window, not re-asked per visit", async () => {
  const calls = [];
  await checkReleaseAvailability(APK_URL, { fetchImpl: answering(200, calls) });
  assert.equal(calls[0].init.next.revalidate, RELEASE_STATE_MAX_AGE_SECONDS);
  // Next.js ignores `cache` when it sits next to `next.revalidate`, and an
  // uncached request is what renders this route per request instead of once per
  // window. Pinned because that failure is invisible: the page still works, it
  // is simply no longer static.
  assert.equal(calls[0].init.cache, undefined);
});

test("a 404 from the release host reads as missing", async () => {
  assert.equal(await checkReleaseAvailability(APK_URL, { fetchImpl: answering(404) }), "missing");
});

test("a 5xx is not read as missing", async () => {
  assert.equal(await checkReleaseAvailability(APK_URL, { fetchImpl: answering(503) }), "unknown");
});

test("a network failure is not read as missing", async () => {
  const failing = async () => {
    throw new TypeError("fetch failed");
  };
  assert.equal(await checkReleaseAvailability(APK_URL, { fetchImpl: failing }), "unknown");
});

test("a host that never answers times out rather than hanging the page", async () => {
  let answeredLate = false;
  const hanging = () =>
    new Promise((resolve) => {
      // Answers long after the deadline, to prove that a late arrival cannot
      // reach back into a page that has already rendered.
      setTimeout(() => {
        answeredLate = true;
        resolve({ status: 200 });
      }, 300);
    });
  const started = Date.now();
  assert.equal(
    await checkReleaseAvailability(APK_URL, { fetchImpl: hanging, timeoutMs: 30 }),
    "unknown",
  );
  assert.ok(Date.now() - started < 250, "gave up on time instead of waiting it out");
  await new Promise((resolve) => setTimeout(resolve, 350));
  assert.equal(answeredLate, true);
});
