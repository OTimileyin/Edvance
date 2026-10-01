import { explainMastery } from "./mastery";
import type {
  ConceptEvidenceRef,
  ConceptStatus,
  RevisionFocus,
  RevisionPriority,
} from "./types";

/**
 * The revision recommendation, derived deterministically from what the learner
 * has practised and what the course's evidence teaches. No model is involved:
 * the smallest useful next action is a function of mastery, so the same state
 * always yields the same recommendation, and nothing here can invent a gap.
 *
 * Priority is weakest-evidence-of-mastery first:
 *   weak       — attempted and mostly wrong; needs remediation.
 *   developing — attempted and improving; nearest to mastery.
 *   untested   — never practised; needs a first measurement.
 * A Mastered concept is never recommended.
 */

const PRIORITY_RANK: Record<RevisionPriority, number> = {
  weak: 0,
  developing: 1,
  untested: 2,
};

/** What the revision builder needs about one analysed concept. */
export interface RevisionConceptInput {
  conceptId: string;
  name: string;
  evidence: ConceptEvidenceRef[];
  /** The learner's mastery of this concept, if any practice exists. */
  mastery:
    | {
        status: ConceptStatus;
        score: number;
        attempts?: number;
        correct?: number;
        lastAttemptAt?: string | null;
      }
    | undefined;
}

function priorityFor(status: ConceptStatus): RevisionPriority | null {
  if (status === "Weak") return "weak";
  if (status === "Developing") return "developing";
  if (status === "Untested") return "untested";
  return null; // Mastered — nothing to revise.
}

/**
 * Orders the concepts worth revising, weakest first. A concept with no mastery
 * row is Untested with no attempts; nothing is assumed about it.
 */
export function buildRevisionFocus(concepts: RevisionConceptInput[]): RevisionFocus[] {
  const focus: RevisionFocus[] = [];
  for (const concept of concepts) {
    const status = concept.mastery?.status ?? "Untested";
    const priority = priorityFor(status);
    if (!priority) continue;
    const attempts = concept.mastery?.attempts ?? 0;
    const correct = concept.mastery?.correct ?? 0;
    focus.push({
      conceptId: concept.conceptId,
      name: concept.name,
      status,
      priority,
      reason: explainMastery(status, attempts, correct),
      attempts,
      evidence: concept.evidence,
    });
  }

  return focus.sort((a, b) => {
    const byPriority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (byPriority !== 0) return byPriority;
    return a.name.localeCompare(b.name);
  });
}

/** The single smallest useful next action, naming the top focus and its evidence. */
export function buildRevisionNextAction(
  focus: RevisionFocus[],
  hasConcepts: boolean,
): string {
  if (!hasConcepts) {
    return "Analyse the course to extract the concepts your materials teach, then record some practice.";
  }
  const [top] = focus;
  if (!top) {
    return "Every concept is Mastered based on your recorded practice. Revisit the evidence before your assessment.";
  }
  const evidence = top.evidence[0];
  const hint = evidence
    ? ` Revisit it in ${evidence.materialTitle} (${evidence.sourceLocation}).`
    : "";
  return `Practise “${top.name}” next — ${top.reason}${hint}`;
}

/**
 * A stable fingerprint of the weak areas a generation was written for. When the
 * learner practises and mastery moves, the fingerprint changes and the stored
 * plan becomes stale — with no model call.
 */
export function revisionFingerprint(focus: RevisionFocus[]): string {
  const parts = focus
    .map((entry) => `${entry.conceptId}:${entry.status}:${entry.attempts}`)
    .sort();
  return `v1:${parts.join(",")}`;
}
