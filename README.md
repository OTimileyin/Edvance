# Edvance

**AI-Powered Course Intelligence Platform**

## Product Overview

Edvance is an AI-powered course intelligence platform that helps learners understand what their instructor actually taught, determine what they are expected to master, and identify the areas where they still need improvement.

Learners receive course content through many disconnected sources such as lecture videos, slides, PDFs, notes, course outlines, assignments, and assessments. Edvance brings these materials together into a structured learning workspace: it analyzes course content, preserves instructor-specific terminology, maps assessments back to supporting learning materials, identifies inconsistencies between sources, and helps learners focus their revision on genuine mastery gaps.

Edvance is not another generic AI summarizer. Its core value is understanding the structure and expectations of a specific course.

## Target Users

Edvance is designed for learners in structured programmes:

- University students
- Bootcamp participants
- Fellowship and cohort-based learners
- Students preparing for examinations or assessments
- Learners taking structured online courses

## Problem Being Solved

Learners must manually connect fragmented course materials such as recorded lectures, slides, PDFs, class notes, outlines, assignments, and assessment questions. This creates several problems:

- Important concepts can be missed during revision.
- Learners may not know which parts of a lecture relate to an assessment.
- Instructor-specific terminology may be replaced by generic explanations.
- Contradictions between slides, lectures, and assessments may go unnoticed.
- Learners may study concepts they already understand while neglecting weak areas.
- Generic AI assistants may provide answers not grounded in what the instructor actually taught.

The core problem is lack of alignment between learning materials, assessment expectations, and the learner's actual understanding.

## Main User Journey

1. Create a course workspace.
2. Add learning materials (lectures, slides, PDFs, notes, outlines, assessments).
3. Edvance analyzes the materials and extracts concepts, terminology, and frameworks.
4. Edvance builds a course map showing how taught topics relate to each other.
5. Assessment questions are mapped to relevant lectures, timestamps, slides, notes, and concepts.
6. Edvance detects possible inconsistencies across sources and shows the evidence.
7. The learner answers practice questions, building a mastery profile.
8. Edvance generates targeted revision focused on weak areas.

## Core MVP Features

- **Course Workspace** — create a workspace for each course.
- **Learning Material Upload** — provide PDFs, text, lecture transcripts, notes, and assessment questions.
- **Course Concept Extraction** — identify terms, definitions, topics, frameworks, and relationships.
- **Assessment-to-Source Mapping** — connect an assessment question to the course materials most relevant to answering it.
- **Course Inconsistency Detector** — flag conflicting information across learning materials with the supporting evidence.
- **Mastery Gap Identification** — record performance on practice questions and identify topics needing revision.
- **Targeted Practice** — generate practice questions based on weak concepts.

## Key Differentiating Features

- **Assessment-to-Source Mapping** — connect an assessment question directly to the material where the required knowledge was taught.
- **Course Consistency Intelligence** — detect possible mismatches between lectures, slides, notes, outlines, and assessments.
- **Instructor Vocabulary Preservation** — recognize and retain instructor-specific frameworks and terminology.
- **Mastery Mapping** — show what the learner has mastered and what should be studied next.

## Project Status

Phase 1 — Design System & Assessment Intelligence Prototype is complete. The product requirements are defined in `Doc/Edvance_PRD_v2_Assessment_Ready.md` (source of truth), with the plan in `docs/IMPLEMENTATION_PLAN.md`. The current deliverable is a local Assessment Intelligence prototype page that runs in the browser on mock data only. Later capabilities (Better Auth, PostgreSQL integration, Cloudflare R2, real course ingestion, live AI APIs, source processing, and production deployment) are not yet implemented.

## Running the Local Prototype

Phase 1 is plain HTML/CSS — there is no build tooling and no install step.

1. Open `design.html` to view the design-system preview (colors, typography, buttons, inputs, Edvance components).
2. Open `assessment-intelligence.html` to view the Assessment Intelligence app page (question, concepts, evidence, consistency, mastery, revision).

Both files load directly in any modern browser (double-click them). The app page uses mock/test data only — no server, database, or live AI APIs are involved. The Inter font is loaded from Google Fonts, so the pages look their best with an internet connection but still render without it.

## Documentation

- [Product Requirements Document](Doc/Edvance_PRD_v2_Assessment_Ready.md) — the full product specification, persona, MVP scope, and success metrics.
- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md) — ordered phases with outputs, acceptance criteria, and current status.