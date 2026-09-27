import type { AssessmentItem, Course } from "./types";
import { MOCK_COURSES } from "./data";

const STORAGE_KEY = "edvance.courses.v1";

function readSaved(ownerEmail: string): Course[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${STORAGE_KEY}.${ownerEmail}`);
    return raw ? (JSON.parse(raw) as Course[]) : null;
  } catch {
    return null;
  }
}

function writeAll(ownerEmail: string, courses: Course[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${STORAGE_KEY}.${ownerEmail}`, JSON.stringify(courses));
}

export function getCourses(ownerEmail: string): Course[] {
  // Seed every new learner with the demo courses so a fresh workspace is never empty.
  return readSaved(ownerEmail) ?? MOCK_COURSES;
}

export function getCourse(ownerEmail: string, id: string): Course | undefined {
  return getCourses(ownerEmail).find((course) => course.id === id);
}

export function createCourse(
  ownerEmail: string,
  input: {
    name: string;
    institution: string;
    lesson: string;
  },
): Course {
  const course: Course = {
    id: `course-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: input.name.trim(),
    institution: input.institution.trim() || "Draft course",
    lesson: input.lesson.trim() || "Lesson 1",
    summary: "New workspace. Add learning materials in the Sources section.",
    concepts: [],
    sources: [],
    assessments: [],
    consistency: {
      status: "insufficient-evidence",
      reason: "No lesson evidence has been added yet, so consistency cannot be evaluated.",
      nextAction: "Add course materials to begin evaluating evidence.",
    },
  };
  writeAll(ownerEmail, [...getCourses(ownerEmail), course]);
  return course;
}

export function addAssessment(
  ownerEmail: string,
  courseId: string,
  lesson: string,
  question: string,
): Course | undefined {
  const courses = getCourses(ownerEmail);
  const index = courses.findIndex((course) => course.id === courseId);
  if (index === -1) return undefined;
  const item: AssessmentItem = {
    id: `question-${Date.now()}`,
    lesson: lesson.trim() || "Lesson 1",
    question: question.trim(),
  };
  const updated = [...courses];
  updated[index] = { ...courses[index], assessments: [...courses[index].assessments, item] };
  writeAll(ownerEmail, updated);
  return updated[index];
}
