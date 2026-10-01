"use client";

import { useCallback, useEffect, useState } from "react";
import { authClient } from "./auth-client";
import type { Course } from "./types";

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
