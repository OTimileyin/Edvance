"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { deleteCourse, updateCourse, useCourse } from "@/lib/useCourses";
import { ConsistencyBadge } from "@/components/badges";

export default function CourseOverview() {
  const params = useParams<{ courseId: string }>();
  const { course, ready, reload } = useCourse(params.courseId);

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
          <Link href={`/courses/${course.id}/intelligence`} className="link-card">
            <h3>Intelligence</h3>
            <p>
              {course.intelligence.status === "ready"
                ? `${course.intelligence.conceptCount} concepts extracted from your evidence.`
                : course.intelligence.status === "needs-reanalysis"
                  ? "Materials changed — re-analysis needed."
                  : course.intelligence.status === "insufficient-evidence"
                    ? "Not enough evidence to extract concepts yet."
                    : "Course not analysed yet."}
            </p>
            <p className="card-meta">Concepts, evidence and relationships</p>
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
          <Link href={`/courses/${course.id}/revision`} className="link-card">
            <h3>Revision</h3>
            <p>{course.revision.nextAction}</p>
            <p className="card-meta">Next action and targeted practice</p>
          </Link>
        </div>
      </section>

      <CourseSettings
        courseId={course.id}
        initial={{
          name: course.name,
          institution: course.institution,
          lesson: course.lesson,
        }}
        onSaved={reload}
      />
    </>
  );
}

function CourseSettings({
  courseId,
  initial,
  onSaved,
}: {
  courseId: string;
  initial: { name: string; institution: string; lesson: string };
  onSaved: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [institution, setInstitution] = useState(initial.institution);
  const [lesson, setLesson] = useState(initial.lesson);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateCourse(courseId, { name, institution, lesson });
      setSaved(true);
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the changes.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (confirmText !== "DELETE") {
      setError("Type DELETE to confirm.");
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await deleteCourse(courseId);
      router.push("/courses");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete the course.");
      setDeleting(false);
    }
  }

  return (
    <section className="section" aria-labelledby="settings-heading">
      <h2 className="section-heading" id="settings-heading">
        Course settings
      </h2>
      <form className="form" onSubmit={handleSave}>
        <div className="field">
          <label className="field-label" htmlFor="settings-name">
            Course name
          </label>
          <input
            id="settings-name"
            className="input"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="settings-institution">
            Institution or programme
          </label>
          <input
            id="settings-institution"
            className="input"
            type="text"
            value={institution}
            onChange={(event) => setInstitution(event.target.value)}
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="settings-lesson">
            Current lesson
          </label>
          <input
            id="settings-lesson"
            className="input"
            type="text"
            value={lesson}
            onChange={(event) => setLesson(event.target.value)}
          />
        </div>
        {error && (
          <p role="alert" className="alert alert-warning">
            {error}
          </p>
        )}
        {saved && <p className="form-hint">Saved.</p>}
        <div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>

      <div className="alert alert-warning" style={{ marginTop: 32 }}>
        <p className="alert-title">Delete this course</p>
        <p>
          This removes the course and everything in it — its materials, concepts, questions,
          mastery and revision — and deletes its stored files. This cannot be undone.
        </p>
      </div>
      <div className="field" style={{ marginTop: 16, maxWidth: 360 }}>
        <label className="field-label" htmlFor="delete-course-confirm">
          Type DELETE to confirm
        </label>
        <input
          id="delete-course-confirm"
          className="input"
          type="text"
          value={confirmText}
          onChange={(event) => setConfirmText(event.target.value)}
          placeholder="DELETE"
        />
      </div>
      <p style={{ marginTop: 12 }}>
        <button
          type="button"
          className="btn btn-coral"
          onClick={() => void handleDelete()}
          disabled={deleting || confirmText !== "DELETE"}
        >
          {deleting ? "Deleting…" : "Delete course"}
        </button>
      </p>
    </section>
  );
}
