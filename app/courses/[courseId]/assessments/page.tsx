"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  analyseAssessment,
  deleteAssessmentQuestion,
  updateAssessmentQuestion,
  useCourse,
} from "@/lib/useCourses";
import { AddAssessmentForm } from "@/components/add-assessment-form";
import type { AnalysisStatus, ConsistencyStatus } from "@/lib/types";

/**
 * Assessments: each question checked against the concepts the course's own
 * materials taught.
 *
 * A question is only ever judged against real analysed concepts, so the page
 * says which concepts it tests and where they were taught. When the evidence
 * cannot support a judgement — or the question presumes something the evidence
 * contradicts — Edvance says exactly that instead of guessing. Checking a
 * question only ever starts from the button on this page.
 */

const STATUS_LABELS: Record<AnalysisStatus, { label: string; className: string }> = {
  "not-analyzed": { label: "Not checked", className: "badge-neutral" },
  analyzing: { label: "Checking…", className: "badge-warning" },
  ready: { label: "Checked", className: "badge-success" },
  failed: { label: "Check failed", className: "badge-error" },
  "insufficient-evidence": { label: "Insufficient evidence", className: "badge-neutral" },
  "needs-reanalysis": { label: "Needs re-checking", className: "badge-warning" },
};

const CONSISTENCY_LABELS: Record<ConsistencyStatus, { label: string; className: string }> = {
  consistent: { label: "Consistent with the evidence", className: "badge-success" },
  "possible-inconsistency": { label: "Possible inconsistency", className: "badge-warning" },
  "insufficient-evidence": { label: "Insufficient evidence", className: "badge-neutral" },
};

function shortExcerpt(excerpt: string | null): string | null {
  if (!excerpt) return null;
  const normalized = excerpt.replace(/\s+/g, " ").trim();
  if (normalized.length <= 200) return normalized;
  return `${normalized.slice(0, 197)}…`;
}

export default function CourseAssessments() {
  const params = useParams<{ courseId: string }>();
  const { course, ready, reload } = useCourse(params.courseId);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!ready) return null;
  if (!course) return null;

  const hasConcepts =
    course.intelligence.status === "ready" && course.intelligence.concepts.length > 0;

  async function handleCheck(assessmentId: string) {
    if (!course) return;
    setCheckingId(assessmentId);
    setError(null);
    try {
      await analyseAssessment(course.id, assessmentId);
      await reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Question analysis did not finish.");
    } finally {
      setCheckingId(null);
    }
  }

  function startEdit(assessmentId: string, question: string) {
    setEditingId(assessmentId);
    setEditText(question);
    setError(null);
  }

  async function handleSaveEdit(assessmentId: string) {
    if (!course) return;
    if (!editText.trim()) {
      setError("A question cannot be empty.");
      return;
    }
    setSavingEdit(true);
    setError(null);
    try {
      await updateAssessmentQuestion(course.id, assessmentId, { question: editText });
      setEditingId(null);
      await reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update the question.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(assessmentId: string) {
    if (!course) return;
    setDeletingId(assessmentId);
    setError(null);
    try {
      await deleteAssessmentQuestion(course.id, assessmentId);
      await reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete the question.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <section className="section">
        <span className="kicker">Questions to answer</span>
        <h1 className="page-title">Assessments</h1>
        <p className="page-lede">
          Assessment questions gathered for {course.name}. Each one is checked against the concepts
          your own materials taught, so you can see what it tests and whether the wording agrees
          with the evidence.
        </p>
      </section>

      {!hasConcepts && (
        <section className="section" aria-label="Before checking a question">
          <div className="alert alert-neutral">
            <p>
              Questions are judged against your course&apos;s extracted concepts, so the{" "}
              <strong>course must be analysed first</strong> (see the Intelligence tab). Until then,
              Edvance will report insufficient evidence rather than guess.
            </p>
          </div>
        </section>
      )}

      <section className="section" aria-labelledby="assessment-list-heading">
        <h2 className="section-heading" id="assessment-list-heading">
          Assessment questions
        </h2>
        {course.assessments.length === 0 ? (
          <div className="empty-state">No assessment questions added yet.</div>
        ) : (
          <div className="item-list">
            {course.assessments.map((assessment) => {
              const signature = assessment.signature;
              const statusBadge = STATUS_LABELS[signature.status];
              const consistencyBadge = CONSISTENCY_LABELS[signature.consistency];
              const busy = checkingId === assessment.id;
              const canCheck = hasConcepts && !busy && signature.status !== "analyzing";
              return (
                <article key={assessment.id} className="item">
                  <p className="item-title">{assessment.question}</p>
                  <div className="item-meta">
                    <span className={`badge ${statusBadge.className}`}>{statusBadge.label}</span>
                    <span>{assessment.lesson}</span>
                  </div>

                  {signature.status === "ready" && (
                    <p>
                      <span className={`badge ${consistencyBadge.className}`}>
                        {consistencyBadge.label}
                      </span>
                    </p>
                  )}

                  {signature.reason && (
                    <p className={signature.status === "failed" ? "form-hint" : undefined}>
                      {signature.reason}
                    </p>
                  )}
                  {signature.nextAction && signature.status !== "not-analyzed" && (
                    <p className="form-hint">Next: {signature.nextAction}</p>
                  )}

                  {signature.concepts.length > 0 && (
                    <>
                      <h3 className="section-heading" style={{ fontSize: 14 }}>
                        Concepts this question tests
                      </h3>
                      <ul>
                        {signature.concepts.map((concept) => (
                          <li key={concept.id}>
                            <strong>{concept.name}</strong>
                            {concept.instructorTerm && concept.instructorTerm !== concept.name && (
                              <> (course term: {concept.instructorTerm})</>
                            )}
                            {concept.evidence.length === 0
                              ? " — no stored evidence"
                              : ` — ${concept.evidence
                                  .map(
                                    (reference) =>
                                      `${reference.materialTitle}, ${reference.sourceLocation}`,
                                  )
                                  .join("; ")}`}
                          </li>
                        ))}
                      </ul>
                      {signature.concepts
                        .flatMap((concept) => concept.evidence)
                        .slice(0, 1)
                        .map((reference) =>
                          shortExcerpt(reference.excerpt) ? (
                            <p key={reference.id} className="form-hint">
                              <em>“{shortExcerpt(reference.excerpt)}”</em>
                            </p>
                          ) : null,
                        )}
                    </>
                  )}

                  {signature.status === "failed" && signature.errorSummary && (
                    <p role="alert" className="form-hint">
                      {signature.errorSummary}
                    </p>
                  )}

                  <div className="chip-row" style={{ marginTop: 12 }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => void handleCheck(assessment.id)}
                      disabled={!canCheck}
                      aria-busy={busy}
                    >
                      {busy
                        ? "Checking…"
                        : signature.status === "ready" || signature.status === "needs-reanalysis"
                          ? "Re-check this question"
                          : "Check this question"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => startEdit(assessment.id, assessment.question)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => void handleDelete(assessment.id)}
                      disabled={deletingId === assessment.id}
                    >
                      {deletingId === assessment.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>

                  {editingId === assessment.id && (
                    <div className="field" style={{ marginTop: 12 }}>
                      <label className="field-label" htmlFor={`edit-${assessment.id}`}>
                        Edit this question
                      </label>
                      <textarea
                        id={`edit-${assessment.id}`}
                        className="textarea"
                        value={editText}
                        onChange={(event) => setEditText(event.target.value)}
                      />
                      <p className="form-hint">
                        Editing the wording clears this question&apos;s check — it must be checked
                        again against the evidence.
                      </p>
                      <div className="chip-row">
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => void handleSaveEdit(assessment.id)}
                          disabled={savingEdit}
                        >
                          {savingEdit ? "Saving…" : "Save question"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
        {error && (
          <p role="alert" className="form-hint">
            {error}
          </p>
        )}
      </section>

      <section className="section" aria-labelledby="add-assessment-heading">
        <h2 className="section-heading" id="add-assessment-heading">
          Add an assessment question
        </h2>
        <AddAssessmentForm courseId={course.id} onAdded={reload} />
      </section>
    </>
  );
}
