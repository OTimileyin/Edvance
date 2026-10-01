"use client";

import { useCallback, useEffect, useState } from "react";
import { authClient } from "./auth-client";
import type { Course, SourceItem } from "./types";

/**
 * Course reads and writes now go through the `/api/courses` route handlers,
 * which are backed by PostgreSQL and scoped to the signed-in learner. The
 * hooks below wait for the auth state (`authReady`) before fetching so the
 * first paint after sign-in shows the real workspace rather than a 401.
 */
function useAuthReady(): boolean {
  const { isPending } = authClient.useSession();
  return !isPending;
}

async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? fallback;
  } catch {
    return fallback;
  }
}

export function useCourses(): { courses: Course[]; ready: boolean; reload: () => Promise<void> } {
  const authReady = useAuthReady();
  const [courses, setCourses] = useState<Course[]>([]);
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    if (!authReady) return;
    const response = await fetch("/api/courses", { cache: "no-store" });
    setCourses(response.ok ? ((await response.json()) as { courses: Course[] }).courses : []);
    setReady(true);
  }, [authReady]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { courses, ready, reload };
}

export function useCourse(
  courseId: string,
): { course: Course | undefined; ready: boolean; reload: () => Promise<void> } {
  const authReady = useAuthReady();
  const [course, setCourse] = useState<Course | undefined>(undefined);
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    if (!authReady) return;
    const response = await fetch(`/api/courses/${courseId}`, { cache: "no-store" });
    setCourse(response.ok ? ((await response.json()) as { course: Course }).course : undefined);
    setReady(true);
  }, [authReady, courseId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { course, ready, reload };
}

/** Creates a course workspace and returns it. Throws with a display message on failure. */
export async function createCourse(input: {
  name: string;
  institution: string;
  lesson: string;
}): Promise<Course> {
  const response = await fetch("/api/courses", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await readError(response, "Could not create the course workspace."));
  }
  return ((await response.json()) as { course: Course }).course;
}

/**
 * Uploads a file to a course's Sources. Goes through the route handler, which
 * stores the bytes in private object storage and records the material. Throws
 * with a display message on failure (unsupported type, too large, storage down).
 */
export async function uploadMaterial(courseId: string, file: File): Promise<SourceItem> {
  const body = new FormData();
  body.append("file", file);

  const response = await fetch(`/api/courses/${courseId}/materials`, {
    method: "POST",
    body,
  });
  if (!response.ok) {
    throw new Error(await readError(response, "Could not upload the material."));
  }
  return ((await response.json()) as { material: SourceItem }).material;
}

/**
 * Re-runs text extraction for a material, returning its refreshed state. Throws
 * with a display message on failure.
 */
export async function retryIngestion(courseId: string, materialId: string): Promise<SourceItem> {
  const response = await fetch(
    `/api/courses/${courseId}/materials/${materialId}/ingest`,
    { method: "POST" },
  );
  if (!response.ok) {
    throw new Error(await readError(response, "Could not reprocess the material."));
  }
  return ((await response.json()) as { material: SourceItem }).material;
}

/**
 * Removes a material from a course and cleans up its stored object. Throws with
 * a display message on failure.
 */
export async function removeMaterial(courseId: string, materialId: string): Promise<void> {
  const response = await fetch(`/api/courses/${courseId}/materials/${materialId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(await readError(response, "Could not remove the material."));
  }
}

/**
 * Runs Edvance's course analysis for a course, returning its refreshed state.
 * This is the only client entry point that triggers a model call, and it is
 * always an explicit learner action. Throws with a display message on failure.
 */
export async function analyseCourse(courseId: string): Promise<Course> {
  const response = await fetch(`/api/courses/${courseId}/analyse`, { method: "POST" });
  if (!response.ok) {
    throw new Error(await readError(response, "Course analysis did not finish. Please try again."));
  }
  return ((await response.json()) as { course: Course }).course;
}

/**
 * Checks one assessment question against the course's extracted concepts,
 * returning the refreshed course. Like course analysis this is an explicit
 * learner action; it never runs on a page refresh. Throws with a display
 * message on failure.
 */
export async function analyseAssessment(
  courseId: string,
  assessmentId: string,
): Promise<Course> {
  const response = await fetch(
    `/api/courses/${courseId}/assessments/${assessmentId}/analyse`,
    { method: "POST" },
  );
  if (!response.ok) {
    throw new Error(await readError(response, "Question analysis did not finish. Please try again."));
  }
  return ((await response.json()) as { course: Course }).course;
}

/**
 * Records one practice attempt and returns the refreshed course. Practising an
 * assessment question updates every concept that question tests; practising a
 * concept directly updates just that one. Mastery is derived from these
 * attempts, never assigned. Throws with a display message on failure.
 */
export async function recordPractice(
  courseId: string,
  input: { assessmentId?: string; conceptId?: string; answer?: string; correct: boolean },
): Promise<Course> {
  const response = await fetch(`/api/courses/${courseId}/practice`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await readError(response, "Could not record that practice attempt."));
  }
  return ((await response.json()) as { course: Course }).course;
}

/**
 * Generates targeted practice for the learner's weakest concepts, returning the
 * refreshed course. Like the other analyses this is an explicit learner action
 * and never runs on a page refresh. Throws with a display message on failure.
 */
export async function generateRevision(courseId: string): Promise<Course> {
  const response = await fetch(`/api/courses/${courseId}/revision`, { method: "POST" });
  if (!response.ok) {
    throw new Error(await readError(response, "Practice generation did not finish. Please try again."));
  }
  return ((await response.json()) as { course: Course }).course;
}

/** Renames / re-labels a course. Throws with a display message on failure. */
export async function updateCourse(
  courseId: string,
  input: { name?: string; institution?: string; lesson?: string },
): Promise<Course> {
  const response = await fetch(`/api/courses/${courseId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await readError(response, "Could not update the course."));
  }
  return ((await response.json()) as { course: Course }).course;
}

/** Deletes a course and everything it owns. Throws with a display message on failure. */
export async function deleteCourse(courseId: string): Promise<void> {
  const response = await fetch(`/api/courses/${courseId}`, { method: "DELETE" });
  if (!response.ok) {
    throw new Error(await readError(response, "Could not delete the course."));
  }
}

/**
 * Edits an assessment question. The stored check is discarded, so the question
 * must be checked again. Throws with a display message on failure.
 */
export async function updateAssessmentQuestion(
  courseId: string,
  assessmentId: string,
  input: { question?: string; lesson?: string },
): Promise<Course> {
  const response = await fetch(`/api/courses/${courseId}/assessments/${assessmentId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await readError(response, "Could not update the question."));
  }
  return ((await response.json()) as { course: Course }).course;
}

/** Deletes an assessment question. Throws with a display message on failure. */
export async function deleteAssessmentQuestion(
  courseId: string,
  assessmentId: string,
): Promise<Course> {
  const response = await fetch(`/api/courses/${courseId}/assessments/${assessmentId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(await readError(response, "Could not delete the question."));
  }
  return ((await response.json()) as { course: Course }).course;
}

/**
 * Deletes the signed-in learner's account and everything it owns. Throws with a
 * display message on failure.
 */
export async function deleteAccount(): Promise<{ emailSent: boolean }> {
  const response = await fetch("/api/account", { method: "DELETE" });
  if (!response.ok) {
    throw new Error(await readError(response, "Could not delete your account."));
  }
  return (await response.json()) as { emailSent: boolean };
}

/** Adds an assessment question to a course. Throws with a display message on failure. */
export async function addAssessmentQuestion(
  courseId: string,
  lesson: string,
  question: string,
): Promise<void> {
  const response = await fetch(`/api/courses/${courseId}/assessments`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ lesson, question }),
  });
  if (!response.ok) {
    throw new Error(await readError(response, "Could not add the question."));
  }
}
