"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { removeMaterial, useCourse } from "@/lib/useCourses";
import { AddMaterialForm } from "@/components/add-material-form";
import { formatBytes } from "@/lib/materials";
import type { SourceItem } from "@/lib/types";

export default function CourseSources() {
  const params = useParams<{ courseId: string }>();
  const { course, ready, reload } = useCourse(params.courseId);
  const [removingId, setRemovingId] = useState<string | null>(null);
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
          No sources in this workspace yet. Upload a lecture recording, slide deck, notes, or
          assessment document to start the evidence trail.
        </div>
      ) : (
        <section className="section" aria-label="Sources list">
          <div className="item-list">
            {course.sources.map((source) => {
              const size = formatBytes(source.sizeBytes);
              return (
                <article key={source.id} className="item">
                  <p className="item-title">{source.title}</p>
                  <div className="item-meta">
                    <span className="badge badge-neutral">{source.type}</span>
                    <span>{source.location}</span>
                    {source.storageReference && (
                      <span className="badge badge-success">Stored</span>
                    )}
                    {size && <span>{size}</span>}
                    {source.storageReference && (
                      <a
                        className="btn btn-secondary btn-sm"
                        href={`/api/courses/${course.id}/materials/${source.id}/download`}
                      >
                        Download
                      </a>
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
