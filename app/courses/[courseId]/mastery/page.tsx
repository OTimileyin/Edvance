"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { recordPractice, useCourse } from "@/lib/useCourses";
import { ConceptBadge } from "@/components/badges";
import type { ConceptStatus, Course, PracticeAttempt } from "@/lib/types";

/**
 * Mastery: per-concept status derived from the learner's own practice.
 *
 * Nothing here is assigned by a model. A concept with no attempts is Untested;
 * every other status is computed from the recorded attempts, and the page shows
 * the attempts behind it so the learner can see exactly why a status changed.
 */

interface PracticeTarget {
  key: string;
  label: string;
  payload: { assessmentId?: string; conceptId?: string };
}

/** The things a learner can practise: checked questions, then single concepts. */
function practiceTargets(course: Course): PracticeTarget[] {
  const targets: PracticeTarget[] = [];
  for (const assessment of course.assessments) {
    if (assessment.signature.status === "ready" && assessment.signature.concepts.length > 0) {
      targets.push({
        key: `q:${assessment.id}`,
        label: `Question · ${assessment.question}`,
        payload: { assessmentId: assessment.id },
      });
    }
  }
  for (const concept of course.intelligence.concepts) {
    targets.push({
      key: `c:${concept.id}`,
      label: `Concept · ${concept.name}`,
      payload: { conceptId: concept.id },
    });
  }
  return targets;
}

function fillClass(status: ConceptStatus): string {
  if (status === "Mastered") return "progress-mastered";
  if (status === "Developing") return "progress-developing";
  if (status === "Weak") return "progress-weak";
  // An untested concept has no recorded performance, so its bar stays empty
  // rather than borrowing a status it has not earned.
  return "";
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}

export default function CourseMastery() {
  const params = useParams<{ courseId: string }>();
  const { course, ready, reload } = useCourse(params.courseId);

  if (!ready) return null;
  if (!course) return null;

  const mastered = course.concepts.filter((concept) => concept.status === "Mastered").length;
  const developing = course.concepts.filter((concept) => concept.status === "Developing").length;
  const weak = course.concepts.filter((concept) => concept.status === "Weak").length;
  const untested = course.concepts.filter((concept) => concept.status === "Untested").length;
  const targets = practiceTargets(course);
  const practised = course.concepts.some((concept) => (concept.attempts ?? 0) > 0);

  return (
    <>
      <section className="section">
        <span className="kicker">Learner state</span>
        <h1 className="page-title">Mastery</h1>
        <p className="page-lede">
          Per-concept status for {course.name}, derived from your own recorded practice. Edvance
          never marks a concept mastered for you: a concept with no attempts stays Untested.
        </p>
      </section>

      {course.concepts.length === 0 ? (
        <div className="empty-state">
          No concepts in this workspace yet. Analyse the course to extract the concepts your
          materials teach, then practise them.
        </div>
      ) : (
        <>
          <section className="section" aria-label="Mastery summary">
            <div className="chip-row">
              <span className="chip">Mastered · {mastered}</span>
              <span className="chip">Developing · {developing}</span>
              <span className="chip">Weak · {weak}</span>
              {untested > 0 && <span className="chip">Untested · {untested}</span>}
            </div>
          </section>

          {!practised && (
            <section className="section" aria-label="Before practising">
              <div className="alert alert-neutral">
                <p>
                  No practice has been recorded yet, so every concept is <strong>Untested</strong>.
                  Record an attempt below — Edvance derives the status from your attempts and shows
                  the trail, and never invents a result.
                </p>
              </div>
            </section>
          )}

          <section className="section" aria-labelledby="mastery-table-heading">
            <h2 className="section-heading" id="mastery-table-heading">
              Concept breakdown
            </h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Concept</th>
                    <th scope="col">Status</th>
                    <th scope="col">Practice</th>
                    <th scope="col">Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {course.concepts.map((concept) => (
                    <tr key={concept.name}>
                      <td>{concept.name}</td>
                      <td>
                        <ConceptBadge status={concept.status} />
                      </td>
                      <td>
                        {concept.attempts
                          ? `${concept.correct ?? 0} of ${concept.attempts} correct`
                          : "—"}
                      </td>
                      <td>
                        <div className="goal">
                          <span className="progress-track">
                            <span
                              className={`progress-fill ${fillClass(concept.status)}`}
                              style={{ width: `${concept.score}%` }}
                            />
                          </span>
                          <span className="sr-only">{concept.score}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {targets.length > 0 && (
            <PracticePanel courseId={course.id} targets={targets} onRecorded={reload} />
          )}

          <RecentAttempts attempts={course.attempts} />
        </>
      )}
    </>
  );
}

function PracticePanel({
  courseId,
  targets,
  onRecorded,
}: {
  courseId: string;
  targets: PracticeTarget[];
  onRecorded: () => void;
}) {
  const [targetKey, setTargetKey] = useState(targets[0]?.key ?? "");
  const [answer, setAnswer] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function handleRecord(correct: boolean) {
    const target = targets.find((entry) => entry.key === targetKey);
    if (!target) {
      setError("Choose something to practise first.");
      return;
    }
    setSaving(true);
    setError(null);
    setResult(null);
    try {
      await recordPractice(courseId, { ...target.payload, answer: answer.trim(), correct });
      setAnswer("");
      setResult(
        correct
          ? "Recorded. The concepts this practises are updated from your attempt."
          : "Recorded. Practising again is how a weak concept improves.",
      );
      onRecorded();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not record that attempt.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="section" aria-labelledby="practice-heading">
      <h2 className="section-heading" id="practice-heading">
        Record practice
      </h2>
      <p className="form-hint">
        An attempt is your own record of what you did. Practising a question updates every concept
        that question tests; practising a concept updates just that one.
      </p>
      <div className="field">
        <label className="field-label" htmlFor="practice-target">
          What did you practise?
        </label>
        <select
          id="practice-target"
          className="input"
          value={targetKey}
          onChange={(event) => setTargetKey(event.target.value)}
        >
          {targets.map((target) => (
            <option key={target.key} value={target.key}>
              {target.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label className="field-label" htmlFor="practice-answer">
          Your answer (optional)
        </label>
        <textarea
          id="practice-answer"
          className="textarea"
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          placeholder="Write what you answered, so the trail is useful later."
        />
      </div>
      {error && (
        <p role="alert" className="alert alert-warning">
          {error}
        </p>
      )}
      {result && <p className="form-hint">{result}</p>}
      <div className="chip-row">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void handleRecord(true)}
          disabled={saving || !targetKey}
        >
          {saving ? "Recording…" : "I got this right"}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => void handleRecord(false)}
          disabled={saving || !targetKey}
        >
          I got this wrong
        </button>
      </div>
    </section>
  );
}

function RecentAttempts({ attempts }: { attempts: PracticeAttempt[] }) {
  if (attempts.length === 0) return null;
  return (
    <section className="section" aria-labelledby="attempts-heading">
      <h2 className="section-heading" id="attempts-heading">
        Recent practice
      </h2>
      <ul className="item-list">
        {attempts.map((attempt) => (
          <li key={attempt.id} className="item">
            <div className="item-meta">
              <span className={`badge ${attempt.correct ? "badge-success" : "badge-error"}`}>
                {attempt.correct ? "Correct" : "Incorrect"}
              </span>
              {attempt.conceptName && <span>{attempt.conceptName}</span>}
              <span>{formatWhen(attempt.createdAt)}</span>
            </div>
            {attempt.question && <p className="item-title">{attempt.question}</p>}
            {attempt.answer && <p className="form-hint">Your answer: {attempt.answer}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
