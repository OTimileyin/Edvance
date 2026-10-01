import type { ConceptStatus } from "./types";

/**
 * The single, deterministic rule that turns a learner's real practice attempts
 * into a mastery status.
 *
 * Mastery is never assigned by a model and never invented: a concept with no
 * attempts is `Untested`, and every other status is a pure function of the
 * attempts behind it, so the same history always produces the same result.
 *
 *   Untested   — no attempts recorded yet.
 *   Weak       — attempts exist but fewer than half were correct.
 *   Developing — at least half were correct, but mastery is not yet earned.
 *   Mastered   — at least `MASTERY_ACCURACY` of attempts correct, over at least
 *                `MASTERY_MIN_ATTEMPTS` attempts. A single lucky answer can
 *                never crown a concept.
 */

/** Correct fraction required before a concept can be Mastered. */
export const MASTERY_ACCURACY = 0.8;

/** Attempts required before a concept can be Mastered, however accurate. */
export const MASTERY_MIN_ATTEMPTS = 3;

/** Correct fraction required to be Developing rather than Weak. */
export const DEVELOPING_ACCURACY = 0.5;

export interface MasteryAttempt {
  correct: boolean;
}

export interface MasteryResult {
  status: ConceptStatus;
  /** Percentage of correct attempts (0–100); 0 when untested. */
  score: number;
  attemptCount: number;
  correctCount: number;
}

/**
 * Derives one concept's mastery from its attempts alone. The caller supplies
 * every attempt for the learner and concept; order is irrelevant to the result.
 */
export function deriveMastery(attempts: MasteryAttempt[]): MasteryResult {
  const attemptCount = attempts.length;
  if (attemptCount === 0) {
    return { status: "Untested", score: 0, attemptCount: 0, correctCount: 0 };
  }

  const correctCount = attempts.filter((attempt) => attempt.correct).length;
  const accuracy = correctCount / attemptCount;
  const score = Math.round(accuracy * 100);

  let status: ConceptStatus;
  if (accuracy >= MASTERY_ACCURACY && attemptCount >= MASTERY_MIN_ATTEMPTS) {
    status = "Mastered";
  } else if (accuracy >= DEVELOPING_ACCURACY) {
    status = "Developing";
  } else {
    status = "Weak";
  }

  return { status, score, attemptCount, correctCount };
}

/** A short, honest explanation of how a status was reached, for the UI. */
export function explainMastery(status: ConceptStatus, attemptCount: number, correctCount: number): string {
  if (status === "Untested") return "No practice recorded yet.";
  const base = `${correctCount} of ${attemptCount} recorded attempt${attemptCount === 1 ? "" : "s"} correct.`;
  if (status === "Mastered") return `${base} Mastery earned over at least ${MASTERY_MIN_ATTEMPTS} attempts.`;
  if (status === "Developing") return `${base} Keep practising to reach mastery.`;
  return `${base} More wrong than right so far.`;
}
