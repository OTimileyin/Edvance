"use client";

import { useState } from "react";
import { addAssessment } from "@/lib/store";

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

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question.trim()) {
      setError("Enter the assessment question before adding it.");
      return;
    }
    addAssessment(courseId, lesson, question);
    setQuestion("");
    setLesson("");
    setError(null);
    onAdded();
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
        <button type="submit" className="btn btn-primary">
          Add question
        </button>
      </div>
      <p className="form-hint">Added questions are stored locally on this device (demo data only).</p>
    </form>
  );
}