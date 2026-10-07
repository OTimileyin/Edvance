"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { removeMaterial, retryIngestion, useCourse } from "@/lib/useCourses";
import { AddMaterialForm } from "@/components/add-material-form";
import { formatBytes } from "@/lib/materials";
import type { SourceItem, SourceType } from "@/lib/types";

/** A short label for the material's format, used before derived metadata. */
const FORMAT_LABELS: Partial<Record<SourceType, string>> = {
  PDF: "PDF",
  Slide: "Slide deck",
  Transcript: "Transcript",
  Notes: "Notes",
};

const UNIT_NOUNS: Record<string, [string, string]> = {
  page: ["page", "pages"],
  slide: ["slide", "slides"],
  cue: ["cue", "cues"],
  section: ["section", "sections"],
  line: ["line", "lines"],
  block: ["block", "blocks"],
};

/**
 * A factual description of what was actually extracted, e.g. "PDF · 14 pages".
 * Returns null unless ingestion completed with a real count — never guesses.
 */
function derivedSummary(source: SourceItem): string | null {
  const metadata = source.ingestion?.metadata;
  const count = metadata?.count;
  const unit = metadata?.unit;
  if (typeof count !== "number" || !Number.isFinite(count) || !unit) return null;
  const nouns = UNIT_NOUNS[unit];
  if (!nouns) return null;
  const format = FORMAT_LABELS[source.type] ?? source.type;
  return `${format} · ${count} ${count === 1 ? nouns[0] : nouns[1]}`;
}

/** The real processing state to show for a stored material. */
function statusBadge(source: SourceItem): { label: string; className: string } {
  const status = source.ingestion?.status;
  switch (status) {
    case "completed":
      return { label: "Ready for analysis", className: "badge badge-success" };
    case "failed":
      return { label: "Extraction failed", className: "badge badge-error" };
    case "processing":
    case "pending":
      return { label: "Processing…", className: "badge badge-warning" };
    default:
      return { label: "Uploaded", className: "badge badge-neutral" };
  }
}

export default function CourseSources() {
  const params = useParams<{ courseId: string }>();
  const { course, ready, reload } = useCourse(params.courseId);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRemove(source: SourceItem) {
    if (!course) return;
    const confirmation = source.storageReference
      ? `Remove “${source.title}” and delete the stored file? This cannot be undone.`
      : `Remove “${source.title}” from this workspace?`;
    if (!window.confirm(confirmation)) return;

    setRemovingId(source.id);
    setError(null);
    try {
      await removeMaterial(course.id, source.id);
      await reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not remove the material.");
    } finally {
      setRemovingId(null);
    }
  }

  async function handleRetry(source: SourceItem) {
    if (!course) return;
    setRetryingId(source.id);
    setError(null);
    try {
      await retryIngestion(course.id, source.id);
      await reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not reprocess the material.");
    } finally {
      setRetryingId(null);
    }
  }

  if (!ready) return null;
  if (!course) return null;

  return (
    <>
      <section className="section">
        <span className="kicker">Course evidence</span>
        <h1 className="page-title">Sources</h1>
        <p className="page-lede">
          Learning materials that make up the evidence trail for {course.name}.
        </p>
      </section>

      {error && (
        <p role="alert" className="alert alert-warning">
          {error}
        </p>
      )}

      {course.sources.length === 0 ? (
        <div className="empty-state">
          No sources in this workspace yet. Upload a slide deck, notes, PDF, or transcript to start
          the evidence trail.
        </div>
      ) : (
        <section className="section" aria-label="Sources list">
          <div className="item-list">
            {course.sources.map((source) => {
              const size = formatBytes(source.sizeBytes);
              const stored = Boolean(source.storageReference);
              const derived = derivedSummary(source);
              const badge = statusBadge(source);
              const chunks = source.ingestion?.chunkCount;
              return (
                <article key={source.id} className="item">
                  <p className="item-title">{source.title}</p>
                  <div className="item-meta">
                    <span className="badge badge-neutral">{source.type}</span>
                    {stored ? (
                      <span className={badge.className}>{badge.label}</span>
                    ) : (
                      <span className="demo-flag">Demo source</span>
                    )}
                    <span>{source.location}</span>
                    {derived && <span>{derived}</span>}
                    {stored && typeof chunks === "number" && chunks > 0 && (
                      <span>
                        {chunks} {chunks === 1 ? "chunk" : "chunks"}
                      </span>
                    )}
                    {size && <span>{size}</span>}
                    {stored && (
                      <a
                        className="btn btn-secondary btn-sm"
                        href={`/api/courses/${course.id}/materials/${source.id}/download`}
                      >
                        Download
                      </a>
                    )}
                    {stored && source.ingestion?.status === "failed" && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => void handleRetry(source)}
                        disabled={retryingId === source.id}
                      >
                        {retryingId === source.id ? "Retrying…" : "Retry extraction"}
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => void handleRemove(source)}
                      disabled={removingId === source.id}
                    >
                      {removingId === source.id ? "Removing…" : "Remove"}
                    </button>
                  </div>
                  {stored &&
                    source.ingestion?.status === "failed" &&
                    source.ingestion.errorSummary && (
                      <p className="form-hint" role="status">
                        {source.ingestion.errorSummary}
                      </p>
                    )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section className="section" aria-labelledby="add-material-heading">
        <h2 className="section-heading" id="add-material-heading">
          Add a learning material
        </h2>
        <AddMaterialForm courseId={course.id} onAdded={reload} />
      </section>
    </>
  );
}
