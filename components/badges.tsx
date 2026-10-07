import type { ConceptStatus, ConsistencyStatus } from "@/lib/types";

const CONCEPT_LABELS: Record<ConceptStatus, { label: string; className: string }> = {
  Mastered: { label: "Mastered", className: "badge-success" },
  Developing: { label: "Developing", className: "badge-warning" },
  Weak: { label: "Weak", className: "badge-error" },
  // A concept the learner has not practised yet. Its score is never invented.
  Untested: { label: "Untested", className: "badge-neutral" },
};

const CONSISTENCY_LABELS: Record<ConsistencyStatus, { label: string; className: string }> = {
  consistent: { label: "Consistent", className: "badge-success" },
  "possible-inconsistency": {
    label: "Possible inconsistency",
    className: "badge-warning",
  },
  "insufficient-evidence": {
    label: "Insufficient evidence",
    className: "badge-neutral",
  },
};

export function ConceptBadge({ status }: { status: ConceptStatus }) {
  const meta = CONCEPT_LABELS[status];
  return <span className={`badge ${meta.className}`}>{meta.label}</span>;
}

export function ConsistencyBadge({ status }: { status: ConsistencyStatus }) {
  const meta = CONSISTENCY_LABELS[status];
  return <span className={`badge ${meta.className}`}>{meta.label}</span>;
}
