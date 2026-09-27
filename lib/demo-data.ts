import type { CourseConsistency } from "./types";

export type CourseCreateInput = {
  name: string;
  institution: string;
  lesson: string;
};

/**
 * Demo seed data. In Phase 2 this was the fallback for the single shared
 * localStorage; from Phase 3 it seeds each new user's per-user workspace the
 * first time they open Courses.
 */
export const DEMO_COURSES: CourseCreateInput[] = [
  { name: "Qubators AI Foundry", institution: "Qubators", lesson: "Prompt Engineering" },
  { name: "Telling Stories with Data", institution: "Qubators", lesson: "Choosing the Right Chart" },
];

export function emptyConsistency(): CourseConsistency {
  return {
    status: "insufficient-evidence",
    reason: "No lesson evidence has been added yet, so consistency cannot be evaluated.",
    nextAction: "Add course materials to begin evaluating evidence.",
  };
}
