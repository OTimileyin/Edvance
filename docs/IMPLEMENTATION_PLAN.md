# Edvance — Implementation Plan

**Status:** In progress — Phase 1 complete (2026-09-27)
**Source of truth:** `Doc/PRD.md` (PRD v2.0)
**Scope of this document:** Ordered, phased implementation plan with concrete outputs and acceptance criteria.

---

## 1. Technology Stack (from PRD §14)

| Layer | Decision |
|---|---|
| Framework | **Next.js with TypeScript** |
| Database | **PostgreSQL** (local only for now) |
| Authentication | **Better Auth** (later phase, not Lesson 6) |
| File storage | **Cloudflare R2** (later phase, not Lesson 6) |
| Local tooling | **Docker** (may run local services such as PostgreSQL); **Caddy** (reverse proxy, later if useful) |
| Future external services | AI model APIs, email services, transcription services, file-processing services |

---

## 2. Local Development Approach

- The application runs locally via the Next.js development server.
- PostgreSQL runs locally for the current development stage. Cloud database deployment is deferred.
- Confirmed architecture decision (2026-09-27, Product Owner): local PostgreSQL during this development stage; see PRD Appendix A, Decision 1.
- The browser is used to test the prototype.
- Public deployment is postponed and is **not** required for Lesson 6.
- Docker may be used to run local PostgreSQL.
- All prototype work in Lesson 6 uses **mock/test data only**.

---

## 3. Security Considerations

- No secrets may be committed to the public repository.
- `.gitignore` must exclude `node_modules`, `.env*`, build output, and runtime artifacts.
- Do not commit API keys, tokens, passwords, or secret `.env` files.
- Lesson 6 uses test data only; no real user content is processed or stored.
- Future source references must accurately correspond to the cited material (reliability).
- Clearly distinguish evidence-backed information, inferred information, and insufficient evidence (transparency).
- Later phases with user uploads must include clear privacy and storage controls.

---

## 4. Required for the Current Lesson 6 Prototype

The Lesson 6 deliverable is a **single working local page** demonstrating the signature **Assessment Intelligence** experience.

- Next.js + TypeScript project that opens locally.
- `design.html` — standalone design-system preview.
- An initial working Edvance application page, **separate from** `design.html`.
- The **Assessment Intelligence View** as the first signature experience.
- Mock/test data only.
- No working authentication.
- No real database tests.
- No live AI API calls.

---

## 5. Deferred to Later Phases

- Working authentication (Better Auth) — Phase 3.
- Production database integration and cloud database deployment — Phase 4 onward.
- Real file upload pipeline and production storage (Cloudflare R2) — Phase 5.
- Real course ingestion — Phase 5.
- Course intelligence / assessment intelligence / mastery intelligence / targeted revision (requiring live AI services) — Phases 6–9.
- Public deployment.
- Payment integration.
- AI-generated podcasts, social feeds, full LMS replacement, instructor grading automation, complex gamification, AI avatars, automatic certification.

---

## 6. High-Level Data Model (from PRD §15, for later phases)

`User`, `Course`, `LearningMaterial`, `Concept`, `AssessmentQuestion`, `SourceMapping`, `ConsistencyFinding`, `MasteryState` as defined in the PRD. Schema and migrations arrive in Phase 4.

---

## 7. Phases

### Current Status

**Current phase:** Phase 1 — Design System & Assessment Intelligence Prototype (complete).

**Completed:**
- Implementation plan created.
- Architecture reviewed; local PostgreSQL selected for later data integration (PRD Appendix A, Decision 1).
- `design.html` created; design refinements completed and applied (PRD Appendix A, Change 2).
- Initial Assessment Intelligence page built (`assessment-intelligence.html`).
- Local prototype tested in the browser with mock data only.

**Not yet implemented:**
- Better Auth.
- PostgreSQL application integration.
- Cloudflare R2.
- Real course ingestion.
- Live AI APIs.
- Source-processing pipeline.
- Production deployment.

**Next phase:** Phase 2 — Core Application Structure (course workspace, navigation, Courses / Sources / Assessments / Mastery sections, responsive layout).

---

### Phase 0 — Project Foundation

**Goal:** Establish the project environment and documentation.

**Outputs:**
- Next.js + TypeScript project structure (App Router, TypeScript strict).
- Public GitHub repository maintained at https://github.com/OTimileyin/Edvance.
- `docs/IMPLEMENTATION_PLAN.md` (this plan).
- Updated `README.md` describing Edvance and pointing to the current PRD.
- `.gitignore` covering `node_modules`, `.env*`, build output, and runtime artifacts.
- Local development instructions (install, run, test in browser).

**Acceptance Criteria:**
- [ ] Project opens locally (`npm install`, `npm run dev`).
- [ ] Repository is public.
- [ ] PRD exists (`Doc/PRD.md`).
- [ ] No secrets are committed.

---

### Phase 1 — Design System & Assessment Intelligence Prototype

**Goal:** Create the visual language and build one local page that communicates the signature Edvance experience.

This is the **Lesson 6 deliverable**.

**Outputs:**

1. `design.html` — standalone design-system preview (opens directly in the browser, no build tooling):
   - Edvance color palette with tokens as defined in PRD §17.
   - Typography examples using Inter, system-ui, sans-serif.
   - A styled primary button.
   - A styled sample text input.
   - At least one Edvance-specific component (e.g., Evidence Card, Concept Chip, Consistency Badge, Mastery Indicator, Revision Recommendation Card).

2. Initial application page, **separate from** `design.html` — an **Assessment Intelligence** page containing:
   - Edvance product header.
   - Assessment question.
   - Concepts being tested.
   - Supporting evidence.
   - Consistency status.
   - Mastery status.
   - Recommended revision.

3. Mock/test data only (PRD §19):
   - Course: Qubators AI Foundry.
   - Lesson: Prompt Engineering.
   - Assessment: "What are the five components of the PROMPT framework?"
   - Course evidence: Purpose, Role, Objective, Method, Parameters, Target Output.
   - Consistency status: Possible inconsistency (assessment asks for 5; evidence contains 6).
   - Weak areas: Parameters, Target Output.
   - Next action: Review the relevant lesson evidence before attempting the assessment.

**Acceptance Criteria:**
- [x] `design.html` opens locally.
- [x] Color palette is visible.
- [x] Typography examples are visible.
- [x] Styled primary button is visible.
- [x] Styled sample input is visible.
- [x] At least one Edvance-specific component is visible.
- [x] Initial app page opens locally.
- [x] App page is separate from `design.html`.
- [x] Mock/test data only is used.
- [x] Design refinement requested by the Product Owner is documented in PRD Appendix A and visibly reflected in `design.html`.
- [ ] Code is pushed to the public GitHub repository. *(Pending — Phase 1 files are not yet committed/pushed.)*
- [x] No secrets are committed.

---

### Phase 2 — Core Application Structure

**Goal:** Build the learner experience around courses and course evidence.

**Outputs:**
- Course workspace (create/open a course).
- Navigation between Courses, Sources, Assessments, and Mastery.
- Sources section (list course evidence/materials).
- Assessments section (list and add assessment questions).
- Mastery section (visualise per-concept status).
- Basic responsive layout.

**Acceptance Criteria:**
- [ ] App runs locally.
- [ ] A course workspace can be created and opened.
- [ ] Navigation moves between the main sections.
- [ ] Sections render from mock data (no backend yet).
- [ ] Layout works on mobile and desktop within practical limits.

---

### Phase 3 — Accounts & Authentication

**Technology:** Better Auth

**Goal:** Introduce user identity and protected experiences.

**Outputs:**
- Local sign-in/sign-up flows with Better Auth.
- `User` identity linked to courses and mastery state.
- Protected application routes.

**Acceptance Criteria:**
- [ ] Sign-up and sign-in work locally.
- [ ] Authenticated users can create courses.
- [ ] Unauthenticated access to protected routes is blocked.
- [ ] No credentials or session secrets are committed.

---

### Phase 4 — Course Data & PostgreSQL

**Technology:** PostgreSQL (local)

**Goal:** Persist structured course and learner records.

**Outputs:**
- Schema and migrations for the PRD data model (`User`, `Course`, `LearningMaterial`, `Concept`, `AssessmentQuestion`, `SourceMapping`, `ConsistencyFinding`, `MasteryState`).
- Local PostgreSQL instance (optionally via Docker).
- Repository/data-access layer used by the app.

**Acceptance Criteria:**
- [ ] PostgreSQL runs locally and connects to the app.
- [ ] Migrations apply cleanly.
- [ ] Courses, materials, concepts, assessments, mappings, consistency findings, and mastery states persist and read back correctly.

---

### Phase 5 — Course Material Ingestion

**Planned storage:** Cloudflare R2

**Goal:** Allow real course material into the evidence pipeline.

**Outputs:**
- File upload flow for PDFs, text, transcripts, notes, and documents.
- Storage in Cloudflare R2 with a stored `storageReference` on `LearningMaterial`.
- Processing pipeline to prepare materials for course intelligence.

**Acceptance Criteria:**
- [ ] Files upload and are retrievable via R2.
- [ ] Uploaded materials appear in the Sources section.
- [ ] Failed/unsupported files are handled gracefully.

---

### Phase 6 — Course Intelligence

**Goal:** Extract structured knowledge while preserving instructor terminology and source evidence.

**Outputs:**
- Concept extraction from course materials.
- Instructor terminology/framework preservation.
- Concept-to-source references (where each concept was taught).
- Course map of concept relationships.

**Acceptance Criteria:**
- [ ] Concepts and instructor terms are extracted from supplied materials.
- [ ] Each extracted claim carries a `sourceReference`.
- [ ] Concepts map to source locations in the original material.

---

### Phase 7 — Assessment Intelligence

**Goal:** Connect assessment questions to concepts, sources, and consistency checks.

**Outputs:**
- Assessment-to-source mapping (`SourceMapping`).
- Consistency status evaluation (`Consistent`, `Possible inconsistency`, `Insufficient evidence`).
- `ConsistencyFinding` records showing Source A, Source B, description, and status.

**Acceptance Criteria:**
- [ ] An assessment question is mapped to relevant concepts and sources.
- [ ] Detected inconsistencies are displayed with evidence.
- [ ] Uncertain outcomes are labelled `Insufficient evidence` rather than guessed.

---

### Phase 8 — Mastery Intelligence

**Goal:** Connect learner performance to assessed concepts.

**Outputs:**
- `MasteryState` per user per concept (status and score).
- Mastery profile marking Mastered / Developing / Weak / Untested concepts.

**Acceptance Criteria:**
- [ ] Practice/self-assessment updates concept mastery status.
- [ ] Mastery profile reflects changes correctly.

---

### Phase 9 — Targeted Revision

**Goal:** Turn evidence and mastery into a useful next action.

**Outputs:**
- Revision recommendation based on the learner's weak concepts.
- Targeted practice questions generated from weak areas (not random across the course).

**Acceptance Criteria:**
- [ ] Recommendations reference the smallest useful next action.
- [ ] Practice generation focuses on weak/untested concepts.

---

## 8. Definition of MVP Success (PRD §23)

The full MVP is successful when a learner can:
1. Add course material.
2. Add an assessment question.
3. See what concepts the question requires.
4. See where those concepts were taught.
5. See when course evidence appears inconsistent with the assessment.
6. See which required concepts are weak.
7. Receive targeted revision recommendations.

## 9. Lesson 6 Success (PRD §21)

- Product value is understandable from one screen.
- Signature assessment-intelligence flow is visible.
- Page opens locally.
- Design system is consistent.
- Steering decisions are documented (PRD Appendix A — Agent Steering & Decision Log).

---

## 10. Governance

- PRD Appendix A **must** reflect real steering instructions and real, visible repository changes. Do not claim a change was implemented until it actually was.
- Before implementing later phases, major architectural choices and reasonable alternatives must be explained for the Product Owner to review and steer.