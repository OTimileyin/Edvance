import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveMastery, explainMastery } from "../../lib/mastery.ts";

const attempts = (...correctFlags) => correctFlags.map((correct) => ({ correct }));

test("no attempts is Untested with a zero score", () => {
  assert.deepEqual(deriveMastery([]), {
    status: "Untested",
    score: 0,
    attemptCount: 0,
    correctCount: 0,
  });
});

test("a single wrong attempt is Weak", () => {
  const result = deriveMastery(attempts(false));
  assert.equal(result.status, "Weak");
  assert.equal(result.score, 0);
});

test("a single correct attempt is Developing, never Mastered", () => {
  const result = deriveMastery(attempts(true));
  assert.equal(result.status, "Developing");
  assert.equal(result.score, 100);
});

test("fewer than half correct is Weak at 0.5 accuracy boundary", () => {
  // 1 of 3 = 33% -> Weak.
  assert.equal(deriveMastery(attempts(true, false, false)).status, "Weak");
});

test("exactly half correct is Developing", () => {
  assert.equal(deriveMastery(attempts(true, false)).status, "Developing");
});

test("80% over three attempts is Mastered", () => {
  const result = deriveMastery(attempts(true, true, true));
  assert.equal(result.status, "Mastered");
  assert.equal(result.score, 100);
});

test("accuracy below 80% is not Mastered even with many attempts", () => {
  // 3 of 4 = 75% -> Developing.
  assert.equal(deriveMastery(attempts(true, true, true, false)).status, "Developing");
});

test("exactly 80% is the Mastered threshold", () => {
  // 4 of 5 = 80% -> Mastered.
  assert.equal(deriveMastery(attempts(true, true, true, true, false)).status, "Mastered");
});

test("fewer than three attempts can never be Mastered", () => {
  assert.equal(deriveMastery(attempts(true, true)).status, "Developing");
});

test("score is the rounded percentage of correct attempts", () => {
  assert.equal(deriveMastery(attempts(true, true, false)).score, 67);
});

test("explainMastery describes the attempt trail", () => {
  assert.match(explainMastery("Untested", 0, 0), /No practice recorded/);
  assert.match(explainMastery("Developing", 2, 1), /1 of 2/);
  assert.match(explainMastery("Mastered", 5, 4), /Mastery earned/);
});
