"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCourse } from "@/lib/useCourses";
import { ConsistencyBadge } from "@/components/badges";

export default function CourseOverview() {
  const params = useParams<{ courseId: string }>();
  const { course, ready } = useCourse(params.courseId);

  if (!ready) return null;
  if (!course) return null;

  const weak = course.concepts.filter((concept) => concept.status === "Weak");
  const mastered = course.concepts.filter((concept) => concept.status === "Mastered");

  const alertClass =
    course.consistency.status === "consistent"
      ? "alert-success"
      : course.consistency.status === "possible-inconsistency"
        ? "alert-warning"
        : "alert-neutral";

  return (
    <>
      <section className="section">
        <span className="kicker">{course.institution}</span>
        <h1 className="page-title">{course.name}</h1>
        <p className="page-lede">{course.summary}</p>
        <p className="page-lede" style={{ marginTop: 12 }}>
          Current lesson: <strong>{course.lesson}</strong>
        </p>
      </section>

      <section className="section" aria-label="Consistency status">
        <div className={`alert ${alertClass}`}>
          <p className="alert-title">
            <ConsistencyBadge status={course.consistency.status} /> — consistency
          </p>
          <p>{course.consistency.reason}</p>
          <p>
            <strong>Next action:</strong> {course.consistency.nextAction}
          </p>
        </div>
      </section>

      <section className="section" aria-labelledby="workspace-links-heading">
        <h2 className="section-heading" id="workspace-links-heading">
          Workspace
        </h2>
        <div className="card-grid">
          <Link href={`/courses/${course.id}/sources`} className="link-card">
            <h3>Sources</h3>
            <p>{course.sources.length} learning materials in this workspace.</p>
            <p className="card-meta">Lectures, slides, transcripts, notes, outlines</p>
          </Link>
          <Link href={`/courses/${course.id}/assessments`} className="link-card">
            <h3>Assessments</h3>
            <p>{course.assessments.length} questions collected so far.</p>
            <p className="card-meta">Add and review assessment questions</p>
          </Link>
          <Link href={`/courses/${course.id}/mastery`} className="link-card">
            <h3>Mastery</h3>
            <p>
              {mastered.length} mastered, {weak.length} weak concepts.
            </p>
            <p className="card-meta">Per-concept progress and status</p>
          </Link>
        </div>
      </section>
    </>
  );
}