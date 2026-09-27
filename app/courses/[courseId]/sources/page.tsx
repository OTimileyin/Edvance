"use client";

import { useParams } from "next/navigation";
import { useCourse } from "@/lib/useCourses";

export default function CourseSources() {
  const params = useParams<{ courseId: string }>();
  const { course, ready } = useCourse(params.courseId);

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

      {course.sources.length === 0 ? (
        <div className="empty-state">
          No sources in this workspace yet. Materials will appear here once added or ingested.
        </div>
      ) : (
        <section className="section" aria-label="Sources list">
          <div className="item-list">
            {course.sources.map((source) => (
              <article key={source.id} className="item">
                <p className="item-title">{source.title}</p>
                <div className="item-meta">
                  <span className="badge badge-neutral">{source.type}</span>
                  <span>{source.location}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}