"use client";

import { useCallback, useEffect, useState } from "react";
import { authClient } from "./auth-client";
import { getCourse, getCourses } from "./store";
import type { Course } from "./types";

/**
 * Resolves the signed-in user's email (Better Auth session) and scopes all
 * course reads to it. Hooks wait until the auth state is known (`authReady`)
 * before reading storage, so the first paint after sign-in is correct.
 */
function useOwnerEmail(): { email: string | null; authReady: boolean } {
  const { data, isPending } = authClient.useSession();
  return { email: data?.user.email ?? null, authReady: !isPending };
}

export function useCourses(): { courses: Course[]; ready: boolean } {
  const { email, authReady } = useOwnerEmail();
  const [courses, setCourses] = useState<Course[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!authReady) return;
    if (!email) {
      setCourses([]);
      setReady(true);
      return;
    }
    setCourses(getCourses(email));
    setReady(true);
  }, [authReady, email]);

  return { courses, ready };
}

export function useCourse(
  courseId: string,
): { course: Course | undefined; ready: boolean; reload: () => void } {
  const { email, authReady } = useOwnerEmail();
  const [course, setCourse] = useState<Course | undefined>(undefined);
  const [ready, setReady] = useState(false);

  const reload = useCallback(() => {
    if (!authReady) return;
    if (!email) {
      setCourse(undefined);
      setReady(true);
      return;
    }
    setCourse(getCourse(email, courseId));
    setReady(true);
  }, [authReady, email, courseId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { course, ready, reload };
}
