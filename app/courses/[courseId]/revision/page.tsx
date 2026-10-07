"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { generateRevision, recordPractice, useCourse } from "@/lib/useCourses";
import { ConceptBadge } from "@/components/badges";
import type { AnalysisStatus, PracticeQuestion } from "@/lib/types";

/**
 * Revision: the smallest useful next action, plus targeted practice for the
 * learner's weakest concepts.
 *
 * The recommendation is derived from mastery and the course's own evidence, so
 * it appears without a model call. Generating practice is an explicit action;
 * the questions are written only for the weak areas and cite the evidence that
 * teaches them. Recording an attempt feeds straight back into mastery, which
 * re-derives the recommendation.
 */

const STATUS_LABELS: Record<AnalysisStatus, { label: string; className: string }> = {
  "not-analyzed": { label: "Not generated", className: "badge-neutral" },
  analyzing: { label: "Generating…", className: "badge-warning" },
  ready: { label: "Practice ready", className: "badge-success" },
  failed: { label: "Generation failed", className: "badge-error" },
  "insufficient-evidence": { label: "Insufficient evidence", className: "badge-neutral" },
  "needs-reanalysis": { label: "Mastery changed — regenerate", className: "badge-warning" },
};

function shortExcerpt(excerpt: string | null): string | null {
  if (!excerpt) return null;
  const normalized = excerpt.replace(/\s+/g, " ").trim();
  if (normalized.length <= 200) return normalized;
  return `${normalized.slice(0, 197)}…`;
}

export default function CourseRevision() {
  const params = useParams<{ courseId: string }>();
  const { course, ready, reload } = useCourse(params.courseId);

  if (!ready) return null;
  if (!course) return null;

  const revision = course.revision;
  const status = STATUS_LABELS[revision.status];
  const hasConcepts = course.intelligence.concepts.length > 0;
  const canGenerate = hasConcepts && revision.status !== "analyzing";
  const needsGeneration =
    revision.status === "not-analyzed" ||
    revision.status === "needs-reanalysis" ||
    revision.status === "failed";

  return (
    <>
      <section className="section">
        <span className="kicker">Next action</span>
        <h1 className="page-title">Revision</h1>
        <p className="page-lede">
          What to revise in {course.name} next, and practice written for the concepts you are
          weakest on. The recommendation is derived from your practice; Edvance never invents a gap.
        </p>
      </section>

      <section className="section" aria-label="Recommended next action">
        <div className={`alert ${revision.focus.length > 0 ? "alert-warning" : "alert-neutral"}`}>
          <p>{revision.nextAction}</p>
        </div>
      </section>

      {!hasConcepts && (
        <section className="section">
          <div className="alert alert-neutral">
            <p>
              Revision is built from the concepts your materials taught, so the{" "}
              <strong>course must be analysed first</strong> (see the Intelligence tab). Until then,
              Edvance has nothing evidence-grounded to recommend.
            </p>
          </div>
        </section>
      )}

      {hasConcepts && (
        <section className="section" aria-labelledby="focus-heading">
          <h2 className="section-heading" id="focus-heading">
            What needs work
          </h2>
          {revision.focus.length === 0 ? (
            <div className="empty-state">
              Nothing is weak or untested based on your recorded practice. Keep practising to hold
              the concepts at Mastered.
            </div>
          ) : (
            <div className="item-list">
              {revision.focus.map((entry) => (
                <article key={entry.conceptId} className="item">
                  <div className="item-meta">
                    <ConceptBadge status={entry.status} />
                    <span>{entry.name}</span>
                  </div>
                  <p>{entry.reason}</p>
                  {entry.evidence.length > 0 && (
                    <p className="form-hint">
                      Taught in{" "}
                      {entry.evidence
                        .map(
                          (reference) => `${reference.materialTitle} (${reference.sourceLocation})`,
                        )
                        .join("; ")}
                    </p>
                  )}
                  {entry.evidence.slice(0, 1).map((reference) =>
                    shortExcerpt(reference.excerpt) ? (
                      <p key={reference.id} className="form-hint">
                        <em>“{shortExcerpt(reference.excerpt)}”</em>
                      </p>
                    ) : null,
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {hasConcepts && (
        <section className="section" aria-labelledby="practice-heading">
          <h2 className="section-heading" id="practice-heading">
            Targeted practice
          </h2>
          <p className="form-hint">
            <span className={`badge ${status.className}`}>{status.label}</span>{" "}
            {revision.generatedAt && <span>Generated for your current weak areas.</span>}
          </p>
          <GenerateButton
            courseId={course.id}
            canGenerate={canGenerate}
            needsGeneration={needsGeneration}
            hasQuestions={revision.practiceQuestions.length > 0}
            onGenerated={reload}
          />

          {revision.status === "failed" && revision.errorSummary && (
            <p role="alert" className="form-hint">
              {revision.errorSummary}
            </p>
          )}

          {revision.practiceQuestions.length > 0 && (
            <div className="item-list">
              {revision.practiceQuestions.map((question) => (
                <PracticeCard
                  key={question.id}
                  courseId={course.id}
                  question={question}
                  onRecorded={reload}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
}

function GenerateButton({
  courseId,
  canGenerate,
  needsGeneration,
  hasQuestions,
  onGenerated,
}: {
  courseId: string;
  canGenerate: boolean;
  needsGeneration: boolean;
  hasQuestions: boolean;
  onGenerated: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setBusy(true);
    setError(null);
    try {
      await generateRevision(courseId);
      onGenerated();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Practice generation did not finish.");
    } finally {
      setBusy(false);
    }
  }

  const label = busy
    ? "Generating…"
    : hasQuestions
      ? needsGeneration
        ? "Regenerate for my current weak areas"
        : "Regenerate practice"
      : "Generate targeted practice";

  return (
    <>
      <p style={{ marginTop: 12 }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void handleGenerate()}
          disabled={!canGenerate || busy}
          aria-busy={busy}
        >
          {label}
        </button>
      </p>
      {error && (
        <p role="alert" className="form-hint">
          {error}
        </p>
      )}
    </>
  );
}

function PracticeCard({
  courseId,
  question,
  onRecorded,
}: {
  courseId: string;
  question: PracticeQuestion;
  onRecorded: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function record(correct: boolean) {
    if (!question.conceptId) return;
    setBusy(true);
    setError(null);
    try {
      await recordPractice(courseId, { conceptId: question.conceptId, correct });
      onRecorded();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not record that attempt.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="item">
      <div className="item-meta">
        {question.conceptName && (
          <span className="badge badge-neutral">{question.conceptName}</span>
        )}
        {question.sourceLocation && (
          <span>
            {question.materialTitle ? `${question.materialTitle}, ` : ""}
            {question.sourceLocation}
          </span>
        )}
      </div>
      <p className="item-title">{question.question}</p>
      {question.rationale && <p className="form-hint">{question.rationale}</p>}
      <div className="chip-row">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => void record(true)}
          disabled={busy || !question.conceptId}
        >
          I got this right
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => void record(false)}
          disabled={busy || !question.conceptId}
        >
          I got this wrong
        </button>
      </div>
      {error && (
        <p role="alert" className="form-hint">
          {error}
        </p>
      )}
    </article>
  );
}
