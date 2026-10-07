"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { analyseCourse, useCourse } from "@/lib/useCourses";
import type { AnalysisStatus, EvidenceStatus } from "@/lib/types";

/**
 * Course Intelligence: what this course actually teaches, grounded in the
 * learner's own uploaded materials.
 *
 * Every concept here was extracted from real evidence chunks, and every piece
 * of evidence links back to a real material and location. When the course has
 * not been analysed, or the evidence is too thin, the page says so rather than
 * guessing. Analysis only ever starts from the button on this page.
 */

const ANALYSIS_LABELS: Record<AnalysisStatus, { label: string; className: string }> = {
  "not-analyzed": { label: "Not analysed", className: "badge-neutral" },
  analyzing: { label: "Analysing…", className: "badge-warning" },
  ready: { label: "Ready", className: "badge-success" },
  failed: { label: "Analysis failed", className: "badge-error" },
  "insufficient-evidence": { label: "Insufficient evidence", className: "badge-neutral" },
  "needs-reanalysis": { label: "Needs re-analysis", className: "badge-warning" },
};

const EVIDENCE_LABELS: Record<EvidenceStatus, { label: string; className: string }> = {
  SUPPORTED: { label: "Supported", className: "badge-success" },
  PARTIALLY_SUPPORTED: { label: "Partly supported", className: "badge-warning" },
  INSUFFICIENT_EVIDENCE: { label: "Insufficient evidence", className: "badge-neutral" },
};

const RELATIONSHIP_LABELS: Record<string, string> = {
  prerequisite: "is a prerequisite for",
  part_of: "is part of",
  related_to: "is related to",
  contrasts_with: "contrasts with",
};

function shortExcerpt(excerpt: string | null): string | null {
  if (!excerpt) return null;
  const normalized = excerpt.replace(/\s+/g, " ").trim();
  if (normalized.length <= 240) return normalized;
  return `${normalized.slice(0, 237)}…`;
}

function formatAnalysedAt(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
}

export default function CourseIntelligencePage() {
  const params = useParams<{ courseId: string }>();
  const { course, ready, reload } = useCourse(params.courseId);
  const [analysing, setAnalysing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!ready) return null;
  if (!course) return null;

  const intelligence = course.intelligence;
  const analysisBadge = ANALYSIS_LABELS[intelligence.status];
  const analysedAt = formatAnalysedAt(intelligence.analyzedAt);
  const hasEvidence = course.sources.some((source) => (source.ingestion?.chunkCount ?? 0) > 0);
  const canAnalyse = hasEvidence && !analysing && intelligence.status !== "analyzing";

  async function handleAnalyse() {
    if (!course) return;
    setAnalysing(true);
    setError(null);
    try {
      await analyseCourse(course.id);
      await reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Course analysis did not finish.");
    } finally {
      setAnalysing(false);
    }
  }

  return (
    <>
      <section className="section">
        <span className="kicker">Course intelligence</span>
        <h1 className="page-title">What this course teaches</h1>
        <p className="page-lede">
          Concepts extracted from your uploaded materials, each one grounded in the exact evidence
          it came from. Edvance never invents a citation: a concept with no evidence is reported as
          insufficient evidence.
        </p>
      </section>

      <section className="section" aria-label="Analysis status">
        <div className="alert alert-neutral">
          <p className="alert-title">
            <span className={`badge ${analysisBadge.className}`}>{analysisBadge.label}</span>
          </p>
          {intelligence.status === "not-analyzed" && (
            <p>
              This course has not been analysed yet.{" "}
              {hasEvidence
                ? "Run the analysis to extract the concepts and their evidence."
                : "Upload a material in Sources first — analysis needs stored evidence."}
            </p>
          )}
          {intelligence.status === "needs-reanalysis" && (
            <p>
              Materials have changed since the last analysis, so the concepts below may be out of
              date. Re-run the analysis to refresh them.
            </p>
          )}
          {intelligence.status === "insufficient-evidence" && (
            <p>
              The course does not yet contain enough evidence to establish concepts. Edvance reports
              this honestly rather than inventing them.
            </p>
          )}
          {intelligence.status === "failed" && (
            <p role="alert">
              {intelligence.errorSummary ?? "Course analysis did not finish. You can try again."}
            </p>
          )}
          {intelligence.status === "ready" && (
            <p>
              {intelligence.conceptCount} {intelligence.conceptCount === 1 ? "concept" : "concepts"}{" "}
              extracted from{" "}
              {course.sources.filter((source) => (source.ingestion?.chunkCount ?? 0) > 0).length}{" "}
              evidence{" "}
              {course.sources.filter((source) => (source.ingestion?.chunkCount ?? 0) > 0).length ===
              1
                ? "material"
                : "materials"}
              {analysedAt ? `. Analysed ${analysedAt}.` : "."}
            </p>
          )}
          {error && (
            <p role="alert" className="form-hint">
              {error}
            </p>
          )}
          <p style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void handleAnalyse()}
              disabled={!canAnalyse}
              aria-busy={analysing}
            >
              {analysing
                ? "Analysing…"
                : intelligence.status === "ready" || intelligence.status === "needs-reanalysis"
                  ? "Re-analyse course"
                  : "Analyse course"}
            </button>
          </p>
          <p className="form-hint">
            Analysis runs only when you ask for it, and only over the evidence you have uploaded.
          </p>
        </div>
      </section>

      {intelligence.concepts.length === 0 ? (
        <div className="empty-state">
          No concepts extracted yet. Once the course has been analysed, each concept appears here
          with the material and location it came from.
        </div>
      ) : (
        <section className="section" aria-labelledby="concepts-heading">
          <h2 className="section-heading" id="concepts-heading">
            Concepts ({intelligence.concepts.length})
          </h2>
          <div className="item-list">
            {intelligence.concepts.map((concept) => {
              const status = concept.evidenceStatus
                ? EVIDENCE_LABELS[concept.evidenceStatus]
                : EVIDENCE_LABELS.INSUFFICIENT_EVIDENCE;
              return (
                <article key={concept.id} className="item">
                  <p className="item-title">{concept.name}</p>
                  <div className="item-meta">
                    <span className={`badge ${status.className}`}>{status.label}</span>
                    {typeof concept.confidence === "number" && (
                      <span>Confidence {Math.round(concept.confidence * 100)}%</span>
                    )}
                    {concept.instructorTerm && concept.instructorTerm !== concept.name && (
                      <span>
                        Instructor term: <strong>{concept.instructorTerm}</strong>
                      </span>
                    )}
                  </div>
                  {concept.definition && <p>{concept.definition}</p>}
                  {concept.evidence.length > 0 ? (
                    <>
                      <h3 className="section-heading" style={{ fontSize: 14 }}>
                        Evidence
                      </h3>
                      <ul>
                        {concept.evidence.map((reference) => (
                          <li key={reference.id}>
                            <strong>{reference.materialTitle}</strong> — {reference.sourceLocation}
                            {shortExcerpt(reference.excerpt) && (
                              <>
                                : <em>“{shortExcerpt(reference.excerpt)}”</em>
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="form-hint">
                      No stored evidence supports this concept. It is shown so the gap is visible.
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {intelligence.relationships.length > 0 && (
        <section className="section" aria-labelledby="relationships-heading">
          <h2 className="section-heading" id="relationships-heading">
            Relationships ({intelligence.relationships.length})
          </h2>
          <div className="item-list">
            {intelligence.relationships.map((relationship) => (
              <article key={relationship.id} className="item">
                <p className="item-title">
                  {relationship.fromConcept}{" "}
                  <span className="badge badge-neutral">
                    {RELATIONSHIP_LABELS[relationship.kind] ?? relationship.kind}
                  </span>{" "}
                  {relationship.toConcept}
                </p>
                {relationship.justification && <p>{relationship.justification}</p>}
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
