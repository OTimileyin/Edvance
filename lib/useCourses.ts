"use client";

import { useCallback, useEffect, useState } from "react";
import { getCourse, getCourses } from "./store";
import type { Course } from "./types";

export function useCourses(): { courses: Course[]; ready: boolean } {
  const [courses, setCourses] = useState<Course[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setCourses(getCourses());
    setReady(true);
  }, []);

  return { courses, ready };
}

export function useCourse(
  courseId: string,
): { course: Course | undefined; ready: boolean; reload: () => void } {
  const [course, setCourse] = useState<Course | undefined>(undefined);
  const [ready, setReady] = useState(false);

  const reload = useCallback(() => {
    setCourse(getCourse(courseId));
    setReady(true);
  }, [courseId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { course, ready, reload };
}