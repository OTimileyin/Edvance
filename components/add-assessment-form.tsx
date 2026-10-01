"use client";

import { useState } from "react";
import { addAssessmentQuestion } from "@/lib/useCourses";

export function AddAssessmentForm({
  courseId,
  onAdded,
}: {
  courseId: string;
  onAdded: () => void;
}) {
  const [question, setQuestion] = useState("");
  const [lesson, setLesson] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question.trim()) {
      setError("Enter the assessment question before adding it.");
      return;
    }
    setSaving(true);
    try {
      await addAssessmentQuestion(courseId, lesson, question);
      setQuestion("");
      setLesson("");
      setError(null);
      onAdded();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not add the question.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="field">
        <label className="field-label" htmlFor="assessment-question">
          Assessment question
        </label>
        <textarea
          id="assessment-question"
          className="textarea"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="e.g. What are the five components of the PROMPT framework?"
        />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="assessment-lesson">
          Lesson it belongs to
        </label>
        <input
          id="assessment-lesson"
          className="input"
          type="text"
          value={lesson}
          onChange={(event) => setLesson(event.target.value)}
          placeholder="e.g. Prompt Engineering"
        />
      </div>
      {error && (
        <p role="alert" className="alert alert-warning">
          {error}
        </p>
      )}
      <div>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Adding…" : "Add question"}
        </button>
      </div>
      <p className="form-hint">Questions are saved to the local PostgreSQL database.</p>
    </form>
  );
}