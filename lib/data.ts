import type { ExtractedBlock, SourceLocationType } from "./extraction/types";
import type { Course, IngestionMetadata, SourceItem } from "./types";

/**
 * Demo seed content. Phase 4 moved course storage into PostgreSQL, so this is
 * no longer read by the UI: it is the dataset the repository inserts the first
 * time a learner opens their workspace. Real ingestion (Phase 5) will replace
 * it with materials the learner actually uploads.
 */
/**
 * Demo workspaces have no real intelligence: nothing has been analysed, and
 * Oyevolve never ships a seeded concept as if it were extracted from evidence.
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

/**
 * A demo course has no revision recommendation: nothing has been analysed, so
 * there are no evidence-grounded concepts to be weak on. Oyevolve says what to
 * do to get there rather than inventing a focus.
 */
const NO_REVISION: Course["revision"] = {
  status: "not-analyzed",
  errorCode: null,
  errorSummary: null,
  generatedAt: null,
  provider: null,
  nextAction:
    "Analyse the course to extract the concepts your materials teach, then record some practice.",
  focus: [],
  practiceQuestions: [],
};

/**
 * A demo source carries written excerpts of the lesson it stands for, each
 * tagged with the location it would have come from. Seeding turns these into
 * real `material_chunk` rows through the same chunker the upload pipeline uses,
 * so a demo workspace reaches the point where the course can be analysed —
 * without pretending a file was ever uploaded (`storage_reference` stays null).
 */
export type SeedSource = SourceItem & { blocks: ExtractedBlock[] };

/**
 * A demo course is a real `Course` whose sources additionally carry the text
 * those sources contribute as evidence.
 */
export type SeedCourse = Omit<Course, "sources"> & { sources: SeedSource[] };

/** The unit noun each location kind is counted in, as the extractors do. */
const SEED_UNITS: Record<SourceLocationType, NonNullable<IngestionMetadata["unit"]>> = {
  page: "page",
  slide: "slide",
  timestamp: "cue",
  section: "section",
  line: "line",
};

/**
 * The factual extraction metadata for a demo source: what its locations are
 * counted in, and how many distinct located passages it actually contributes.
 * Derived from the authored blocks, never hand-written, so it cannot drift.
 */
export function seedExtractionMetadata(source: SeedSource): IngestionMetadata {
  const locations = new Set(source.blocks.map((block) => block.location.label));
  const kind = source.blocks[0]?.location.type ?? "section";
  return { unit: SEED_UNITS[kind], count: locations.size };
}

export const SEED_COURSES: SeedCourse[] = [
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
      {
        id: "s1",
        type: "Lecture",
        title: "Lesson 2 — Prompt Engineering (full session)",
        location: "video · 18 min",
        blocks: [
          {
            location: {
              type: "timestamp",
              label: "00:00:31–00:01:05",
              startTime: "00:00:31",
              endTime: "00:01:05",
            },
            text: "Every prompt in this course is built from six components: Purpose, Role, Objective, Method, Parameters and Target Output. Together they spell PROMPT. We start with Purpose because it is the decision that narrows every choice after it.",
          },
          {
            location: {
              type: "timestamp",
              label: "00:01:05–00:02:10",
              startTime: "00:01:05",
              endTime: "00:02:10",
            },
            text: "Purpose names why the prompt exists and what a good result looks like. When the purpose is vague, the model fills the gap with its own assumptions, and you end up judging the output against a standard you never stated.",
          },
          {
            location: {
              type: "timestamp",
              label: "00:11:40–00:12:30",
              startTime: "00:11:40",
              endTime: "00:12:30",
            },
            text: "Parameters set how constrained the output is: length, tone, format, and what the model must not do. Target Output describes the artifact itself, the shape the learner receives. Constrain the Parameters when the output has to be reused; describe the Target Output when it has to be recognised on sight.",
          },
        ],
      },
      {
        id: "s2",
        type: "Transcript",
        title: "Lesson 2 transcript — PROMPT framework walkthrough",
        location: "@04:12",
        blocks: [
          {
            location: {
              type: "timestamp",
              label: "00:04:12–00:04:48",
              startTime: "00:04:12",
              endTime: "00:04:48",
            },
            text: "R — Role. Role tells the model who it is being for this task. It is not flattery; it selects the vocabulary and the level of knowledge the answer assumes. 'You are a first-year tutor' and 'you are a subject examiner' produce different answers to the same question.",
          },
          {
            location: {
              type: "timestamp",
              label: "00:04:48–00:05:30",
              startTime: "00:04:48",
              endTime: "00:05:30",
            },
            text: "O — Objective is the single measurable thing this prompt has to achieve. If you cannot say afterwards whether the Objective was met, it is not an Objective yet. It is a hope.",
          },
          {
            location: {
              type: "timestamp",
              label: "00:05:30–00:06:05",
              startTime: "00:05:30",
              endTime: "00:06:05",
            },
            text: "M — Method is how the model should work: reason first and then answer, ask one clarifying question, or follow a supplied outline. Method shapes the route; Objective shapes the destination.",
          },
        ],
      },
      {
        id: "s3",
        type: "Slide",
        title: "PROMPT framework — six components deck",
        location: "slide 7",
        blocks: [
          {
            location: { type: "slide", label: "Slide 7", slide: 7 },
            text: "PROMPT — six components: Purpose (why), Role (who), Objective (what), Method (how), Parameters (limits), Target Output (the artifact). Every component earns its place by removing one ambiguity from the request.",
          },
        ],
      },
      {
        id: "s4",
        type: "Slide",
        title: "Instructor terminology — framework vocabulary",
        location: "@01:37",
        blocks: [
          {
            location: {
              type: "timestamp",
              label: "00:01:37–00:01:54",
              startTime: "00:01:37",
              endTime: "00:01:54",
            },
            text: "The instructor's terminology matters more than a synonym. When the lesson says Parameters, use Parameters. An analysis that renames the course's vocabulary makes it harder to trace a concept back to the slide that taught it.",
          },
        ],
      },
      {
        id: "s5",
        type: "Notes",
        title: "Class notes — parameters vs target output",
        location: "notes p.14",
        blocks: [
          {
            location: {
              type: "section",
              label: "Section: Parameters vs Target Output",
              section: "Parameters vs Target Output",
            },
            text: "Parameters and Target Output are the two components learners most often swap. Parameters are the boundaries on the model's freedom; Target Output is the deliverable. A prompt can pin the Target Output and leave the Parameters wide open, and it can do the reverse.",
          },
          {
            location: {
              type: "section",
              label: "Section: Worked example — weak and strong prompt",
              section: "Worked example — weak and strong prompt",
            },
            text: "Weak: 'write a summary of lesson 2.' Strong: 'You are a tutor writing for a learner who missed the class: summarise lesson 2 as five bullet points the learner can skim in a minute, each bullet naming one PROMPT component, using the lesson's own terms.' The second prompt states Role, Purpose, Target Output and Parameters before the model writes anything.",
          },
        ],
      },
      {
        id: "s6",
        type: "Outline",
        title: "Course outline — Prompt Engineering unit",
        location: "unit 2",
        blocks: [
          {
            location: {
              type: "section",
              label: "Section: Unit 2 — Prompt Engineering",
              section: "Unit 2 — Prompt Engineering",
            },
            text: "Unit 2 covers the PROMPT framework across two sessions. Lesson 2 introduces the six components and the order in which they are decided. The assessment asks learners to recall the components and to justify when Parameters should be constrained.",
          },
        ],
      },
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
    attempts: [],
    revision: NO_REVISION,
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
      {
        id: "s1",
        type: "Lecture",
        title: "Lesson 4 — Choosing the Right Chart (session)",
        location: "video · 22 min",
        blocks: [
          {
            location: {
              type: "timestamp",
              label: "00:00:18–00:00:58",
              startTime: "00:00:18",
              endTime: "00:00:58",
            },
            text: "A chart answers a question, and the shape of the question decides the shape of the chart. Comparing categories wants bars, change over time wants a line, and a single share of a whole rarely wants a pie.",
          },
          {
            location: {
              type: "timestamp",
              label: "00:02:14–00:02:55",
              startTime: "00:02:14",
              endTime: "00:02:55",
            },
            text: "Chart types are not interchangeable decoration. Before choosing one, write the sentence the chart is meant to make the reader say. If you cannot write that sentence, the chart choice is premature.",
          },
        ],
      },
      {
        id: "s2",
        type: "Slide",
        title: "Chart choice decision tree deck",
        location: "slide 12",
        blocks: [
          {
            location: { type: "slide", label: "Slide 12", slide: 12 },
            text: "Decision tree: is the reader comparing categories, tracking change, or reading one value? Comparing categories points to a bar chart, tracking change points to a line, and a single value in context points to one large number with a reference rather than a chart.",
          },
        ],
      },
      {
        id: "s3",
        type: "Transcript",
        title: "Lecture 4 transcript — color and annotation",
        location: "@03:10",
        blocks: [
          {
            location: {
              type: "timestamp",
              label: "00:03:10–00:03:48",
              startTime: "00:03:10",
              endTime: "00:03:48",
            },
            text: "Color encoding is a scale, not a palette. Use it when it carries meaning such as magnitude, category or emphasis, and keep it to one meaning at a time. A chart that uses color for two purposes at once makes the reader stop and decode instead of read.",
          },
          {
            location: {
              type: "timestamp",
              label: "00:03:48–00:04:20",
              startTime: "00:03:48",
              endTime: "00:04:20",
            },
            text: "Annotation density is the reader's cost. Every label, arrow and callout has to earn its place by answering a question the reader would otherwise have to ask. Two annotations that make the same point are one too many.",
          },
        ],
      },
      {
        id: "s4",
        type: "PDF",
        title: "Data storytelling guide (course reader)",
        location: "pp. 44–58",
        blocks: [
          {
            location: { type: "page", label: "Page 44", page: 44 },
            text: "Axes and scales set the comparison the reader is able to make. A truncated axis exaggerates a difference, and a zero baseline is honest for counts but not always for rates. State the choice in the caption so the chart can be judged on its merits.",
          },
          {
            location: { type: "page", label: "Page 51", page: 51 },
            text: "Color encoding on a continuous scale should change in one direction only. Diverging palettes imply a midpoint the data may not have, and categorical palettes imply no order at all. Using one where the other belongs implies a claim about the data that was never made.",
          },
        ],
      },
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
      reason:
        "The assessment wording matches the supplied lesson evidence. No contradictions detected.",
      nextAction: "Attempt the practice set on chart selection.",
    },
    intelligence: NO_INTELLIGENCE,
    attempts: [],
    revision: NO_REVISION,
  },
];
