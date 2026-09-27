"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createCourse, getCourses } from "@/lib/store";
import { useCourses } from "@/lib/useCourses";
import { ConsistencyBadge } from "./badges";

export function CourseDirectory() {
  const router = useRouter();
  const { courses, ready } = useCourses();
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [lesson, setLesson] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Give the course a name before creating a workspace.");
      return;
    }
    const course = createCourse({ name, institution, lesson });
    setName("");
    setInstitution("");
    setLesson("");
    setError(null);
    router.push(`/courses/${course.id}`);
  }

  if (!ready) {
    return <p className="page-lede" aria-live="polite">Loading courses…</p>;
  }

  return (
    <>
      <section className="section">
        <span className="kicker">Learning workspace</span>
        <h1 className="page-title">Courses</h1>
        <p className="page-lede">
          Open a course workspace to explore its sources, assessments, and your mastery progress.
        </p>
      </section>

      <section className="section" aria-labelledby="course-list-heading">
        <h2 className="section-heading" id="course-list-heading">
          Your courses
        </h2>
        {courses.length === 0 ? (
          <div className="empty-state">
            No courses yet. Create your first workspace below.
          </div>
        ) : (
          <div className="card-grid">
            {courses.map((course) => (
              <Link key={course.id} href={`/courses/${course.id}`} className="link-card">
                <h3>{course.name}</h3>
                <p>{course.lesson}</p>
                <p className="card-meta">
                  {course.institution} · {course.sources.length} sources ·{" "}
                  {course.assessments.length} assessments · {course.concepts.length} concepts
                </p>
                <p className="card-meta">
                  <ConsistencyBadge status={course.consistency.status} />
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="section" aria-labelledby="create-course-heading">
        <h2 className="section-heading" id="create-course-heading">
          Create a course workspace
        </h2>
        <form className="form" onSubmit={handleCreate}>
          <div className="field">
            <label className="field-label" htmlFor="course-name">
              Course name
            </label>
            <input
              id="course-name"
              className="input"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Linear Algebra"
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="course-institution">
              Institution or programme
            </label>
            <input
              id="course-institution"
              className="input"
              type="text"
              value={institution}
              onChange={(event) => setInstitution(event.target.value)}
              placeholder="e.g. Qubators"
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="course-lesson">
              Current lesson
            </label>
            <input
              id="course-lesson"
              className="input"
              type="text"
              value={lesson}
              onChange={(event) => setLesson(event.target.value)}
              placeholder="e.g. Matrices"
            />
          </div>
          {error && (
            <p role="alert" className="alert alert-warning">
              {error}
            </p>
          )}
          <div>
            <button type="submit" className="btn btn-primary">
              Create workspace
            </button>
          </div>
          <p className="form-hint">Created workspaces are stored locally on this device (demo data only).</p>
        </form>
      </section>
    </>
  );
}