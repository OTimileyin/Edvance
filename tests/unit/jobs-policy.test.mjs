import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BASE_BACKOFF_MS,
  JOB_TIMEOUT_MS,
  MAX_ATTEMPTS,
  MAX_BACKOFF_MS,
  STALE_LOCK_MS,
  backoffMs,
  claimOrder,
  dedupeKey,
  isRetryableFailure,
  isStaleLock,
  nextRunAfter,
  queueLine,
  queueState,
  summariseQueue,
} from "../../lib/jobs/policy.ts";

/**
 * The queue's rules are the part of background work that fails invisibly: a
 * course analysed twice, a job retried forever, a lock stolen while it is still
 * held. They are pure functions so they can be pinned here, where a mistake is a
 * failing test rather than something a learner notices weeks later.
 */

const T0 = new Date("2026-10-12T10:00:00.000Z");

function at(offsetMs) {
  return new Date(T0.getTime() + offsetMs);
}

test("a job is coalesced per material for reading, and per course for analysis", () => {
  // Reading is per file: five uploads must produce five reads, or four files
  // would never be read at all.
  assert.equal(dedupeKey("ingest", { courseId: "c1", targetId: "m1" }), "ingest:material:m1");
  assert.notEqual(
    dedupeKey("ingest", { courseId: "c1", targetId: "m1" }),
    dedupeKey("ingest", { courseId: "c1", targetId: "m2" }),
  );

  // Analysis reads every material, so it is per course: ten files landing
  // together are one analysis, not ten model calls.
  assert.equal(dedupeKey("analyse", { courseId: "c1" }), "analyse:course:c1");
  assert.notEqual(
    dedupeKey("analyse", { courseId: "c1" }),
    dedupeKey("analyse", { courseId: "c2" }),
  );

  // A check is about one question, so two questions never merge.
  assert.equal(dedupeKey("check", { courseId: "c1", targetId: "q1" }), "check:question:q1");
  assert.notEqual(
    dedupeKey("check", { courseId: "c1", targetId: "q1" }),
    dedupeKey("check", { courseId: "c1", targetId: "q2" }),
  );

  // Different kinds never collide, even on the same course.
  assert.notEqual(
    dedupeKey("analyse", { courseId: "c1" }),
    dedupeKey("revision", { courseId: "c1" }),
  );
});

test("a job that must name its target says so instead of queueing something unusable", () => {
  assert.throws(() => dedupeKey("ingest", { courseId: "c1" }), /must name the material/);
  assert.throws(
    () => dedupeKey("check", { courseId: "c1", targetId: null }),
    /must name the question/,
  );
});

test("backoff doubles each attempt and stops at the ceiling", () => {
  assert.equal(backoffMs(0), 0);
  assert.equal(backoffMs(1), BASE_BACKOFF_MS);
  assert.equal(backoffMs(2), BASE_BACKOFF_MS * 2);
  assert.equal(backoffMs(3), BASE_BACKOFF_MS * 4);
  // The cap matters: without it the ceiling climbs past any useful wait.
  assert.equal(backoffMs(20), MAX_BACKOFF_MS);
  assert.ok(backoffMs(20) <= MAX_BACKOFF_MS);
});

test("the next attempt is scheduled relative to now, not to the failure", () => {
  assert.equal(nextRunAfter(1, T0).toISOString(), at(BASE_BACKOFF_MS).toISOString());
  assert.equal(nextRunAfter(2, T0).toISOString(), at(BASE_BACKOFF_MS * 2).toISOString());
});

test("a lock is stale only once it has been held past the threshold", () => {
  assert.equal(isStaleLock(null, T0), false, "an unclaimed job is not stale");
  assert.equal(isStaleLock(undefined, T0), false);
  assert.equal(isStaleLock(T0.toISOString(), T0), false, "just claimed");
  assert.equal(isStaleLock(at(-STALE_LOCK_MS + 1), T0), false, "a millisecond short");
  assert.equal(isStaleLock(at(-STALE_LOCK_MS), T0), true, "exactly at the threshold");
  assert.equal(isStaleLock(at(-STALE_LOCK_MS * 2), T0), true);
});

test("only failures that could plausibly succeed are retried", () => {
  // A file with no text, a corrupt archive, an encrypted document: these fail
  // identically every time, so retrying wastes the learner's time and reports
  // the same thing three attempts later.
  for (const code of [
    "empty-content",
    "corrupt-file",
    "malformed-transcript",
    "unsupported-format",
    "material-missing",
    "no-handler",
  ]) {
    assert.equal(isRetryableFailure(code), false, `${code} should be permanent`);
  }

  // Storage hiccups and unexplained errors may well work next time.
  for (const code of ["storage-unavailable", "extraction-failed", "worker-error", "stale-lock"]) {
    assert.equal(isRetryableFailure(code), true, `${code} should be retryable`);
  }
  assert.equal(isRetryableFailure(null), true);
  assert.equal(isRetryableFailure(undefined), true);
  assert.equal(isRetryableFailure("something-new"), true, "an unknown code is bounded by attempts");
});

test("claims take the oldest due job, and the order is total", () => {
  const a = { id: "a", runAfter: at(0), createdAt: at(0) };
  const b = { id: "b", runAfter: at(-1000), createdAt: at(5000) };
  const c = { id: "c", runAfter: at(0), createdAt: at(-1000) };

  // Due time dominates: the job that has been waiting longest runs first, even
  // if it was enqueued last.
  assert.ok(claimOrder(b, a) < 0, "the older due time wins");
  assert.ok(claimOrder(c, a) < 0, "same due time: the older enqueue wins");
  assert.ok(claimOrder(a, a) === 0);
  assert.ok(
    claimOrder(
      { id: "a", runAfter: at(0), createdAt: at(0) },
      { id: "b", runAfter: at(0), createdAt: at(0) },
    ) < 0,
  );

  const sorted = [a, b, c]
    .slice()
    .sort(claimOrder)
    .map((job) => job.id);
  assert.deepEqual(sorted, ["b", "c", "a"]);
});

test("the queue counts what is happening, what is retrying, and what is waiting", () => {
  const entries = [
    { kind: "ingest", status: "running", runAfter: at(-1000), errorCode: null },
    { kind: "ingest", status: "pending", runAfter: at(-1), errorCode: null },
    { kind: "analyse", status: "pending", runAfter: at(5000), errorCode: "storage-unavailable" },
    { kind: "revision", status: "pending", runAfter: at(5000), errorCode: null },
    { kind: "check", status: "failed", runAfter: at(0), errorCode: "empty-content" },
    { kind: "grade", status: "done", runAfter: at(0), errorCode: null },
  ];

  assert.deepEqual(summariseQueue(entries, T0), {
    active: 2,
    retrying: 1,
    waiting: 1,
    failed: 1,
  });
});

test("nothing outstanding says nothing", () => {
  assert.deepEqual(summariseQueue([], T0), { active: 0, retrying: 0, waiting: 0, failed: 0 });
  assert.equal(queueLine([], T0), null);
  assert.deepEqual(queueState([], T0), {
    active: 0,
    retrying: 0,
    waiting: 0,
    failed: 0,
    line: null,
  });

  // Finished work and a terminal failure are both quiet here on purpose: the
  // failed row itself carries the reason, and re-announcing it would double it.
  const quiet = [
    { kind: "grade", status: "done", runAfter: at(0), errorCode: null },
    { kind: "check", status: "failed", runAfter: at(0), errorCode: "corrupt-file" },
  ];
  assert.equal(queueLine(quiet, T0), null);
});

test("the queue sentence says which of the three things is true, in plain words", () => {
  const one = queueLine(
    [{ kind: "ingest", status: "running", runAfter: at(0), errorCode: null }],
    T0,
  );
  assert.equal(one, "Oyevolve is working on 1 step.");

  const many = queueLine(
    [
      { kind: "ingest", status: "running", runAfter: at(0), errorCode: null },
      { kind: "analyse", status: "pending", runAfter: at(-5), errorCode: null },
    ],
    T0,
  );
  assert.equal(many, "Oyevolve is working on 2 steps.");

  const retrying = queueLine(
    [{ kind: "ingest", status: "pending", runAfter: at(3000), errorCode: "storage-unavailable" }],
    T0,
  );
  assert.equal(retrying, "1 step is waiting to be tried again after a failure.");

  const waiting = queueLine(
    [
      { kind: "analyse", status: "pending", runAfter: at(3000), errorCode: null },
      { kind: "revision", status: "pending", runAfter: at(3000), errorCode: null },
    ],
    T0,
  );
  assert.equal(waiting, "2 steps are queued for later.");

  const both = queueLine(
    [
      { kind: "ingest", status: "running", runAfter: at(0), errorCode: null },
      { kind: "analyse", status: "pending", runAfter: at(3000), errorCode: "storage-unavailable" },
    ],
    T0,
  );
  assert.equal(
    both,
    "Oyevolve is working on 1 step · 1 step is waiting to be tried again after a failure.",
  );
});

test("the attempt ceiling is what actually stops a retry loop", () => {
  // Retryability alone is unbounded; the policy's limit is the guard rail, so it
  // has to be a real number and a small one.
  assert.ok(Number.isInteger(MAX_ATTEMPTS));
  assert.ok(MAX_ATTEMPTS >= 2 && MAX_ATTEMPTS <= 5);
});

test("a lock is only stealable once no attempt could still be running", () => {
  // The reclaim sweep exists for a process that died holding a row, and a row
  // nobody is working on is a learner watching "Queued to be read". It must never
  // take a row a live attempt could still be in — `withTimeout` stops waiting
  // after JOB_TIMEOUT_MS — and it must not leave that row for minutes either.
  assert.equal(isStaleLock(at(-JOB_TIMEOUT_MS), T0), false, "a first attempt is never stolen");
  assert.ok(STALE_LOCK_MS > JOB_TIMEOUT_MS, "a lock must outlast the attempt it protects");
  assert.ok(STALE_LOCK_MS <= 4 * JOB_TIMEOUT_MS, "a stranded row must not be left for minutes");
  assert.ok(STALE_LOCK_MS >= 60_000, "a lock must be old before it is stolen");
});

test("a hung attempt is bounded, and bounded generously", () => {
  // A handler that never settles must not hold the loop forever, but the bound
  // has to clear the slowest real work — extracting a 25 MB document.
  assert.ok(Number.isInteger(JOB_TIMEOUT_MS));
  assert.ok(JOB_TIMEOUT_MS >= 30_000, "too tight: real extraction would time out");
  assert.ok(JOB_TIMEOUT_MS <= 5 * 60_000, "too loose: a hung job stalls the loop for minutes");
  // A hang must outlast the lock threshold's order of magnitude, not precede it,
  // or a job would be reclaimed as stale while its first attempt is still running.
  assert.ok(JOB_TIMEOUT_MS < STALE_LOCK_MS);
});
