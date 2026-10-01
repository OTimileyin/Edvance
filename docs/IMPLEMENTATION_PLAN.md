# Edvance — Implementation Plan

**Status:** In progress — Phases 5, 5.6, 6 (Course Intelligence), 7 (Assessment Intelligence), 8 (Mastery Intelligence) and 9 (Targeted Revision) complete and verified end to end (2026-10-02), including a verified live Google Gemini call; next phase Phase 10
**Source of truth:** `Doc/PRD.md` (PRD v2.0)
**Scope of this document:** Ordered, phased implementation plan with concrete outputs and acceptance criteria.

---

## 1. Technology Stack (from PRD §14)

| Layer | Decision |
|---|---|
| Framework | **Next.js with TypeScript** |
| Database | **PostgreSQL** (local only for now) |
| Authentication | **Better Auth** (later phase, not Lesson 6) |
| File storage | **Supabase Storage** (private bucket; later phase, not Lesson 6) |
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
- Schema migrations are plain SQL files in `db/migrations/` applied by `npm run migrate` (a small Node runner over the existing `pg` dependency, tracked in `schema_migrations`). No ORM is introduced.
- New learners are seeded with the demo workspaces on first visit (`ensureSeeded`), so a fresh account is never empty. Real ingestion replaces this in Phase 5.

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
- Real file upload pipeline and production storage (Supabase Storage) — Phase 5 (done).
- Real course ingestion — text extraction & evidence chunking in Phase 5.6 (done); AI-assisted course intelligence remains Phase 6.
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

**Current phase:** Phase 7 — Assessment Intelligence — **complete and verified end to end, including a real Google Gemini call**: each assessment question is judged against the concepts the course's own materials taught, and the live model correctly flags the canonical six-versus-five inconsistency (see Appendix A, Change 16). It builds on Phase 6 — Course Intelligence — complete and verified end to end (`GEMINI_API_KEY` present in Infisical; see Appendix A, Change 15). It builds on Phase 5.6 — Text Extraction & Evidence Chunking — complete and verified end to end (`Doc/PRD.md` Appendix A, Change 14), which builds on Phase 5 — Course Material Ingestion (Supabase Storage), complete and verified (Changes 12–13). Phase 4 is complete (Change 11), on top of Phases 1–3 with steering additions: landing page and demo sign-in (Change 6), the "Field Guide" visual redesign (Change 7), the "Press Room" redesign + Edvance logo (Change 9), and the interface sheet re-pointed at the live app (Change 10).

**Completed:**
- Phase 1 — Design System & Assessment Intelligence Prototype (static local pages, mock data; `design.html`, `assessment-intelligence.html`).
- Phase 2 — Core Application Structure.
  - Next.js + TypeScript app (App Router); `npm run dev` serves it at `http://localhost:3000`.
  - Course workspace with create/open; created workspaces persist via `localStorage`.
  - Navigation between Courses, Sources, Assessments, and Mastery.
  - Sources, Assessments (list + add), and Mastery sections rendering from mock data.
  - Responsive, accessible layout using the approved design system.
- Landing page and demo sign-in (steering addition).
  - Landing page at `/` (hero, questions, features, how-it-works, demo status).
  - Sign-in/sign-up create a local demo session (`localStorage`) and enter `/courses`.
  - App routes gated behind the demo session; header shows user + Sign out.
  - This is a demo UX only — real Better Auth remains Phase 3, never conflated with it.
- "Field Guide" visual redesign (steering addition, Change 7).
  - Design system rebuilt around forest/paper/coral palette, Fraunces display serif + Inter body, glassmorphism panels, stamp badges, and tinted journey tiles, fused from three Product Owner reference designs.
  - Applied across the landing page, split-screen sign-in/sign-up, workspace surfaces, header/footer, and `design.html`.
- Phase 3 — Accounts & Authentication (Better Auth).
  - Local PostgreSQL provisioned and running as Windows service `postgresql-edvance`; database `edvance` created.
  - Better Auth configured (email/password, `pg` Pool, `nextCookies`); schema migrated (`user`, `session`, `account`, `verification`).
  - Server-side route guard on `/courses` and below; client-side guard as a second layer.
  - Real sign-up/sign-in (HTTP-only cookie sessions); header reflects session; Sign out revokes server-side.
  - Course workspaces scoped per signed-in user; new users seeded with demo workspaces.
  - Secrets only in git-ignored `.env`; `.env.example` committed.
- "Press Room" redesign & Edvance identity (steering addition, Change 9).
  - Palette recalibrated to deep teal / cream / rust / sage, with legacy token names kept as aliases so every workspace surface retinted without component churn.
  - Edvance logo designed and shipped (`components/logo.tsx`, `public/logo.svg`, `app/icon.svg`) with lockup rules on the `design.html` brand sheet.
  - Landing page restructured from the artisan-poster reference: two-panel poster hero with a hand-drawn SVG scene, dark teal band of captioned tiles, cream medallion row, sand editorial spread, dark teal status band.
  - Header (logo lockup, centred nav, circular controls) and footer (cream, accurate status copy) rebuilt.
  - Presentation only — no route, data, or auth behaviour changed.
- Interface sheet re-pointed at the live app (steering addition, Change 10).
  - `design.html` now renders the shipped screens — landing page, sign-in, course directory, course overview, sources, assessments, mastery — from the real markup and the seeded demo content, each labelled with its route and a note on what is real versus mock.
  - The application stylesheet is inlined as a verbatim snapshot of `app/globals.css` between explicit markers, replacing the hand-restated palette, type scale, and components. The sheet now cannot show a design the product does not have.
  - Self-contained with no build tooling: it opens from the filesystem, a static server, or the editor preview, and its links are inert by design.
  - Presentation only — no app code, route, data, or auth behaviour changed.

- Phase 4 — Course Data & PostgreSQL.
  - Schema and migration for the PRD §15 model: `course`, `learning_material`, `concept`, `assessment_question`, `source_mapping`, `consistency_finding`, `mastery_state`, plus a `schema_migrations` ledger (`db/migrations/0001_course_data.sql`).
  - `npm run migrate` applies pending SQL files once each, in order, inside a transaction; re-running is a no-op. No ORM was added — the runner uses the `pg` dependency already in the stack.
  - Repository / data-access layer (`lib/repo/courses.ts`) is the only module that knows SQL; the app speaks the `Course` domain type. Every query is scoped by the signed-in `user.id`, so learners cannot read or write each other's records.
  - Route handlers (`/api/courses`, `/api/courses/[courseId]`, `/api/courses/[courseId]/assessments`) return 401 unauthenticated and 404 for courses the learner does not own.
  - The course workspace no longer uses `localStorage`: the hooks fetch from the API and the create/add-question forms POST to it. The dead browser-storage modules were deleted.
  - New learners are seeded with the demo workspaces server-side (idempotent, concurrency-safe); the seeded rows now live in PostgreSQL rather than the browser.
  - `source_mapping` exists in the schema and repository but is not yet surfaced in the UI — populating it is Phase 6–7 work.
- Phase 6 — Course Intelligence.
  - `db/migrations/0004_course_intelligence.sql` adds `course_analysis` (status, safe `error_code`/`error_summary`, evidence fingerprint, counts, provider metadata), extends `concept` with `origin`/`evidence_status`/`confidence`, and adds `concept_evidence` (concept → real material + chunk + location + verbatim excerpt) and `concept_relationship` (`prerequisite`/`part_of`/`related_to`/`contrasts_with`).
  - `lib/ai/` is the server-only intelligence layer: `gemini.ts` (the one provider, plus an env-gated deterministic test provider that is refused in production), `prompts.ts`, `schemas.ts` (the structured-output JSON Schema plus a strict runtime validator and reference resolver), `types.ts`, and `course-intelligence.ts` (bound context → generate → validate → resolve → de-duplicate).
  - `POST /api/courses/[courseId]/analyse` authenticates, verifies ownership, loads evidence scoped to the learner, calls the model, validates every cited chunk against the input, and persists concepts, evidence, relationships and analysis state. It never runs on a page refresh, and it will not spend a model call when the stored intelligence is already up to date.
  - A new **Intelligence** workspace tab shows the analysis state, each concept with its evidence status, definition, instructor term and the exact evidence behind it, plus justified relationships. Stored intelligence becomes **needs re-analysis** as soon as materials change.
  - Legacy `.doc` and `.ppt` uploads are no longer accepted, since Edvance has no reliable extractor for them; `lib/materials.ts` and the docs were updated.
  - Verified with `scripts/test-course-intelligence.mjs` — **59 passed, 0 failed** — plus the Phase 5.6 regression (**91 passed, 0 failed**), using an original six-part golden fixture (the fictional **FATHOM** framework). The **live Google Gemini call** is also verified against that same fixture by `scripts/verify-gemini-live.mjs` — **26 passed, 0 failed**: six concepts with exact instructor terminology, every citation resolved to a real `Section: …` chunk, and a justified relationship.
- Phase 7 — Assessment Intelligence.
  - `db/migrations/0005_assessment_intelligence.sql` adds `assessment_analysis` and the constraints that keep one finding per question and one source mapping per evidence location.
  - `lib/ai/assessment-intelligence.ts` judges a question against the course's already-extracted concepts — never the raw material and never seed concepts — so a course must be analysed first; the endpoint returns 409 otherwise.
  - `source_mapping` (schema-only since Phase 4) is now written and read; writing a real signature also removes the seeded course-level narrative so demo text is never shown beside genuine analysis.
  - The Assessments tab shows a per-question signature: state, verdict, reason, next action, and the concepts it tests with their evidence.
  - Verified with `scripts/test-assessment-intelligence.mjs` — **76 passed, 0 failed** — plus the deterministic Phase 6 suite (**59**) and the Phase 5.6 regression (**91**), and the live provider (**34 passed**, `gemini-3.5-flash`).
- Phase 5.6 — Text Extraction & Evidence Chunking.
  - `db/migrations/0003_material_ingestion.sql` adds `material_ingestion_job` (status `pending|processing|completed|failed`, timestamps, safe `error_code`/`error_summary`, derived `metadata`) and `material_chunk` (ordered `ordinal`, `content`, human-readable `source_location`, structured `metadata`), both cascading from `learning_material`.
  - `lib/extraction/` is a server-only extraction layer: PDF (`pdfjs-dist`), DOCX (`mammoth`), and PPTX (`jszip` + Open XML), plus hand-written TXT, Markdown, WebVTT, and SRT parsers, all normalised to `{ text, location }`; a deterministic chunker turns blocks into ordered, location-tagged evidence chunks without splitting sentences.
  - `lib/ingestion.ts` runs create job → mark processing → download object → extract → chunk → store → mark completed. The upload route triggers it after the material row exists; `POST …/materials/[materialId]/ingest` retries after a failure. Failures never delete the learner's file — the job records a short code and a user-safe summary only.
  - The Sources section shows real state — "Ready for analysis" (never "Analyzed"), "Processing…", "Extraction failed" with Retry — plus factual derived metadata only when actually derived, and a **Demo source** flag for seeded rows.

**Verified in Phase 5 (2026-10-01):**
- Supabase Storage upload, private signed retrieval, delete, and the `storageReference` on `learning_material` (`db/migrations/0002_material_storage.sql`, `lib/supabase-storage.ts`, `app/api/courses/[courseId]/materials`). Exercised against the private `edvance-materials` bucket through the real application — see `Doc/PRD.md` Appendix A, Change 13.

**Verified in Phase 5.6 (2026-10-01):**
- Real extraction and chunking for all seven formats, correct page/slide/timestamp/section/line locations, ordered chunks, ingestion jobs, ownership isolation, failed-ingestion states, and delete cascades — `scripts/test-ingestion.mjs` reports 91 passed, 0 failed. See `Doc/PRD.md` Appendix A, Change 14.

**Not yet implemented:**
- Product Completion & Hardening (Phase 10) and everything after it.
- Production deployment.

**Next phase:** Phase 10 — Product Completion & Hardening.

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
- [x] Code is pushed to the public GitHub repository.
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
- [x] App runs locally.
- [x] A course workspace can be created and opened.
- [x] Navigation moves between the main sections.
- [x] Sections render from mock data (no backend yet).
- [x] Layout works on mobile and desktop within practical limits.

---

### Phase 3 — Accounts & Authentication

**Technology:** Better Auth

**Goal:** Introduce user identity and protected experiences.

**Outputs:**
- Local sign-in/sign-up flows with Better Auth.
- `User` identity linked to courses and mastery state.
- Protected application routes.

**Acceptance Criteria:**
- [x] Sign-up and sign-in work locally.
- [x] Authenticated users can create courses.
- [x] Unauthenticated access to protected routes is blocked.
- [x] No credentials or session secrets are committed.

---

### Phase 4 — Course Data & PostgreSQL

**Technology:** PostgreSQL (local)

**Goal:** Persist structured course and learner records.

**Outputs:**
- Schema and migrations for the PRD data model (`User`, `Course`, `LearningMaterial`, `Concept`, `AssessmentQuestion`, `SourceMapping`, `ConsistencyFinding`, `MasteryState`).
- Local PostgreSQL instance (optionally via Docker).
- Repository/data-access layer used by the app.

**Acceptance Criteria:**
- [x] PostgreSQL runs locally and connects to the app (verified: `/api/courses` returns seeded rows from `edvance`).
- [x] Migrations apply cleanly (`npm run migrate` applies `0001_course_data.sql` once; a second run reports "Database already up to date").
- [x] Courses, materials, concepts, assessments, mappings, consistency findings, and mastery states persist and read back correctly (verified end to end: create course → add assessment → read back from a fresh request; `source_mapping` round-tripped directly against the schema).

---

### Phase 5 — Course Material Ingestion

**Storage:** Supabase Storage (private bucket `edvance-materials`)

**Goal:** Allow real course material into the evidence pipeline.

**Outputs:**
- File upload flow for PDFs, slide decks, notes, and transcripts.
- Storage in Supabase Storage with a stored `storageReference` on `LearningMaterial`.
- Processing pipeline to prepare materials for course intelligence.

**Delivered:**
- `db/migrations/0002_material_storage.sql` adds `mime_type` and `size_bytes` to `learning_material` (the `storage_reference` object key already existed from Phase 4).
- `lib/supabase-storage.ts` is a server-only client over the official `@supabase/supabase-js` (session persistence disabled): it uploads with the server-derived content type, mints short-lived signed URLs, and deletes objects. `SUPABASE_SECRET_KEY` is server-only and never reaches the browser.
- `lib/materials.ts` defines the accepted material types (PDF, PowerPoint, Word, Markdown/plain text, WebVTT/SRT) and the 25 MB per-file limit, shared by the form and the route.
- `POST /api/courses/[courseId]/materials` validates ownership, type, and size; uploads under an owner-scoped key (`users/{userId}/courses/{courseId}/materials/{materialId}/{safe filename}`); records the material with its `storageReference`; and returns specific errors for each failure (401 / 404 / 400 / 415 / 413 / 503 / 502).
- `GET /api/courses/[courseId]/materials/[materialId]/download` verifies ownership and redirects to a short-lived signed URL; `DELETE /api/courses/[courseId]/materials/[materialId]` removes the row (authoritative) and then the object.
- `components/add-material-form.tsx` and the Sources section: an upload form with client-side validation, a "Stored" badge, file size, Download, and Remove actions. The material list already renders from PostgreSQL, so an upload appears the moment it is stored.

**Processing pipeline:** delivered in Phase 5.6 (see below) — text extraction and evidence chunking now run on upload. This phase stores and surfaces materials; AI-assisted course intelligence remains Phase 6.

**Acceptance Criteria:**
- [x] Files upload and are retrievable via private object storage. *(Verified 2026-10-01: real PDF + TXT upload → 201, signed download 307 → 200 with matching SHA-256, object present at the stored path; bucket refuses anonymous access.)*
- [x] Uploaded materials appear in the Sources section. *(Verified: the uploaded materials appeared in the course read-back.)*
- [x] Failed/unsupported files are handled gracefully (unsupported type → 415, oversized → 413, empty → 400, unauthenticated → 401, not the owner → 404, with messages shown in the form).

---

### Phase 5.6 — Text Extraction & Evidence Chunking

**Technology:** `pdfjs-dist` (PDF), `mammoth` (DOCX), `jszip` (PPTX); hand-written TXT/Markdown/WebVTT/SRT parsers. Server-only.

**Goal:** Turn stored materials into structured, location-aware evidence the later intelligence phases can cite.

**Outputs:**
- Server-only extraction layer for PDF, TXT, Markdown, DOCX, PPTX, WebVTT, and SRT.
- `material_ingestion_job` and `material_chunk` tables; synchronous ingestion on upload, with retry.
- Sources processing state ("Ready for analysis") with factual derived metadata, and clearly-labelled demo sources.

**Delivered:**
- `db/migrations/0003_material_ingestion.sql` adds `material_ingestion_job` and `material_chunk`, both cascading from `learning_material`.
- `lib/extraction/` returns one normalised `{ text, location }` shape from every format — locations are `page`, `slide`, `timestamp`, `section`, or `line`, and the human-readable label is what a citation shows ("Page 7", "00:04:12–00:04:38", "Section: Introduction to PROMPT").
- `lib/extraction/chunk.ts` produces deterministic, ordered chunks (≈900-character target, 1600 hard limit) that never split a sentence or cross a source location.
- `lib/ingestion.ts` orchestrates the job lifecycle; `lib/supabase-storage.ts` gained `downloadObject`; `POST …/materials` triggers ingestion and `POST …/materials/[materialId]/ingest` retries. Failures keep the file and store only a safe code and summary.
- The Sources page renders real state and derived metadata, with Retry on failure; seeded rows are labelled **Demo source**.

**Acceptance Criteria:**
- [x] PDF, TXT, Markdown, DOCX, PPTX, WebVTT, and SRT extract real text. *(Verified 2026-10-01.)*
- [x] PDF page numbers, PPTX slide numbers, and transcript timestamps are preserved. *(Verified.)*
- [x] `material_ingestion_job` and `material_chunk` work; chunk ordering is correct; ownership isolation holds; failed ingestion is recorded without deleting the file. *(Verified.)*
- [x] Sources shows the real processing status. *(Verified.)*
- [x] Typecheck, tests, and the secret scan pass; documentation updated.
- [x] No AI provider, prompt, concept extraction, embeddings, or vector database was added.

---

### Phase 6 — Course Intelligence

**Technology:** Google Gemini, exclusively, through the official `@google/genai` server SDK. Server-only; the browser never calls a provider.

**Goal:** Turn stored `material_chunk` evidence into real structured course intelligence, preserving instructor terminology and source evidence.

**Outputs:**
- Concept extraction from course materials.
- Instructor terminology/framework preservation.
- Concept-to-source references (where each concept was taught).
- Course map of concept relationships.
- An analysis state (`Not analyzed`/`Analyzing`/`Ready`/`Analysis failed`/`Insufficient evidence`/`Needs re-analysis`) that goes stale when materials change.

**Delivered:**
- `db/migrations/0004_course_intelligence.sql`: `course_analysis`, `concept_evidence`, `concept_relationship`, and `concept.origin`/`evidence_status`/`confidence`.
- `lib/ai/`: provider wrapper, prompt builders (evidence-only, exact chunk ids, preserve course terminology), the structured-output schema, a strict runtime validator plus reference resolver, and the orchestration pipeline.
- `POST /api/courses/[courseId]/analyse` with authentication, ownership, evidence loading, bounded context, strict validation, and transactional persistence.
- Evidence states `SUPPORTED` / `PARTIALLY_SUPPORTED` / `INSUFFICIENT_EVIDENCE`; `INSUFFICIENT_EVIDENCE` is a successful outcome. Relationships use the small `prerequisite`/`part_of`/`related_to`/`contrasts_with` set.
- The **Intelligence** workspace tab, and the removal of legacy `.doc`/`.ppt` uploads.

**Acceptance Criteria:**
- [x] Concepts and instructor terms are extracted from supplied materials.
- [x] Each extracted claim carries its evidence: a real material, chunk and human-readable location.
- [x] Concepts map to source locations in the original material.
- [x] Unknown, cross-course and cross-user chunk ids are rejected, and a malformed or unverifiable response is rejected whole.
- [x] Analysis state works, staleness works, ownership isolation holds, and no model call happens on a page refresh or when already up to date.
- [x] Tests, typecheck, secret scan and the Phase 5.6 regression pass; documentation updated.
- [x] **Real Google Gemini call verified** — `scripts/verify-gemini-live.mjs` reports **26 passed, 0 failed** against the live API (model `gemini-3.5-flash`); the six FATHOM components were extracted with exact instructor terminology and real, resolvable evidence.

---

### Phase 7 — Assessment Intelligence

**Goal:** Connect assessment questions to concepts, sources, and consistency checks.

**Delivered:**
- `db/migrations/0005_assessment_intelligence.sql`: `assessment_analysis` (per-question state, safe error fields, evidence fingerprint, tested-concept count, safe provider metadata) plus one-finding-per-question and one-mapping-per-location constraints.
- `lib/ai/assessment-intelligence.ts` plus an assessment prompt and JSON Schema: the model is given the course's **already-extracted** concepts and must name the ones the question tests by their exact supplied ids.
- `POST /api/courses/[courseId]/assessments/[assessmentId]/analyse` — authenticate → ownership → require a ready course → model → strict validation → resolve concept ids → persist `source_mapping`, a `consistency_finding` and the analysis state in one transaction.
- Consistency states `Consistent` / `Possible inconsistency` / `Insufficient evidence`. A claim of possible inconsistency must name the concept it disagrees with, or the whole response is rejected.
- `source_mapping` is now populated and read (it was schema-only through Phase 6), and the course-level verdict is the most severe, most recent finding — so one inconsistent question is never hidden.
- The Assessments tab shows each question's signature: state, verdict, the reason, the next action, and the concepts it tests with their own evidence.

**Acceptance Criteria:**
- [x] An assessment question is mapped to relevant concepts and sources.
- [x] Detected inconsistencies are displayed with evidence.
- [x] Uncertain outcomes are labelled `Insufficient evidence` rather than guessed.
- [x] Verified with `scripts/test-assessment-intelligence.mjs` — **76 passed, 0 failed** — and the live provider (`scripts/verify-gemini-live.mjs` — **34 passed, 0 failed**, including the real model flagging the six-versus-five inconsistency).
- [x] Phase 6 (**59**) and Phase 5.6 (**91**) regressions still pass; typecheck, secret scan and baseline restored.

---

### Phase 8 — Mastery Intelligence

**Goal:** Connect learner performance to assessed concepts.

**Outputs:**
- `MasteryState` per user per concept (status and score).
- Mastery profile marking Mastered / Developing / Weak / Untested concepts.

**Acceptance Criteria:**
- [x] Practice/self-assessment updates concept mastery status.
- [x] Mastery profile reflects changes correctly.

**Delivered:**
- `practice_attempt` records each thing a learner actually did — an assessment question (attributed to every concept that question was checked against) or a single concept — with the answer, the correctness verdict and when it happened (`db/migrations/0006_practice_mastery.sql`).
- `lib/mastery.ts` derives the status from those attempts alone, deterministically: no attempts → Untested; under half correct → Weak; at least half correct → Developing; at least 80% over at least three attempts → **Mastered**. No model is called; mastery is never AI-set.
- Recording an attempt re-derives the affected concepts from the learner's complete history and upserts `mastery_state` (with attempt counts and a last-practised timestamp) in one transaction.
- `POST /api/courses/[courseId]/practice` authenticates, authorises by ownership, validates a single target and verdict, refuses an unchecked question with 409, and returns the refreshed course.
- The Mastery tab states the rule plainly, shows each concept's attempts and correct count, offers a practice panel for checked questions and single concepts, and lists recent practice with the learner's own answer.
- Verified with `scripts/test-mastery-intelligence.mjs` — **48 passed, 0 failed** — covering the honest Untested baseline, the full status ladder (wrong → Weak; 1/2 → Developing; 4/5 → Mastered), attribution, reproducibility, per-concept isolation, the unchecked-question gate, validation, ownership isolation, and demo-workspace honesty.
- Phase 7 (**76**), Phase 6 (**59**) and Phase 5.6 (**91**) regressions still pass; typecheck, secret scan and baseline restored.

---

### Phase 9 — Targeted Revision

**Goal:** Turn evidence and mastery into a useful next action.

**Outputs:**
- Revision recommendation based on the learner's weak concepts.
- Targeted practice questions generated from weak areas (not random across the course).

**Acceptance Criteria:**
- [x] Recommendations reference the smallest useful next action.
- [x] Practice generation focuses on weak/untested concepts.

**Delivered:**
- `lib/revision.ts` derives the recommendation deterministically from mastery and evidence: the focus (Weak → Developing → Untested, Mastered excluded) and one smallest next action, naming the top concept and where the course teaches it. No model call, and it is always current.
- `practice_question` and `revision_plan` (migration `0007`) store targeted practice and the per-course generation state, including a `generated_for` weak-area fingerprint.
- `POST /api/courses/[courseId]/revision` authenticates, authorises by ownership, refuses an un-analysed course with 409, records `nothing-to-revise` and `insufficient-evidence` honestly (no model call), and never recomputes an up-to-date generation.
- Generation sends only the weak concepts and the evidence that teaches them; a question naming an unsupplied concept or citing an unsupplied chunk rejects the whole response.
- A new **Revision** tab shows the next action, the focus with its evidence, the generation state and the targeted practice, and records an attempt per question through the Phase 8 practice endpoint.
- Verified with `scripts/test-targeted-revision.mjs` — **72 passed, 0 failed** — covering the deterministic recommendation, targeted generation, cost control, mastery-driven re-targeting, the nothing-to-revise boundary, four rejection paths, insufficient evidence, the analysis gate, isolation and demo honesty.
- Phase 8 (**48**), Phase 7 (**76**), Phase 6 (**59**) and Phase 5.6 (**91**) regressions still pass; typecheck, secret scan and baseline restored.

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