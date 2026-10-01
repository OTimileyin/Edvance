import type { Course } from "./types";

/**
 * Demo seed content. Phase 4 moved course storage into PostgreSQL, so this is
 * no longer read by the UI: it is the dataset the repository inserts the first
 * time a learner opens their workspace. Real ingestion (Phase 5) will replace
 * it with materials the learner actually uploads.
 */
/**
 * Demo workspaces have no real intelligence: nothing has been analysed, and
 * Edvance never ships a seeded concept as if it were extracted from evidence.
 */
const NO_INTELLIGENCE: Course["intelligence"] = {
  status: "not-analyzed",
  errorCode: null,
  errorSummary: null,
  conceptCount: 0,
  relationshipCount: 0,
  analyzedAt: null,
  provider: null,
  concepts: [],
  relationships: [],
};

/**
 * A demo question has never been checked against real evidence, and the seed
 * data never claims otherwise: no concepts, no verdict, no invented citation.
 */
const NO_SIGNATURE: Course["assessments"][number]["signature"] = {
  status: "not-analyzed",
  errorCode: null,
  errorSummary: null,
  consistency: "insufficient-evidence",
  reason: "This is demo content. It has not been checked against your own materials.",
  nextAction: "Upload your own materials, analyse the course, then check this question.",
  analyzedAt: null,
  provider: null,
  concepts: [],
};

export const SEED_COURSES: Course[] = [
  {
    id: "ai-foundry",
    name: "Qubators AI Foundry",
    institution: "Qubators",
    lesson: "Prompt Engineering",
    summary:
      "How to write reliable prompts. The lesson introduces the PROMPT framework as the course's core vocabulary.",
    concepts: [
      { name: "Purpose", status: "Mastered", score: 85 },
      { name: "Role", status: "Mastered", score: 90 },
      { name: "Objective", status: "Developing", score: 60 },
      { name: "Method", status: "Mastered", score: 80 },
      { name: "Parameters", status: "Weak", score: 35 },
      { name: "Target Output", status: "Weak", score: 30 },
    ],
    sources: [
      { id: "s1", type: "Lecture", title: "Lesson 2 — Prompt Engineering (full session)", location: "video · 18 min" },
      { id: "s2", type: "Transcript", title: "Lesson 2 transcript — PROMPT framework walkthrough", location: "@04:12" },
      { id: "s3", type: "Slide", title: "PROMPT framework — six components deck", location: "slide 7" },
      { id: "s4", type: "Slide", title: "Instructor terminology — framework vocabulary", location: "@01:37" },
      { id: "s5", type: "Notes", title: "Class notes — parameters vs target output", location: "notes p.14" },
      { id: "s6", type: "Outline", title: "Course outline — Prompt Engineering unit", location: "unit 2" },
    ],
    assessments: [
      {
        id: "a1",
        lesson: "Prompt Engineering",
        question: "What are the five components of the PROMPT framework?",
        signature: NO_SIGNATURE,
      },
      {
        id: "a2",
        lesson: "Prompt Engineering",
        question: "When would you constrain the Parameters of a prompt?",
        signature: NO_SIGNATURE,
      },
    ],
    consistency: {
      status: "possible-inconsistency",
      reason:
        "Assessment wording asks for five components while the supplied lesson evidence contains six (Purpose, Role, Objective, Method, Parameters, Target Output).",
      nextAction: "Review the relevant lesson evidence before attempting the assessment.",
    },
    intelligence: NO_INTELLIGENCE,
  },
  {
    id: "storytelling-with-data",
    name: "Telling Stories with Data",
    institution: "Qubators",
    lesson: "Choosing the Right Chart",
    summary:
      "How to match a chart type to the question being asked, and how color and annotation guide the reader.",
    concepts: [
      { name: "Chart types", status: "Mastered", score: 80 },
      { name: "Axes & scales", status: "Developing", score: 55 },
      { name: "Color encoding", status: "Weak", score: 40 },
      { name: "Annotation density", status: "Developing", score: 65 },
    ],
    sources: [
      { id: "s1", type: "Lecture", title: "Lesson 4 — Choosing the Right Chart (session)", location: "video · 22 min" },
      { id: "s2", type: "Slide", title: "Chart choice decision tree deck", location: "slide 12" },
      { id: "s3", type: "Transcript", title: "Lecture 4 transcript — color and annotation", location: "@03:10" },
      { id: "s4", type: "PDF", title: "Data storytelling guide (course reader)", location: "pp. 44–58" },
    ],
    assessments: [
      {
        id: "a1",
        lesson: "Choosing the Right Chart",
        question: "When would you prefer a bar chart over a line chart?",
        signature: NO_SIGNATURE,
      },
      {
        id: "a2",
        lesson: "Choosing the Right Chart",
        question: "What role does color encoding play in chart readability?",
        signature: NO_SIGNATURE,
      },
    ],
    consistency: {
      status: "consistent",
      reason: "The assessment wording matches the supplied lesson evidence. No contradictions detected.",
      nextAction: "Attempt the practice set on chart selection.",
    },
    intelligence: NO_INTELLIGENCE,
  },
];