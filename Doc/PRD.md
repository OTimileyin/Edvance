# Edvance — Product Requirements Document

**Product Name:** Edvance  
**Product Descriptor:** Evidence-First Assessment Intelligence  
**Category:** Impact & Innovation  
**Document Type:** Product Requirements Document (PRD) / Product Bible  
**Version:** 2.0  
**Status:** Phase 1 Complete — Assessment Intelligence Prototype (Lesson 6)  
**Owner:** Oluwatimileyin Oyelabi  
**Platform:** Web Application  

---

## 1. Product Overview

Edvance is an evidence-first assessment intelligence platform that helps learners understand what an assessment is really testing, where the required knowledge was taught, whether the available course materials agree, and what the learner still needs to master.

Learners often receive course content through fragmented sources such as lecture videos, transcripts, slides, PDFs, notes, course outlines, assignments, and assessment questions. These materials are rarely connected in a way that helps the learner answer four important questions:

1. What exactly am I expected to know?
2. Where was it taught?
3. Do the course materials and assessment agree?
4. What have I not mastered yet?

Edvance turns these disconnected materials into a structured evidence layer around the learner's course.

Edvance is **not** intended to compete primarily as a generic AI summarizer, chatbot, flashcard generator, or quiz generator. Its core value is the relationship between:

**Course Evidence → Assessment Expectations → Consistency → Learner Mastery**

---

## 2. Product Vision

Edvance should help a learner move from:

> "I have all these materials, but I don't know what matters."

to:

> "I know what is being tested, where it was taught, whether the evidence agrees, what I am missing, and what I should study next."

The long-term vision is for Edvance to become an intelligent evidence layer between course materials, instructors, assessments, and learners.

---

## 3. Core Problem

Students and participants in structured learning programmes often receive knowledge through fragmented materials such as recorded lectures, lecture transcripts, presentation slides, PDFs, class notes, course outlines, assignments, assessment questions, and instructor announcements.

The learner must manually connect these materials. This creates several problems:

- Important concepts can be missed during revision.
- Students may not know which parts of a lecture relate to an assessment.
- Instructor-specific terminology may be replaced by generic explanations.
- Contradictions between slides, lectures, and assessments may go unnoticed.
- Learners may spend too much time studying concepts they already understand.
- Generic AI assistants may produce plausible answers that are not grounded in what the instructor actually taught.
- Learners may not know how much evidence supports a particular answer.

The central problem is:

> **A lack of alignment between learning materials, assessment expectations, and the learner's actual mastery.**

---

## 4. Product Wedge

The first memorable Edvance experience should solve one narrow, high-value problem extremely well:

> **Given an assessment question, Edvance identifies what concepts are being tested, shows where those concepts were taught, flags possible contradictions in the course evidence, and tells the learner what they still need to revise.**

This is the product's first wedge. The larger course-intelligence platform can grow around this capability after it is proven.

---

## 5. Target Users

### Primary Users
- University students
- Bootcamp participants
- Fellowship and cohort-based learners
- Students preparing for examinations or assessments
- Learners taking structured online courses

### Secondary Users — Future
- Lecturers
- Training organisations
- Universities
- Corporate learning teams
- Professional certification providers

---

## 6. Primary Persona

### The Overloaded Learner

The learner attends classes and receives lecture videos, slides, PDFs, assignments, transcripts, and assessment questions.

They understand some of the course but struggle to determine:
- what matters most,
- where concepts were taught,
- how different topics connect,
- what the instructor expects in assessments,
- whether the assessment wording matches the lecture,
- and which areas they personally need to revise.

The learner wants a faster way to turn scattered course materials into an evidence-backed path toward mastery.

---

## 7. Jobs To Be Done

When I receive an assessment question, I want Edvance to show what concepts are being tested so that I know what knowledge the question requires.

When I need evidence, I want Edvance to show the lecture, slide, note, or transcript section where the relevant knowledge was taught.

When course materials appear to disagree, I want Edvance to flag the inconsistency so that I can investigate it rather than unknowingly learning the wrong information.

When preparing for an assessment, I want Edvance to identify the concepts I have not mastered so that I can spend my study time on the areas that matter most.

---

## 8. Unique Value Proposition

**Edvance turns fragmented course materials into an evidence-backed map of what a learner is expected to master.**

Instead of only summarizing content, Edvance connects:

**Course Material + Instructor Terminology + Assessment Questions + Source Evidence + Learner Mastery**

It should answer:
- What exactly is this assessment question testing?
- Where was this concept taught?
- Which materials support this answer?
- Are the assessment and lecture saying different things?
- What concepts do I already understand?
- What should I revise next?

---

## 9. Core Product Principles

### Source-Grounded
Important claims should trace back to supplied course material whenever possible.

### Instructor-Aligned
Preserve the terminology, frameworks, examples, and structure used by the instructor.

### Evidence Before Guessing
If there is not enough evidence, say so instead of inventing an answer.

### Mastery Over Summarization
Help the learner understand and apply knowledge rather than merely shortening content.

### Clear Provenance
Show where important information came from.

### Human Judgment Preserved
When evidence is inconsistent or incomplete, show the evidence and uncertainty rather than silently deciding what the instructor meant.

---

## 10. Signature Experience — Assessment Intelligence

The signature Edvance page is the **Assessment Intelligence View**.

A learner enters or opens an assessment question. Edvance displays:

1. Assessment Question
2. Concepts Being Tested
3. Supporting Course Evidence
4. Source Locations
5. Consistency Status
6. Learner Mastery Status
7. Recommended Revision Action

### Example

**Assessment Question:**  
"What are the five components of the PROMPT framework?"

**Detected Concepts:**  
Purpose, Role, Objective, Method, Parameters, Target Output

**Consistency Status:**  
Possible inconsistency detected.

**Reason:**  
The assessment asks for 5 components while the supplied lecture evidence consistently presents 6.

**Mastery:**  
Purpose — Mastered  
Role — Mastered  
Objective — Developing  
Method — Mastered  
Parameters — Weak  
Target Output — Weak

**Recommended Revision:**  
Review Parameters and Target Output before attempting the assessment.

---

## 11. Main User Journey

### Step 1 — Create a Course Workspace
The learner creates a workspace for a course or programme.

### Step 2 — Add Learning Materials
The learner adds lecture transcripts, slides, PDFs, notes, course outlines, and assessment questions.

### Step 3 — Extract Course Concepts
Edvance identifies major concepts, instructor terminology, frameworks, definitions, examples, relationships, and relevant source locations.

### Step 4 — Add an Assessment Question
The learner enters or selects a question.

### Step 5 — Assessment Intelligence
Edvance identifies the concepts required by the question, strongest supporting evidence, relevant source locations, and instructor terminology.

### Step 6 — Consistency Check
Possible statuses:
- Consistent
- Possible inconsistency
- Insufficient evidence

### Step 7 — Mastery Check
The learner's performance or self-assessment is connected to the concepts being tested.

### Step 8 — Targeted Revision
Edvance recommends the smallest useful revision action based on the learner's weak concepts.

---

## 12. MVP Scope

The MVP should prove one central hypothesis:

> **A learner receives more value when AI connects assessments and mastery directly to the material their instructor actually taught than when AI simply summarizes the course.**

The MVP should prioritize:

**Course Sources → Concept Extraction → Assessment Mapping → Evidence → Consistency → Mastery → Revision**

For Lesson 6, the prototype may present this experience using mock/test data.

---

## 13. Out of Scope for Lesson 6

- Working authentication
- Production database integration
- Real file upload pipeline
- Live AI API calls
- Real course ingestion
- Public deployment
- Payment integration
- AI-generated podcasts
- Social feeds
- Full LMS replacement
- Instructor grading automation
- Complex gamification
- AI avatars
- Automatic certification

---

## 14. Technical Architecture

### Framework
**Next.js with TypeScript**

### Database
**PostgreSQL**

Current development decision:
- PostgreSQL is the structured data store.
- PostgreSQL runs locally for now.
- Cloud database deployment is deferred.

### Authentication
**Better Auth**

Authentication is planned for a later implementation phase. Working sign-in is not required for Lesson 6.

### File Storage
**Supabase Storage**

Private object storage (bucket `edvance-materials`) for course files such as PDFs, slide decks, notes, and transcripts. Supabase is used **only** for object/file storage: PostgreSQL remains the Edvance database, Better Auth remains authentication, and Infisical remains the secrets manager. Cloudflare R2 was previously selected and implemented but never connected; it was replaced in Change 13 (Appendix A).

### Local Development
- The application runs locally.
- PostgreSQL runs locally.
- The browser is used to test the prototype.
- Production deployment is postponed.

### Supporting Local Tools
**Docker** may be used to run local services such as PostgreSQL.  
**Caddy** may be introduced later as a reverse proxy when useful.

### Future External Services
Future versions may connect to AI model APIs, email services, transcription services, and file-processing services.

No secrets should be committed to the public repository.

---

## 15. High-Level Data Model

### User
- id
- name
- email
- role
- createdAt

### Course
- id
- userId
- title
- description
- createdAt

### LearningMaterial
- id
- courseId
- type
- title
- storageReference
- uploadedAt

### Concept
- id
- courseId
- name
- instructorTerm
- definition
- sourceReference

### AssessmentQuestion
- id
- courseId
- questionText
- createdAt

### SourceMapping
- id
- assessmentQuestionId
- conceptId
- materialId
- sourceLocation
- confidence

### ConsistencyFinding
- id
- assessmentQuestionId
- status
- description
- sourceA
- sourceB

### MasteryState
- id
- userId
- conceptId
- status
- score
- updatedAt

---

## 16. Implementation Plan

### 16.1 Current Status

**Current Phase:** Phase 5.6 — Text Extraction & Evidence Chunking is **complete and verified end to end** on 2026-10-01 (Appendix A, Change 14). It builds on Phase 5 (course material ingestion via private **Supabase Storage**, verified in Changes 12–13). Phase 4 course data (Change 11), Phase 3 accounts (Change 8), Phase 2, the landing page/demo sign-in steering addition (Change 6), the "Field Guide" visual redesign (Change 7), the "Press Room" redesign + Edvance identity (Change 9), and the interface sheet re-pointed at the live app (Change 10) are all delivered. Next phase: Phase 6 — Course Intelligence.

**Completed (2026-09-27 – 2026-10-01):**
- Phase 1 — Design System & Assessment Intelligence Prototype.
  - Implementation plan created; architecture reviewed and steering decisions logged (Appendix A, Decision 1).
  - Local PostgreSQL selected for later data integration.
  - `design.html` created; design refinements applied (Appendix A, Change 2).
  - Initial Assessment Intelligence page built (`assessment-intelligence.html`); tested locally with mock data.
- Phase 2 — Core Application Structure (Next.js + TypeScript app that runs locally).
  - Course workspace: create and open courses (created workspaces persist in the browser via `localStorage`).
  - Navigation between Courses, Sources, Assessments, and Mastery.
  - Sources section (course evidence list), Assessments section (list and add questions), Mastery section (per-concept status), responsive layout.
  - All sections render from mock data — no backend yet.
- Landing page and demo sign-in (steering addition, Appendix A, Change 6).
  - Marketing landing page at `/` with hero, the four questions, features, how-it-works, and demo-status sections.
  - Sign-in (`/signin`) and sign-up (`/signup`) create a **local demo session** (`localStorage`), then enter the app at `/courses`.
  - App routes (`/courses` and below) redirect to `/signin` when no session exists; header shows the demo user and a Sign out action.
  - This is a demo UX only — **not** Better Auth; real accounts and persistence remain Phase 3.
- "Field Guide" visual redesign (steering addition, Appendix A, Change 7).
  - Design system rebuilt from three Product Owner reference designs: deep forest-green structure, warm paper surfaces, coral flag accents; Fraunces serif display over Inter body; glassmorphism panels on atmospheric gradients; stamp badges and tinted journey tiles.
  - Applied across the landing page (glass evidence hero card, forest feature band, oak journey band, stamp demo section), split-screen sign-in/sign-up, workspace surfaces, and the standalone `design.html` preview.
- Phase 3 — Accounts & Authentication (Better Auth; Appendix A, Change 8).
  - Local PostgreSQL provisioned (Windows service `postgresql-edvance`, database `edvance`); Better Auth schema (`user`, `session`, `account`, `verification`) migrated.
  - Real email/password sign-up and sign-in replace the localStorage demo session; sessions are HTTP-only cookies.
  - `/courses` and all workspace routes are guarded **server-side** by a Better Auth session check; unauthenticated requests redirect to `/signin?next=…`.
  - Course workspaces are scoped per signed-in user (keyed by email in browser storage) and new users are seeded with demo workspaces on first visit.
- "Press Room" visual redesign and Edvance identity (steering addition, Appendix A, Change 9).
  - Design language rebuilt from the Product Owner's artisan-poster reference: deep teal structure, cream page, rust flags, sage growth; italic Fraunces display voice; hand-illustrated poster hero; circular medallions with stitched rims; captioned product tiles; cream editorial footer.
  - **Edvance logo delivered**: a seal monogram (an "E" built from three stacked source bars, the middle one rust-highlighted) plus a wordmark lockup, app-icon favicon (`app/icon.svg`), and shareable `public/logo.svg`. Documented in the `design.html` interface sheet.
  - Landing page restructured to the reference's rhythm: two-panel poster hero → dark teal product band → cream medallion row → sand editorial spread → dark teal honest-status band.
  - Applied to the header (logo lockup, centred nav, circular tool buttons), footer, auth panels, and — through the token layer — every workspace surface.
  - Pure presentation change: no route, data, or authentication behaviour was altered.
  - Credentials live only in the git-ignored `.env`; `.env.example` documents the shape. At the time of this change, course data was still browser-local mock data.
- Interface sheet re-pointed at the live application (steering addition, Appendix A, Change 10).
  - `design.html` now renders the shipped screens themselves — landing page, sign-in, course directory, course overview, sources, assessments, and mastery — against a verbatim snapshot of `app/globals.css`, rather than a separate hand-written approximation of the design system.
  - This removes a real risk: the previous sheet restated the palette, type, and components by hand, so it could describe a design the product no longer had. It now cannot drift without an explicit copy step, and its contents are measuring-identical to the app.
- Phase 4 — Course Data & PostgreSQL (Appendix A, Change 11).
  - Schema and migration for the §15 model — `course`, `learning_material`, `concept`, `assessment_question`, `source_mapping`, `consistency_finding`, `mastery_state` — plus a `schema_migrations` ledger (`db/migrations/0001_course_data.sql`).
  - `npm run migrate` applies pending SQL files once each, in order, inside a transaction. No ORM was introduced; the runner uses the `pg` dependency already in the stack.
  - Repository / data-access layer (`lib/repo/courses.ts`) is the only module that knows SQL. Every query is scoped by the signed-in `user.id`, so a learner cannot read or write another learner's records.
  - Route handlers (`/api/courses`, `/api/courses/[courseId]`, `/api/courses/[courseId]/assessments`) return 401 when unauthenticated and 404 for courses the learner does not own.
  - The course workspace **no longer uses `localStorage`**: the hooks fetch from the API and the create/add-question forms POST to it. The browser-storage modules (`lib/store.ts`, `lib/session.ts`, `lib/demo-data.ts`) and the client-side seeder were deleted.
  - New learners are seeded with the demo workspaces **server-side** (idempotent, concurrency-safe); the seeded rows now live in PostgreSQL rather than in a browser profile.
  - `source_mapping` is implemented in the schema and the repository but is not yet surfaced in the UI — populating it is Phase 6–7 work.
- Phase 5 — Course Material Ingestion (Supabase Storage; Appendix A, Changes 12–13).
  - `db/migrations/0002_material_storage.sql` adds `mime_type` and `size_bytes` to `learning_material`; the `storage_reference` object key already existed from Phase 4.
  - **Server-only Supabase Storage client** (`lib/supabase-storage.ts`) built on the official `@supabase/supabase-js`, with session persistence disabled. It uploads, mints short-lived signed URLs, and deletes objects in the private `edvance-materials` bucket. The secret key never reaches the browser.
  - `POST /api/courses/[courseId]/materials` stores an uploaded file in the private bucket under an owner-scoped key (`users/{userId}/courses/{courseId}/materials/{materialId}/{safe filename}`) and records it on the course with its `storageReference`; `GET …/materials/[materialId]/download` verifies ownership and redirects to a short-lived signed URL; `DELETE …/materials/[materialId]` removes the row and then the object.
  - The **Sources section has a real upload flow** (`components/add-material-form.tsx`) for PDFs, slide decks, Word documents, Markdown/plain-text notes, and WebVTT/SRT transcripts, with a 25 MB limit, plus a Remove action.
  - **Unsupported files are handled gracefully** end to end: type and size are validated in the form and again in the route, and the route returns a specific status and message for every failure (415 unsupported, 413 too large, 400 empty/missing, 503 storage unconfigured, 502 upload failed; 401/404 when unauthenticated or not the owner).
  - **Verified end to end (Change 13):** a real PDF and a real TXT upload, a private signed download whose bytes matched the upload checksum, a delete that removed both the row and the object, and the full validation/security matrix.
- Phase 5.6 — Text Extraction & Evidence Chunking (Appendix A, Change 14).
  - `db/migrations/0003_material_ingestion.sql` adds `material_ingestion_job` (status `pending|processing|completed|failed`, start/complete timestamps, safe `error_code`/`error_summary`, derived `metadata`) and `material_chunk` (ordered `ordinal`, `content`, human-readable `source_location`, structured `metadata`). Both cascade from `learning_material`.
  - A **server-only extraction layer** (`lib/extraction/`) parses PDF (`pdfjs-dist`), DOCX (`mammoth`), and PPTX (`jszip` + Open XML) and includes hand-written TXT, Markdown, WebVTT, and SRT parsers. Every extractor normalises to one `{ text, location }` shape; a deterministic chunker then produces ordered, location-tagged evidence chunks without splitting sentences.
  - **Upload now ingests synchronously:** `POST …/materials` stores the bytes, records the material, then creates a job → marks it processing → downloads the object server-side → extracts → chunks → stores chunks → marks it completed. `POST …/materials/[materialId]/ingest` retries after a failure.
  - **Failures never delete the learner's file.** The job is marked `failed` with a short code and a user-safe summary (`corrupt-file`, `malformed-transcript`, `empty-content`, `unsupported-format`, `extraction-failed`). Raw provider errors and material contents are never logged or stored.
  - **Sources shows real processing state:** "Ready for analysis" (never "Analyzed"), "Processing…", "Extraction failed" with a Retry action, and factual derived metadata only when it was actually derived ("PDF · 14 pages", "Transcript · 37 cues", chunk counts). Seeded demo sources are labelled **Demo source** and are never mixed with real derived locations.
  - **Verified end to end (Change 14):** 91 assertions passing across all seven formats, location correctness, chunk ordering, ownership isolation, failed-ingestion states, delete cascades, typecheck, and a secret scan. **Not claimed:** no AI provider, prompt, concept extraction, embeddings, or vector database was added — those belong to Phase 6.

**Not yet implemented:**
- Course Intelligence — AI-assisted concept extraction over the stored evidence. No AI provider is configured.
- Live AI APIs (Gemini or otherwise).
- Production deployment.

**Next Phase:** Phase 6 — Course Intelligence.

### Phase 0 — Project Foundation
**Goal:** Establish the project environment and documentation.

**Outputs:**
- Next.js + TypeScript project structure
- Public GitHub repository
- Updated PRD
- Local development instructions
- `.gitignore`
- No secrets committed

**Acceptance Criteria:**
- [ ] Project opens locally
- [ ] Repository is public
- [ ] PRD exists
- [ ] No secrets are committed

### Phase 1 — Design System & Assessment Intelligence Prototype
**Goal:** Create the visual language and build one local page that communicates the signature Edvance experience.

**Outputs:**
- `design.html`
- Initial local app page
- Assessment Intelligence screen
- Mock/test data only

**Acceptance Criteria:**
- [x] `design.html` opens locally
- [x] Color palette is visible
- [x] Typography examples are visible
- [x] Styled primary button is visible
- [x] Styled sample input is visible
- [x] At least one Edvance-specific component is visible
- [x] Initial app page opens locally
- [x] App page is separate from `design.html`
- [x] Mock/test data only is used

### Phase 2 — Core Application Structure
**Goal:** Build the learner experience around courses and course evidence.

**Outputs:**
- Course workspace
- Navigation
- Sources section
- Assessments section
- Mastery section
- Basic responsive layout

### Phase 3 — Accounts & Authentication
**Goal:** Introduce user identity and protected experiences.

**Technology:** Better Auth

### Phase 4 — Course Data & PostgreSQL
**Goal:** Persist structured course and learner records.

**Technology:** PostgreSQL

### Phase 5 — Course Material Ingestion
**Goal:** Allow real course material into the evidence pipeline.

**Planned Storage:** Supabase Storage (private bucket)

### Phase 5.6 — Text Extraction & Evidence Chunking
**Goal:** Turn stored materials into structured, location-aware evidence the later intelligence phases can cite.

**Outputs:**
- Server-only extraction layer for PDF, TXT, Markdown, DOCX, PPTX, WebVTT, and SRT.
- `material_ingestion_job` and `material_chunk` tables; synchronous ingestion on upload, with retry.
- Sources processing state ("Ready for analysis") with factual derived metadata, and clearly-labelled demo sources.

**Not in this phase:** any AI provider, prompt, concept extraction, embeddings, or vector database.

### Phase 6 — Course Intelligence
**Goal:** Extract structured knowledge while preserving instructor terminology and source evidence.

### Phase 7 — Assessment Intelligence
**Goal:** Connect assessment questions to concepts, sources, and consistency checks.

### Phase 8 — Mastery Intelligence
**Goal:** Connect learner performance to assessed concepts.

### Phase 9 — Targeted Revision
**Goal:** Turn evidence and mastery into a useful next action.

---

## 17. Design System

### Design Direction
Edvance should feel:
- Clear
- Evidence-driven
- Modern
- Calm
- Academic without feeling institutional
- Focused
- Easy to scan

### Current Color Direction — "Press Room" (Appendix A, Change 9)

An artisan-poster palette: teal for structure, cream for the page, rust for flags,
sage for growth. Implemented in `app/globals.css`; snapshotted in the `design.html`
interface sheet, which renders the live screens against that stylesheet.

| Token | Value | Usage |
|---|---|---|
| `--teal-950` / `--teal-900` | `#0D2327` / `#123236` | Deep bands, footers, dark chrome |
| `--teal-700` | `#22545A` | Primary actions |
| `--teal-600` | `#2C6E70` | Secondary accents, mastery |
| `--teal-300` / `--teal-100` | `#9AC8BE` / `#DCEAE3` | On-dark text, tints |
| `--cream-50` / `--cream-100` | `#FBF6EA` / `#F6EFDD` | Page background |
| `--cream-200` / `--cream-300` | `#EDE2C9` / `#DBC9A8` | Borders, rules |
| `--rust-700` / `--rust-600` / `--rust-500` | `#A03B1E` / `#C9502E` / `#DC6338` | Flags, inconsistencies, calls to act |
| `--sage-600` / `--sage-100` | `#6B8A5E` / `#E4EBD6` | Mastered / consistent |
| `--gold-600` / `--gold-100` | `#C99A3C` / `#F5ECD4` | Developing / caution |
| `--color-surface` | `#FFFCF5` | Cards and panels |
| `--color-neutral-950` / `--color-neutral-600` | `#23201A` / `#5A5344` | Main and secondary text |

Legacy token names (`--forest-*`, `--paper-*`, `--coral-*`, `--oak-*`) are kept as aliases
to the values above so existing components retint without churn.

### Brand Identity (Appendix A, Change 9)

- **The mark** is a seal containing an "E" built from three stacked source bars; the middle
  bar is rust because Edvance highlights the evidence that matters and flags the source that
  disagrees. It must read at 16px.
- **Lockups**: horizontal (mark left, wordmark right) for header and footer; mark alone for
  favicons and collapsed chrome; wordmark alone only above 24px.
- **Assets**: `public/logo.svg` (lockup), `app/icon.svg` (favicon / app icon), and the
  `components/logo.tsx` React components used in the app.
- **Rules**: never rotate, outline, or re-colour the mark outside this palette.

These values may be refined after reviewing the first design preview.

### Typography
**Fraunces** (variable, italic, SOFT/WONK/opsz axes) for display and headings, over
**Inter** for body and UI. Both loaded through `next/font/google`.

### Initial Components
- Primary button
- Secondary button
- Text input
- Text area
- Evidence card
- Concept chip
- Consistency badge
- Mastery indicator
- Revision recommendation card

---

## 18. Initial Prototype Page

The first local application page should be an **Assessment Intelligence** page rather than a generic dashboard.

### Required Sections
- Edvance product header
- Assessment question
- Concepts being tested
- Supporting evidence
- Consistency status
- Mastery status
- Recommended revision

---

## 19. Prototype Mock Data

**Course:** Qubators AI Foundry  
**Lesson:** Prompt Engineering  
**Assessment Question:** "What are the five components of the PROMPT framework?"

**Course Evidence:**
- Purpose
- Role
- Objective
- Method
- Parameters
- Target Output

**Consistency Status:** Possible inconsistency

**Reason:** Assessment wording asks for five components while supplied lesson evidence contains six.

**Weak Areas:** Parameters, Target Output

**Next Action:** Review the relevant lesson evidence before attempting the assessment.

---

## 20. Non-Functional Requirements

### Usability
The interface should be understandable without technical knowledge.

### Accessibility
- Readable typography
- Strong contrast
- Visible focus states
- Keyboard-accessible controls
- Mobile-friendly layout where practical

### Privacy
- Use test data for Lesson 6
- Do not commit API keys
- Do not commit tokens
- Do not commit passwords
- Do not commit secret `.env` files

### Reliability
Future source references must accurately correspond to the cited material.

### Transparency
Clearly distinguish evidence-backed information, inferred information, and insufficient evidence.

---

## 21. Success Metrics

Longer-term metrics:
- Assessment questions successfully mapped to course sources
- Accuracy of source references
- Validated inconsistency detections
- Reduction in time required to locate relevant material
- Improvement in targeted practice performance
- User-reported confidence before assessments

Lesson 6 prototype success:
- Product value is understandable from one screen
- Signature assessment-intelligence flow is visible
- Page opens locally
- Design system is consistent
- Steering decisions are documented

---

## 22. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Becomes generic AI study assistant | High | Keep evidence and assessment intelligence central |
| AI invents unsupported information | High | Evidence-first responses and uncertainty labels |
| Source references are inaccurate | High | Validate mappings before display |
| Too many MVP features | High | Maintain narrow first wedge |
| Sensitive uploaded materials | High | Clear privacy and storage controls |
| Inconsistency flag is over-trusted | Medium | Show evidence and preserve human judgment |
| Architecture becomes too complex | Medium | Build one phase at a time |

---

## 23. Definition of MVP Success

The full MVP is successful when a learner can:
1. Add course material.
2. Add an assessment question.
3. See what concepts the question requires.
4. See where those concepts were taught.
5. See when course evidence appears inconsistent with the assessment.
6. See which required concepts are weak.
7. Receive targeted revision recommendations.

---

## 24. One-Sentence Product Description

**Edvance is an evidence-first assessment intelligence platform that shows learners what an assessment is testing, where the required knowledge was taught, whether the course evidence agrees, and what they still need to master.**

---

## 25. Product North Star

**What is being tested? → Where was it taught? → Does the evidence agree? → Have I mastered it? → What should I study next?**

---

# Appendix A — Agent Steering & Decision Log

> This appendix must reflect real instructions given to the AI builder and real changes visible in the repository. Do not claim a change was implemented until it actually was.

## Decision 1 — Local PostgreSQL for Current Development

**Date:** 2026-09-27  
**Requested by:** Product Owner  
**Status:** Confirmed by Product Owner — Active Architecture Decision

### Steering Question
Before implementation began, the Product Owner asked the AI builder to compare two approaches for Edvance's database/backend at the current development stage:

- **Option A (hosted):** Use a hosted service such as Supabase for the database/backend.
- **Option B (local):** Run PostgreSQL locally during development and move to hosted infrastructure later.

The comparison covered: cost, development complexity, control, local development workflow, vendor dependency, future scalability, migration/deployment later, and the requirements of the current Lesson 6 assessment.

### Alternatives Considered
- **Option A — Supabase (hosted):** Managed database, auth, storage, and realtime out of the box; a free tier exists. It adds a hosted dependency before the concept is proven, carries free-tier limits and potential pricing changes, and its auth/storage abstractions would conflict with the PRD-specified Better Auth and Cloudflare R2 stack. Lesson 6 requires no real database tests, so it offers no benefit at this stage.
- **Option B — Local PostgreSQL:** No external dependency and near-zero cost, keeps the Lesson 6 deliverable strictly local, provides full control over schema and migrations, and leaves a clear path to any managed Postgres host later.

### Decision
Use **PostgreSQL locally** during the current Edvance development stage.

### Reason
- The application is currently being built and tested locally.
- The Lesson 6 assessment does not require public deployment.
- We do not want an unnecessary hosted dependency during the prototype stage.
- PostgreSQL gives a solid relational foundation that can later be deployed to cloud infrastructure.
- The architecture should remain migration-friendly.

### Impact on Implementation Plan
- `docs/IMPLEMENTATION_PLAN.md` names PostgreSQL as the database.
- PostgreSQL is documented as running locally for now; cloud database deployment is deferred (Phase 4+).
- Phase 1 (Lesson 6 prototype) requires no hosted database and no real database tests.
- Keep schema and migrations portable (DB-agnostic ORM, standard SQL) so a later phase can select any managed Postgres provider (e.g., Neon, RDS, Supabase) without redesign.
- Phase 1 will use `design.html` and a separate Assessment Intelligence page with mock/test data only. No PostgreSQL functionality is implemented in this phase.

### Verification
- [x] Implementation plan names PostgreSQL
- [x] PRD states app and database run locally
- [x] Phase 1 prototype does not require a hosted database

---

## Change 2 — Design Refinement

**Date:** 2026-09-27  
**Requested by:** Product Owner  
**Status:** Completed — Implemented in `design.html`

### Initial Observation
The first design preview was a sound starting point, but the Product Owner identified that:
- Hierarchy between the page title, section headings, and body text was not distinct enough.
- The primary action button did not stand out from surrounding content.
- Input borders and focus states were too subtle to notice quickly.
- Spacing between evidence cards and major sections felt compressed.
- The consistency status was presented only as small pills and was not immediately noticeable.
- The mastery list was harder to scan across several concepts than it should be.
- Some status colours used as text on plain backgrounds had borderline contrast.
- The page risked reading as a generic AI dashboard rather than an evidence product.

### Requested Refinement
The Product Owner asked the AI builder to:
1. Make the hierarchy between page titles, section headings, and body text clearer.
2. Increase the visual prominence of the primary action button without making the interface loud.
3. Make input borders and focus states easier to identify.
4. Improve spacing between evidence cards and major sections.
5. Make the consistency-status component easier to notice immediately.
6. Make the mastery indicators easier to scan across several concepts.
7. Improve contrast where necessary for readability.
8. Keep the overall design calm, modern, professional, and evidence-focused.
9. Avoid excessive gradients or decorative effects.
10. Make the page feel like an intelligent learning/evidence product, not a generic AI dashboard.

### Changes Made in `design.html`
- **Hierarchy:** The hero page title is now the Display style (800, 40px); section headings set to 24px and joined with numbered uppercase kickers ("01 &middot; Foundation", etc.); lede and caption text sit clearly below headings. Body headings force `neutral-950`, with secondary text on `neutral-600`.
- **Primary button:** Now font-weight 700 with larger padding and an elevated, subtle cake-layered shadow (inset highlight + drop shadow tinted primary), plus a gentle hover lift. Secondary button remains flat/outlined so the primary clearly dominates without adding loudness.
- **Inputs:** Borders thickened to `2px` using a `--color-neutral-500` border at rest, hover shifts to `primary-500`, and focus uses a `primary-700` border with a 4px translucent ring. Placeholder text is full-strength `neutral-600` (no opacity reduction).
- **Spacing:** Section bottom margins increased to 96px; divider margins to 80px; component grid gap widened to 32px; evidence cards and cards gained larger padding.
- **Consistency status:** Added a full-width consistency banner — tinted warning surface, left accent border, prominent "Possible inconsistency" badge with the title, explanation, and source line — displayed above the four compact badge states.
- **Mastery indicators:** Converted to a column-aligned table (Concept / Progress / Status) with a header row, a summary bar ("3 Mastered · 1 Developing · 2 Weak · 1 Untested"), and labelled status badges instead of colour-only text. Rows remain readable on mobile where columns stack.
- **Contrast:** Added `--color-success-700` and `--color-error-700` tokens; status text now renders on tinted badges (`success-50`, etc.) rather than on plain white, raising effective contrast. Removed reliance on coloured dots alone — every status pairs a tinted badge with a text label.
- **Evidence focus:** Added an Assessment → Concepts → Evidence → Consistency → Mastery → Revision pipeline strip to the hero to reinforce the evidence-first product framing. No gradients or decorative effects were introduced; the design stays flat, calm, and token-based.

### Impact on Design System
- The system now has a clearer type ramp (page title > section heading > body > caption > label) that will apply consistently to the app pages.
- Status communication is no longer color-only: badges carry text labels on tinted surfaces, improving accessibility and information density.
- The primary-button and input-focus patterns define reusable interaction tokens for the Assessment Intelligence page.
- The consistency banner and mastery table establish the visual language for the signature experience and can be lifted directly into Phase 1.

### Verification
- [x] Refinement is documented here
- [x] Updated `design.html` visibly reflects it

---

## Change 3 — Prototype Scope Control

**Date:** 2026-09-27  
**Requested by:** Product Owner  
**Status:** Planned for Phase 1

### Reason
Lesson 6 only requires a single working local page. Building authentication, production database integration, live AI calls, or the entire Edvance platform now would add unnecessary complexity.

### Decision
The first working page focuses only on the **Assessment Intelligence** experience using mock/test data.

### Deferred
- Authentication
- Production database logic
- Live AI APIs
- Real course ingestion
- Cloud deployment

---

## Change 4 — Phase 1 Completion & Status Documentation

**Date:** 2026-09-27  
**Requested by:** Product Owner  
**Status:** Completed in Phase 1

### Reason
Phase 1 work is complete. The project documentation must accurately reflect the current phase and must not imply that deferred functionality already works.

### Decision
Document the current project state:
- **Current phase:** Phase 1 — Design System & Assessment Intelligence Prototype.
- **Completed:** implementation plan created; architecture reviewed (Decision 1); local PostgreSQL selected for later data integration; `design.html` created; design refinements completed (Change 2); initial Assessment Intelligence page built (`assessment-intelligence.html`); local prototype tested with mock data.
- **Not yet implemented:** Better Auth; PostgreSQL application integration; Cloudflare R2; real course ingestion; live AI APIs; source-processing pipeline; production deployment.
- **Next phase:** Phase 2 — Core Application Structure.

`README.md` now includes simple instructions for running the local prototype.

### Impact on this document
Added §16.1 Current Status; updated the document status header; updated appendix checklists. No functionality claims beyond what is implemented.

---

## Change 5 — Phase 2 Core Application Structure

**Date:** 2026-09-27  
**Requested by:** Product Owner ("continue" after Phase 1)  
**Status:** Completed in Phase 2

### Reason
A single Assessment Intelligence page is not enough to explore a course. The learner needs a structured workspace around a course and its evidence.

### Decision
Build Phase 2 as a Next.js + TypeScript app (App Router) that runs locally:
- Course workspace with create/open (created workspaces persist in the browser via `localStorage`).
- Navigation between Courses, Sources, Assessments, and Mastery.
- Sources section, Assessments section (list and add questions), and Mastery section, all rendering from mock data.
- Responsive, accessible layout using the approved design-system tokens.
- No authentication, no database, no live AI, no deployment.

### Verification
`npm run build` passes type-checking and compilation. `npm start` (or `npm run dev`) serves the app at `http://localhost:3000`; routes `/`, `/courses`, and each `/courses/[courseId]` section return 200.

### Impact on this document
§16.1 updated to Phase 2 complete; next phase identified as Phase 3. No functionality claims beyond what is implemented.

---

## Change 6 — Landing Page and Demo Sign-In

**Date:** 2026-09-27  
**Requested by:** Product Owner (wanted the product to open on a landing page with hero content and a sign-in/sign-up flow into the app)  
**Status:** Completed as a Phase 2 steering addition

### Reason
The Product Owner expected the product to begin on a landing page with hero and supporting sections, followed by sign-in/sign-up that leads into the application — not a direct entry into the course workspace. The existing `/` redirected straight to `/courses`, which did not match that expectation.

### Decision
Build the entry experience as a demo-flow addition on top of the Phase 2 app:
- Landing page at `/` with hero, the four central questions, feature highlights, how-it-works steps, and an honest demo-status section.
- Sign-in (`/signin`) and sign-up (`/signup`) pages that create a **local demo session** in `localStorage` and enter the app at `/courses`.
- Gated app routes: `/courses` and workspace pages redirect to `/signin` when no session exists, then return via the `next` query parameter.
- Header reflects session state (user name + Sign out, or Sign in).
- Explicitly **not** Better Auth — no real identity, no database, no secrets. Real accounts and persistence remain Phase 3 (and PostgreSQL integration Phase 4).

### Verification
`npm run typecheck` and `npm run build` pass. Routes `/`, `/signin`, `/signup`, and `/courses` return 200 on the dev server.

### Impact on this document
§16.1 updated to describe the landing page and demo sign-in; README run instructions updated. No functionality claims beyond what is implemented.

---

## Change 7 — "Field Guide" Visual Redesign

**Date:** 2026-09-27  
**Requested by:** Product Owner (provided three reference designs to elevate the product's visual identity)  
**Status:** Completed as a Phase 2 steering addition (design only — no functionality claims change)

### Reason
The Product Owner supplied three reference designs — a glassmorphism welcome screen, a deep-green feature band with earthy tinted tiles, and a warm artisan editorial page with serif display type and stamp badges — and asked that their elements be fused to elevate the project's design.

### Decision
Fuse the three references into one coherent system, named **"Field Guide"**:
- **Palette:** deep forest green (structure, primary actions, dark bands), warm paper/cream (study surfaces), coral (the flag colour for inconsistencies and calls to act), gold and oak (support tones).
- **Type:** Fraunces (soft display serif with SOFT/WONK axes) for display and headings, Inter for body and UI — self-hosted via `next/font`.
- **Atmosphere:** glassmorphism panels (frosted evidence card, glass sidebar, glass quote card on the auth screen) over radial-gradient tints with subtle film-grain texture.
- **Signature components:** glass evidence card with numbered pipeline (Question → Concept → Evidence → Consistency → Mastery → Revision), dashed "Evidence checked" stamp badge, tinted journey tiles, seal brand mark, split-screen forest/paper auth layout, forest footer.
- Applied to: landing page, sign-in/sign-up, courses directory, course workspace (overview, sources, assessments, mastery), header/footer, and the standalone `design.html` preview.
- Also fixed during verification: the header now re-reads the demo session on client-side route changes, so signing in from `/signin` immediately shows the user and Sign out in the header.

### Verification
`npm run typecheck` and `npm run build` pass. Routes `/`, `/signin`, `/signup`, `/courses`, and the `ai-foundry` workspace pages return 200. Landing, sign-in, courses, and mastery screens reviewed in the browser at 1440px.

### Impact on this document
§16.1 updated to record the redesign. Scope remains the same: demo data, demo sessions, no backend. No functionality claims beyond what is implemented.

---

## Change 8 — Phase 3: Accounts & Authentication (Better Auth)

**Date:** 2026-09-27  
**Requested by:** Product Owner (standing instruction to proceed autonomously through the approved plan)  
**Status:** Completed — Phase 3

### Reason
The approved implementation plan places real accounts (Better Auth) in Phase 3, with PostgreSQL running locally per Decision 1. The Product Owner granted blanket permission for normal local development operations, including installing tools and configuring the local environment.

### Decision
- **Local PostgreSQL provisioned** via the PostgreSQL 18 installer (winget, elevated with Product Owner approval): Windows service `postgresql-edvance` on `127.0.0.1:5432`, database `edvance`, dev-only superuser password (kept out of Git in `.env`).
- **Better Auth 1.7** with the Kysely adapter on `pg` + `Pool` over `DATABASE_URL`; `emailAndPassword.enabled`; `nextCookies()` plugin last so server actions can set cookies. Handler mounted at `/api/auth/[...all]` via `toNextJsHandler` (Next.js 16 proxy-style notes followed from Better Auth's Next.js guide).
- **Schema** created with `npx auth migrate` (`user`, `session`, `account`, `verification`).
- **Route protection is server-side**: `app/courses/layout.tsx` (RSC) calls `auth.api.getSession({ headers: await headers() })` and redirects to `/signin?next=/courses` when absent — the check is not bypassable by client code.
- **Per-user workspaces**: course storage is keyed by the signed-in user's email (`edvance.courses.v1.<email>`), so different accounts see different workspaces. First sign-in seeds demo workspaces. Course data itself is still browser-local mock data — PostgreSQL persistence for courses is Phase 4.
- **Demo entry preserved**: "Continue with a demo account" provisions/signs in a real local `demo@edvance.app` account (fixed demo password, local-only).
- **Header** is driven by the reactive Better Auth session (`authClient.useSession`) — user name and Sign out reflect real session state; Sign out revokes the server session.
- **Env**: `.env` (git-ignored) holds `DATABASE_URL`, `BETTER_AUTH_SECRET` (32-char base64), `BETTER_AUTH_URL`; committed `.env.example` documents the shape without values.

### Verification
`npm run typecheck` and `npm run build` pass (`/api/auth/[...all]` and `/courses` now server-rendered). API-level: `POST /api/auth/sign-up/email` creates the user; `get-session` with the cookie returns the session; `GET /courses` without a session → 307 to `/signin?next=/courses`, with a session → 200. PostgreSQL contains the created users and hashed credential accounts. Browser-level: real sign-up (Amara Okafor) lands on `/courses` with the header showing the account name and Sign out; workspace pages render scoped data. Sign-up form errors (short password, duplicate email) surface inline.

### Impact on this document
§16.1 updated to Phase 3 complete; next phase Phase 4. No functionality claims beyond what is implemented.

---

## Change 9 — "Press Room" Redesign & Edvance Identity

**Date:** 2026-09-27  
**Requested by:** Product Owner — "follow this inspiration to redesign the website. don't forget the Apple design skills… also create a logo that sells for me", with an artisan travel-poster reference design attached.  
**Status:** Completed

### Reason
Phase 2's "Field Guide" system was a forest/paper palette with a glass evidence card. The Product Owner supplied an artisan-poster reference — vintage illustration, teal/cream/rust palette, italic serif display type, a dark band of product tiles, circular icon medallions, pill controls — and asked for a redesign in that spirit, executed with Apple-grade craft, plus a logo. A product without a mark cannot be presented or remembered, so the identity was treated as a deliverable rather than a decoration.

### Decision
- **Palette shifted**: forest green → **deep teal** (`#0D2327`–`#2C6E70`); coral → **rust** (`#C9502E`); paper → **cream** (`#FBF6EA`); **sage** added for growth/mastery. The existing semantics were preserved deliberately — rust still means *flag*, teal still means *structure/evidence* — so the redesign changed the voice without changing what any colour means. Legacy token names remain as aliases, which retinted every workspace surface without touching workspace components.
- **A real logo was designed, not decorated**: the mark is a seal containing an "E" built from three stacked source bars with the middle bar rust-highlighted. It encodes the product's single idea (highlight the evidence, flag the source that disagrees) and stays legible at 16px. Delivered as `components/logo.tsx`, `public/logo.svg`, and `app/icon.svg` (Next.js file-convention favicon), with lockup rules documented on the `design.html` brand sheet.
- **Landing page restructured to the reference's rhythm**: a two-panel printed poster hero (cream paper panel with the words, hand-drawn SVG poster with the illustration), a dark teal band with three captioned illustration tiles, a cream band of four medallions with stitched rims, a sand editorial spread with step chips, and a dark teal honest-status band.
- **Header and footer rebuilt**: logo lockup left, centred anchor navigation, circular tool buttons right (the reference's medallion controls); the footer moved from forest-dark to cream with a real status note.
- **Craft decisions**: display type set in italic Fraunces with optical sizing (`opsz`) and WONK/SOFT axes; one shared grain texture token; one easing curve; a dotted stitched seam between the poster's two panels and dotted rims on the medallions; print-style paper grain over dark bands; `prefers-reduced-motion` respected globally.
- **Honesty fix**: the footer previously claimed "no backend involved", which Change 8 made false. It now states that accounts and sessions are real (local PostgreSQL + Better Auth) while course analysis is still mock data.

### Verification
`npm run typecheck` and `npm run build` pass; all routes build as before (`/`, `/_not-found`, `/signin`, `/signup`, `/courses*`, `/api/auth/[...all]`) plus the new `/icon.svg`. Browser-verified at 1440×980: header shows the logo lockup and centred nav with no horizontal overflow; the poster renders with the illustration panel's composition confirmed numerically (sun, sailboat, headland, lighthouse, and the document card all inside the frame at the intended coordinates); the medallion icons measure 76×76 after a selector fix; `/signin` shows the teal panel with the cream logo; `/courses` and `/courses/ai-foundry/mastery` render with teal navigation, teal mastery bars, and rust weak bars. A sweep for zero-size decorative SVGs returns none.

### Impact on this document
§16.1 updated; §17 palette, typography, and brand sections rewritten to the implemented system. No route, data, or authentication behaviour changed. No functionality claims beyond what is implemented.

---

## Change 10 — Interface Sheet Re-pointed at the Live Application

**Date:** 2026-09-28  
**Requested by:** Product Owner — "kindly let the design.html be updated to how the project currently looks"  
**Status:** Completed

### Reason
After Changes 7 and 9, `design.html` had become a *brand sheet*: a reasonable-looking page that restated the palette, type scale, buttons, and medallions **by hand**. That made it a second, unverified source of visual truth. It could (and did) show components the app rendered differently, and it said nothing about the screens a learner actually uses. The Product Owner asked for it to show the project as it currently is.

### Decision
- **The sheet now renders the product's own screens**: landing page (`/`), sign-in (`/signin`), course directory (`/courses`), course overview, sources, assessments, and mastery — with the real markup, the real class names, and the seeded demo content, each labelled with its route.
- **It no longer restates CSS.** The application stylesheet is inlined as a **verbatim snapshot** of `app/globals.css` between explicit `APP-CSS:BEGIN` / `APP-CSS:END` markers, so the sheet is correct by construction and self-contained (folders are not served alongside it when it is opened or previewed). Refreshing it is a deliberate, visible copy step rather than an invisible drift.
- **Inlined rather than linked** because the environments that open this file — the filesystem, a static server, and the Freebuff Preview tab (which serves that single HTML file and returns 404 for every sibling asset) — cannot resolve an external `app/globals.css`. A linked sheet rendered as unstyled HTML in two of the three.
- **Header, footer, and form states are shared**, not copy-pasted per screen: the guest header, the signed-in header, and the footer are defined once as templates and injected into every frame, so all seven screens show identical chrome. Links inside the frames are inert (they are renderings, not a running app) — noted on the page itself, which points to `npm run dev` for the interactive version.
- **The honesty note survives**: each screen carries a short note stating what is real (accounts, sessions, per-user workspaces) and what is seeded demo data, consistent with §16.1.
- **Brand and token reference retained**, but demoted to the last section and rendered with the application's real classes instead of private duplicates.

### Verification
Rendered at 1440×980 and measured in the browser: body background `rgb(251,246,234)`; hero title 72px italic Fraunces with `SOFT`/`WONK`/`opsz` variation settings applied; the four medallion discs 148px with 76×76 icons; poster grid `1.04fr .96fr` with the evidence card docked inside the illustration panel; footer cream `rgb(246,239,221)`; workspace nav-active `rgb(34,84,90)`; weak mastery bar `rgb(220,99,56)`; section order `poster-hero → band--ink → band--cream → band--sand → band--ink`; 7 frames, 7 headers, 7 footers, no leftover template slots; no clipped text and **no horizontal overflow** at any point on the page; a sweep for decorative SVGs under 8px returns none. These are the same values the live application reports, because the stylesheet is the same bytes.

### Impact on this document
§16.1 and §17 updated to describe the sheet accurately. No app code, route, data, or authentication behaviour changed — only `design.html` and the documentation that points at it.

---

## Change 11 — Phase 4: Course Data & PostgreSQL

**Date:** 2026-10-01  
**Requested by:** Product Owner (standing instruction to proceed autonomously through the approved plan)  
**Status:** Completed — Phase 4

### Reason
The approved plan places persistent course and learner records in Phase 4, and the single live gap in the Product Owner's assessment feedback was that the workspace still ran on seeded browser data rather than real storage. Until course records live in the database, Phase 5 ingestion has nowhere to write its materials, and the evidence pipeline has nothing durable to reason over.

### Alternatives Considered
- **An ORM (Drizzle or Prisma):** offers typed queries and generated migrations. Rejected for now: it adds a schema-definition layer and a generation step on top of a model the PRD already states directly in SQL terms, and the project is deliberately dependency-light. The `pg` client is already in the stack (Better Auth uses it), so plain SQL migrations plus a repository module achieve the same result with less machinery to keep in sync.
- **Keeping `localStorage` and syncing later:** rejected. It would have left two sources of truth and made Phase 5's uploads unwritable.

### Decision
- **Plain SQL migrations, applied by a small runner.** `db/migrations/0001_course_data.sql` creates the §15 model; `scripts/migrate.mjs` (`npm run migrate`) applies each pending file once, in filename order, inside a transaction, and records it in a `schema_migrations` ledger. Re-running reports "Database already up to date."
- **Schema faithful to the PRD, with two additions:** `course.institution` and `course.lesson` carry the fields the existing UI already collects, and `concept.ordinal` preserves the authored order of concepts (ordering by name would have scrambled the PROMPT-framework sequence). Identifiers are `text`, so seeded workspaces keep readable UUID-based ids.
- **Repository layer is the only SQL.** `lib/repo/courses.ts` maps rows to the `Course` domain type: it bulk-loads materials, concepts (left-joined to the learner's `mastery_state`), questions, and the latest consistency finding for the courses requested, rather than issuing a query per course.
- **Every query is owner-scoped.** The repository always takes the signed-in `user.id`; there is no code path that reads another learner's rows. Route handlers derive that id from the Better Auth session and return 401/404 otherwise.
- **Seeding moved to the server and became concurrency-safe.** `ensureSeeded` takes a per-user advisory lock, re-checks that the learner still has no courses, and writes everything in one transaction — so two parallel first requests cannot double-seed. Real ingestion replaces it in Phase 5.
- **`localStorage` removed from the workspace.** The hooks now fetch from `/api/courses`; the create and add-question forms POST. `lib/store.ts`, `lib/session.ts`, `lib/demo-data.ts`, and `components/user-bootstrapper.tsx` were deleted as dead code.
- **Honesty:** the course directory and the add-question form previously said workspaces were "stored locally on this device (demo data only)". They now state the data is stored in the local PostgreSQL database. `source_mapping` is deliberately not surfaced in the UI yet — it is populated in the intelligence phases — so it is not claimed as a working feature.

### Verification
`npm run typecheck` and `npm run build` pass; the build lists the three new dynamic `/api/courses…` routes. Migration applied once and a second `npm run migrate` reported no pending files. End to end with real sessions: `POST /api/auth/sign-in/email` then `GET /api/courses` returned the seeded workspaces; `GET /api/courses/:id` returned one course; `POST /api/courses` created a course; `POST /api/courses/:id/assessments` added a question that read back on the next request; unauthenticated `GET /api/courses` returned 401; a second learner saw only their own course ids; `/courses` returned 200 with a session and 307 → `/signin?next=/courses` without one. Row counts confirmed the data reached PostgreSQL, and a `source_mapping` insert/select/delete round-tripped against the schema. The throwaway test course was removed afterwards.

### Impact on this document
§16.1 updated to Phase 4 complete; next phase Phase 5. The data model in §15 is now implemented rather than planned. No live AI, file storage, or ingestion is claimed.

---

## Change 12 — Phase 5: Course Material Ingestion (Cloudflare R2)

**Date:** 2026-10-01  
**Requested by:** Product Owner ("Start Phase 5 — Course Material Ingestion: add a file upload flow that stores materials in Cloudflare R2 with a storageReference, surfaces them in the Sources section, and handles unsupported files gracefully.")  
**Status:** Implemented — end-to-end verification pending R2 credentials

### Reason
Phases 2–4 built the workspace and its database, but course materials were still seeded demo rows with no bytes behind them. Until real files can be stored and cited, the evidence-first pipeline (assessment-to-source mapping, inconsistency detection, mastery) has nothing authentic to reason over. Phase 5 gives `learning_material` a stored object and a `storageReference`, and puts a working upload in front of the learner.

### Alternatives Considered
- **An S3 SDK (`@aws-sdk/client-s3`):** the conventional route, with built-in SigV4. Rejected: it is a large dependency for three operations (put, delete, presigned get), and this project deliberately carries no ORM and few dependencies. R2 is S3-compatible, and SigV4 over Node's `crypto` is small and testable.
- **Presigned browser-to-R2 uploads:** avoids streaming file bytes through the server. Deferred: it needs per-bucket CORS configuration and a second "finalise" request, which is more moving parts than a self-contained upload for documents of this size. Server-side upload keeps the flow to one request and one place that enforces validation.
- **An in-memory or filesystem-only store:** rejected — it would not be Cloudflare R2 and would not survive a deploy, contradicting the plan.

### Decision
- **Store in R2, then write the row.** Ownership is checked first, the bytes are sent to R2, and only then is the `learning_material` row inserted with the object key as `storage_reference`. A failed insert removes the just-written object.
- **Object keys are owner-scoped:** `<user id>/<course id>/<material id>/<safe filename>`, so a bucket listing cannot cross learners, and download authorisation is a join back to the owning course.
- **Validation is duplicated on purpose:** the form gives immediate feedback; the route is authoritative. Both share one definition in `lib/materials.ts`.
- **The upload fails honestly when unconfigured.** With no R2 environment variables the route returns 503 with the exact variable names, and the form shows it — rather than writing a half-broken row or pretending to succeed.

### Verification
`npm run typecheck` and `npm run build` pass; the build lists the two new routes `POST /api/courses/[courseId]/materials` and `GET /api/courses/[courseId]/materials/[materialId]/download`. `npm run migrate` applied `0002_material_storage.sql` once (0001 skipped as already applied). Live, against the running dev server with a real session: unauthenticated `POST …/materials` → 401; `.exe` upload → 415; multipart body with no `file` field → 400; upload against a course the learner does not own → 404. The throwaway test account was removed afterwards. **Not yet verified:** a real file upload and download through R2, which requires credentials; the route reports this state (503) until they are set.

### Impact on this document
§16.1 updated to Phase 5 implemented (verification pending credentials); next phase Phase 6. "Cloudflare R2 file storage" moved out of *not yet implemented*; the source-processing pipeline remains explicitly unimplemented and is not claimed.

---

## Change 13 — Storage replaced: Cloudflare R2 → Supabase Storage

**Date:** 2026-10-01  
**Requested by:** Product Owner (stering decision: use Supabase Storage for course materials, keeping PostgreSQL, Better Auth, and Infisical unchanged)  
**Status:** Implemented and verified end to end

### Reason
**Cloudflare R2 had previously been selected** (Decision 1, Change 12). The R2 implementation was written — a dependency-free SigV4 client — but it was **never successfully connected or tested**: no R2 credentials were ever configured, so no file was ever uploaded or downloaded through it. The Product Owner already had a Supabase account and free development setup available, so Storage could be exercised for real immediately. R2 was therefore replaced with Supabase Storage.

This is **storage only**. It does **not** mean Edvance migrated its database or its authentication to Supabase:

- **PostgreSQL remains the database.** Supabase's Postgres is not used; the app still talks to the local `edvance` database through `pg` and `lib/repo/courses.ts`.
- **Better Auth remains the authentication system.** Supabase Auth is not used and no Supabase session is created.
- **Infisical remains the secrets manager.** `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `SUPABASE_STORAGE_BUCKET` live in the Infisical `dev` environment beside the existing secrets.

### Alternatives Considered
- **Keep and finally configure Cloudflare R2:** viable, but it required the Product Owner to create and wire R2 credentials before any of Phase 5 could be verified, and verification — not features — was the blocker.
- **A local filesystem or in-memory store:** rejected — it would not survive a deploy and would not prove the real storage path.
- **Supabase for the database and auth too:** explicitly rejected — it would discard the PostgreSQL repository and the Better Auth integration that Phases 3–4 built and verified, for no benefit to the storage problem.

### Decision
- **Supabase Storage becomes the active file-storage provider**, in a **private** bucket (`edvance-materials`). The bucket is never made public.
- **Server-only access.** `lib/supabase-storage.ts` creates the client with `SUPABASE_URL` and `SUPABASE_SECRET_KEY`, disables session persistence, and is imported only by route handlers. The browser never receives the secret key; downloads are authorised by Edvance and then handed a short-lived **signed URL** (300 seconds).
- **Ownership-safe object key:** `users/{userId}/courses/{courseId}/materials/{materialId}/{safe filename}`. The filename is sanitised and is only ever the final path segment; the path cannot be steered by client input.
- **The database stays authoritative for deletes:** the `learning_material` row is removed first, then the object is cleaned up on a best-effort basis; a cleanup failure is logged as an orphan rather than failing a delete that already did its job.
- **Errors are sanitised.** Provider bodies are kept in the server log; the browser sees messages such as "File storage is temporarily unavailable." No secret key, authorisation header, or signed-URL token is logged or returned.
- **Superseded R2 code was removed** (`lib/r2.ts`, the `R2_*` requirements and wording). The historical record of R2 in this appendix is kept deliberately; Git history preserves the implementation.

### Verification
Verified live against the private Supabase bucket through the real application (dev server on port 3250, started via `infisical run`, throwaway accounts), then the throwaway data was deleted and the database returned to baseline (`user` 3, `course` 4, `learning_material` 20, `session` 8; zero objects left in the bucket):

- **Configuration:** `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_STORAGE_BUCKET` all PRESENT in Infisical `dev` (names only; no value was read into the transcript).
- **Upload:** a real PDF uploaded → HTTP 201; the `learning_material` row carried the server-derived `application/pdf` MIME, the correct byte size, and the owner-scoped `storageReference`; the object was confirmed present at that exact path with the service key.
- **Download:** `GET …/download` → HTTP 307 → signed URL → HTTP 200; SHA-256 of the downloaded bytes **matched** the uploaded file. A real TXT upload and download matched the same way.
- **Delete:** `DELETE …/materials/{id}` → HTTP 200; the row disappeared, the object was confirmed **absent** in the bucket, and a subsequent download returned 404. Deleting one material left the others' objects untouched.
- **Privacy:** anonymous requests to the public, authenticated, and bare object URLs all returned HTTP 400 — the bucket is not public.
- **Security/validation:** unauthenticated upload/download/delete → 401; a second learner downloading, deleting, or uploading to the first learner's course → 404 (and the first learner's file survived); `.exe` → 415; zero-byte → 400; 26 MB → 413; a PDF sent with a fake `text/html` content type was still stored as `application/pdf`.
- **Typecheck:** `npx tsc --noEmit` exit 0.

### Impact on this document
- §14 File Storage names Supabase Storage; §16.2 Phase 5 names Supabase Storage.
- §16.1: Phase 5 is **complete and verified**; next phase Phase 6.
- `docs/IMPLEMENTATION_PLAN.md`, `README.md`, and `conversation.md` updated to match.
- **Not claimed:** the source-processing pipeline (text/structure extraction) remains unimplemented — it is Phase 6.

---

## Change 14 — Phase 5.6: Text Extraction & Evidence Chunking

**Date:** 2026-10-01  
**Requested by:** Product Owner ("Proceed to Phase 5.6 — Text Extraction and Evidence Chunking. Do NOT begin Gemini or any AI-provider integration yet… Transform uploaded course materials from opaque stored files into structured, location-aware evidence.")  
**Status:** Implemented and verified end to end

### Reason
Phase 5 made files storable but left them opaque: `learning_material` rows pointed at objects in Supabase Storage with nothing behind them the evidence pipeline could reason over. Every later Edvance feature — assessment-to-source mapping, inconsistency detection, mastery — depends on being able to cite **where** in a real material a claim came from. Phase 5.6 exists so that Phase 6 has trustworthy, location-tagged evidence to analyse, without any AI yet.

### Alternatives Considered
- **A background job platform (queue/worker):** rejected for this local prototype. Ingestion is synchronous so the Sources UI is immediately truthful and the pipeline stays debuggable; a queue can be introduced later behind the same `lib/extraction` boundary.
- **A large document-processing framework:** rejected. The task calls for focused parsers, so the phase uses three maintained, permissively-licensed libraries plus hand-written plain-text parsers, rather than one heavyweight framework.
- **Chunk boundaries at fixed character counts:** rejected — it cuts sentences and loses source boundaries. Chunks never split a sentence and never span two source locations, so each chunk's citation is exact.
- **Fabricating a heading/location when one does not exist:** rejected. Extractors emit only locations they actually observed (page, slide, timestamp range, section, or line range).
- **Deleting a material whose extraction fails:** rejected — a parser failure is not the learner's fault, so the file is kept and only the job is marked failed with a retry action.

### Decision
- **Dependencies added** (all server-only, Node-compatible, permissively licensed): `pdfjs-dist` 6.3.289 (Apache-2.0) for PDF page text, `mammoth` 1.13.0 (BSD-2-Clause) for DOCX, `jszip` 3.10.2 (MIT) for reading the PPTX Open XML package. TXT, Markdown, WebVTT, and SRT are hand-written. The three server libraries are listed in `serverExternalPackages` so Next serves them from `node_modules` instead of bundling their worker/wasm assets.
- **One normalised shape.** Every extractor returns blocks of `{ text, location: { type, label, … } }` where `type` is `page` | `slide` | `timestamp` | `section` | `line` and `label` is the human-readable form a learner will see. `lib/extraction/index.ts` dispatches on the file extension from the stored object key.
- **Deterministic chunking.** `lib/extraction/chunk.ts` splits each block's text at sentence boundaries toward a ~900-character target (hard limit 1600), merges uselessly small tails, and never lets a chunk cross a source location. Ordinals are assigned in order at storage time.
- **Synchronous ingestion.** `lib/ingestion.ts` orchestrates create job → mark processing → download object (new `downloadObject` in `lib/supabase-storage.ts`) → extract → chunk → store → mark completed. The upload route runs it after the material row exists and still returns the material (201) regardless of the ingestion outcome; if ingestion cannot even start, that is logged and the upload still succeeds.
- **Failures are safe.** The job stores a short `error_code` and a user-safe `error_summary` only. Material contents and raw provider errors are never logged or persisted; the server log records just the material id and failure code.
- **Schema.** `material_ingestion_job` and `material_chunk` are new tables, both `references learning_material(id) on delete cascade`, so deleting a material removes its jobs and chunks. No new database was introduced; PostgreSQL remains the database.
- **Real state in the UI.** The Sources page shows "Ready for analysis" (not "Analyzed"), "Processing…", or "Extraction failed" with a Retry button, plus **only** derived metadata (e.g. "PDF · 14 pages", "Transcript · 37 cues", chunk count). Seeded sources carry a **Demo source** flag and are never presented as if derived from a real upload.

### Verification
Verified live against the real application (dev server on port 3250 started via `infisical run`, throwaway accounts, in-memory fixtures with unique known text, no copyrighted material), then all test data was deleted and the database returned to baseline (`user` 3, `course` 4, `learning_material` 20, `concept` 20, `assessment_question` 8, `mastery_state` 20, `session` 8; `material_ingestion_job` 0, `material_chunk` 0; zero objects left in the bucket). `scripts/test-ingestion.mjs` reports **91 passed, 0 failed**:

- **Extraction — all seven formats PASS:** PDF, TXT, Markdown, DOCX, PPTX, WebVTT, SRT. Each upload returned completed ingestion, wrote an ingestion job, and stored chunks whose text matched the known fixture text.
- **PDF page references PASS:** pages 1 and 2 produced distinct blocks labelled `Page 1` / `Page 2`.
- **PPTX slide references PASS:** slides 1 and 2 produced blocks labelled `Slide 1` / `Slide 2`.
- **Transcript timestamps PASS:** WebVTT and SRT cues produced ranges such as `00:00:01–00:00:04` and `00:00:05–00:00:09`.
- **Section/line locations PASS:** Markdown and DOCX produced `Section: …` labels; TXT produced `Lines 1–2` style labels.
- **Ingestion job and chunks PASS:** statuses advance `pending → processing → completed`; ordinals are `0..n-1` in order; chunks belong to the correct material.
- **Ownership isolation PASS:** a second learner could neither download nor trigger ingestion of the first learner's material (404) and owned zero chunks.
- **Failed-ingestion handling PASS:** a corrupted PDF (`corrupt-file`), a malformed VTT (`malformed-transcript`), and a whitespace-only TXT (`empty-content`) each produced a failed job with a safe code and **zero** chunks, while the uploaded file was kept. Re-ingesting a completed material created a new job and replaced its chunks without duplication. An unsupported `.xyz` was rejected at upload with 415.
- **Deleting a material PASS:** its chunks and jobs cascaded away.
- **Typecheck PASS:** `npx tsc --noEmit` exit 0. **Secret scan PASS:** the staged-changes Infisical scan exited 0.

### Impact on this document
- §15 data model gains `material_ingestion_job` and `material_chunk` (realised in migration `0003`).
- §16.1: Phase 5.6 is **complete and verified**; next phase Phase 6. "Source-processing pipeline" is no longer listed as not-yet-implemented; **AI** concept extraction remains explicitly unimplemented.
- `docs/IMPLEMENTATION_PLAN.md`, `README.md`, and `conversation.md` updated to match.
- **Not claimed:** no AI provider (Gemini or otherwise), prompt, concept extraction, embeddings, or vector database was added. The seeded demo sources remain demo data and are labelled as such.

## Change 15 — Phase 6: Course Intelligence

**Date:** 2026-10-01  
**Requested by:** Product Owner (autonomous completion directive, §12)  
**Status:** Implemented and verified end to end, including a real Google Gemini call

### Reason
Phase 5.6 produced trustworthy, location-tagged evidence but nothing yet reasoned over it. Edvance's product promise — what is being tested, where it was taught, whether the evidence agrees — begins with knowing what a course actually teaches and where. Phase 6 turns `material_chunk` into that structured intelligence, without ever inventing a citation.

### Alternatives Considered
- **Supporting legacy binary `.doc`/`.ppt`:** rejected for the MVP. There is no reliable server-side text extractor for the binary Office formats, so keeping them would let a learner upload a file Edvance can never read. Edvance now accepts only formats it can extract: `.pdf`, `.txt`, `.md`, `.docx`, `.pptx`, `.vtt`, `.srt`.
- **Multiple AI providers / provider routing:** rejected by the directive and by the dependency policy. One provider (Google Gemini) keeps the surface small.
- **A schema-only guarantee:** rejected. Structured output constrains generation but does not guarantee truth, so the response is re-validated at runtime and every citation is resolved against the real evidence.
- **Storing raw model output for debugging:** rejected — it may contain course contents. Only a short failure code and a user-safe summary are persisted.
- **Analysing automatically on page load:** rejected. It would spend money without the learner asking, so analysis is only ever an explicit action, and stored intelligence that is already current is not re-analysed.
- **A vector database or embeddings:** rejected as out of scope; bounded evidence and one prompt are sufficient at this stage.

### Decision
- **One provider, server-only.** Google Gemini through the official `@google/genai` server SDK (`^2.25.0`, pinned below `3.0.0`). `lib/ai/gemini.ts` is the only module that reaches a provider; the key (`GEMINI_API_KEY`, optional `GEMINI_MODEL`) is read from Infisical, never logged and never sent to the browser.
- **Layout.** `lib/ai/types.ts`, `schemas.ts`, `prompts.ts`, `gemini.ts`, `course-intelligence.ts`.
- **Strict validation.** `schemas.ts` holds the structured-output JSON Schema and a runtime validator; `resolveReferences` proves every cited chunk id is one that was actually sent, all of which were loaded scoped to this learner and this course. Unknown, cross-course and cross-user ids are rejected and the whole response — never a partial one — is discarded.
- **Evidence states.** `SUPPORTED`, `PARTIALLY_SUPPORTED`, `INSUFFICIENT_EVIDENCE`. Insufficient evidence is a valid successful outcome. `INSUFFICIENT_EVIDENCE` concepts are stored with no evidence so the gap is visible rather than hidden.
- **Instructor terminology.** The model is instructed to return the course's own term as `instructorTerm`, stored verbatim in `concept.instructor_term`, and the UI shows it whenever it differs from the canonical name.
- **Evidence.** `concept_evidence` links a concept to a real `material_chunk`, its material and its human-readable location, plus a verbatim excerpt. A citation is never a string the model produced on its own.
- **Relationships.** A small justified set: `prerequisite`, `part_of`, `related_to`, `contrasts_with`. Definitions and endpoints are validated; a relationship to an undefined concept is rejected.
- **Analysis state.** `course_analysis.status` is `not-analyzed` / `analyzing` / `ready` / `failed` / `insufficient-evidence` / `needs-reanalysis`. An `analyzing` status is a light lock. The row also stores an **evidence fingerprint** — the material ids and chunk counts, no contents — so a new, removed or changed material makes the stored intelligence `needs-reanalysis` on the next read, with no model call.
- **Cost control.** Analysis runs only on `POST /api/courses/[courseId]/analyse`; context is bounded (`MAX_EVIDENCE_CHUNKS` 150, `MAX_EVIDENCE_CHARS` 120 000); an up-to-date course returns `outcome: "up-to-date"` without calling the model; there is no recursion or automatic re-analysis; and only safe usage metadata (model, token counts) is stored.
- **Schema.** Migration `0004_course_intelligence.sql` adds `course_analysis`, `concept_evidence` and `concept_relationship`, and extends `concept` with `origin` (`seed`/`analysis`), `evidence_status` and `confidence`. Real analysis replaces a course's concepts, so demo concepts are never shown as if extracted. No new database.
- **Test provider.** `EDVANCE_AI_MOCK` selects a deterministic, evidence-grounded stand-in for Gemini so the pipeline can be tested without a key or a network call. It is refused when `NODE_ENV === production`, so a mock can never answer a real learner.
- **Provider resilience.** The SDK's retry policy is pinned explicitly (three attempts, initial 1s, capped at 8s) rather than left at its multi-minute default, so a transient capacity 503 or rate-limit 429 is retried a bounded number of times within one learner action and a non-transient error fails immediately. The live call is exercised by `scripts/verify-gemini-live.mjs`.

### Verification
Typecheck (`npx tsc --noEmit`) exit 0. `scripts/test-course-intelligence.mjs` reports **59 passed, 0 failed** against a dev server (port 3260) started with the deterministic provider; the Phase 5.6 regression (`scripts/test-ingestion.mjs`) reports **91 passed, 0 failed** on the same server. The database was returned to baseline afterwards (`concept_evidence` 0, `concept_relationship` 0, `course_analysis` 0, `material_chunk` 0, `material_ingestion_job` 0; users, courses, materials, concepts and assessments unchanged) and the bucket was emptied.

- **Golden fixture PASS:** an original fictional six-part framework — the **FATHOM** framework (Frame, Assemble, Trace, Hold, Order, Move) — was uploaded as one material and all six components were extracted, each with its own evidence and a `Section: …` location. This fixture is reused in Phase 7 for the six-versus-five inconsistency.
- **Instructor terminology PASS:** every concept's `instructorTerm` matched the course's own wording exactly.
- **Evidence resolution PASS:** every cited chunk resolved to a stored `material_chunk`; a fabricated chunk id was rejected with 502 and stored nothing.
- **Multi-source PASS:** one concept taught in two materials stored evidence from both.
- **Insufficient evidence PASS:** an empty course and a model-returned `INSUFFICIENT_EVIDENCE` both recorded that state honestly, with no concepts invented.
- **Validation and failure PASS:** malformed structured output, an invalid chunk id and a provider failure each produced 502, zero persisted concepts, and a safe `error_summary` that never echoed the raw output.
- **Staleness PASS:** adding a material after a successful analysis changed the state to `needs-reanalysis` on the next read.
- **Cost control PASS:** re-analysing an up-to-date course returned `up-to-date` without a model call.
- **Duplicate handling PASS:** two model concepts for the same idea merged into one with combined evidence.
- **Ownership isolation PASS:** another learner could not analyse the course (404); an unauthenticated request was refused (401); a demo-only workspace was recorded as `insufficient-evidence` rather than fabricated.
- **Upload cleanup PASS:** `.doc` and `.ppt` uploads are rejected with 415; the seven supported formats still pass.

- **Live Google Gemini PASS:** the one gate that a deterministic provider cannot prove is now closed. With `GEMINI_API_KEY` present in Infisical, `scripts/verify-gemini-live.mjs` ran against the live API (model `gemini-3.5-flash`) and reported **26 passed, 0 failed**: all six FATHOM components extracted with exact instructor terminology, every citation resolved to a real `Section: …` chunk whose excerpt is a verbatim substring of the uploaded material, one justified `prerequisite` relationship between real concepts, cost control holding, and staleness working. The stored analysis recorded safe provider metadata only (model, 737 input / 718 output tokens). The `dev` environment pins `GEMINI_MODEL=gemini-3.5-flash` because the `gemini-flash-latest` alias was intermittently capacity-limited during verification; the code default remains the maintained `-latest` alias, protected by the bounded retry.

The live provider was reached through the running app's `POST /api/courses/[courseId]/analyse` — never directly from a client — so the call also proves the authentication, ownership and persistence path against a real model.

### Impact on this document
- §15 data model gains `course_analysis`, `concept_evidence` and `concept_relationship`, and `concept` gains `origin`, `evidence_status` and `confidence` (migration `0004`).
- §16.1: Phase 6 is implemented and verified end to end — against a deterministic provider for every branch, and against the live Google Gemini API for the real model output. AI is no longer "not yet implemented" — the provider is Google Gemini only.
- `docs/IMPLEMENTATION_PLAN.md`, `README.md`, `conversation.md` and `.env.example` updated to match; `GEMINI_API_KEY` documented as a server-only secret.
- **Not claimed:** no second AI provider, embeddings, vector database, or auto-analysis was added. Demo concepts are removed from a course the moment it is really analysed.

---

## Change 16 — Phase 7: Assessment Intelligence

**Date:** 2026-10-01  
**Requested by:** Product Owner (autonomous completion directive, §13)  
**Status:** Implemented and verified end to end, including a real Google Gemini call

### Reason
Phase 6 established what a course teaches and where. An assessment question is only useful to a learner if Edvance can say what it actually tests — and, crucially, whether the question agrees with the course's own evidence. A question that asks for "the five components" of a six-part framework is exactly the failure this phase exists to catch, and it must be caught by pointing at the evidence, not by opinion.

### Alternatives Considered
- **Judging a question against the raw material again:** rejected. Re-reading every chunk per question would spend a model call on work the course analysis already did, and would let the question and the course disagree about what the course teaches. The question is judged against the concepts the evidence already established.
- **Analysing questions automatically when one is added:** rejected for the same reason course analysis is manual — it spends money without the learner asking, and the course may not be analysed yet.
- **Comparing word counts and numbers mechanically:** rejected. "Five" versus six components is a real signal, but deciding it in code would produce confident nonsense on prose. The model makes the judgement; Edvance only checks that the judgement is grounded in concepts it actually has.
- **Allowing an inconsistency claim with no cited concept:** rejected outright. A verdict of `POSSIBLE_INCONSISTENCY` that names nothing is unverifiable, so the whole response is discarded.
- **Keeping the seeded course-level narrative alongside real analysis:** rejected. Writing a real signature removes the demo finding, so seeded prose is never shown as if it were evidence.

### Decision
- **One provider, still server-only.** Assessment intelligence uses the same Google Gemini provider and the same `lib/ai/` layer. `lib/ai/assessment-intelligence.ts` is pure: it takes the question and the course's analysed concepts and returns a verdict, so it is unit-testable with no database.
- **Schema.** Migration `0005_assessment_intelligence.sql` adds `assessment_analysis` (per-question `status`, safe `error_code`/`error_summary`, evidence fingerprint, tested-concept count, safe provider metadata, timestamps), a unique index giving each question at most one `consistency_finding`, and a unique index preventing duplicate source mappings for the same concept and location. Existing tables carry the rest: `source_mapping` (question → concept → material → location → confidence) and `consistency_finding` (status, description, next action).
- **`source_mapping` is now used.** It was created in Phase 4 and unused through Phase 6; Phase 7 writes it from the validated verdict and reads it to build each question's signature.
- **Grounded concepts only.** The prompt is given the course's extracted concepts with their evidence status, definition and taught locations. The model names concepts by the exact supplied id, and `resolveAssessmentReferences` proves every id was in the input — a hallucinated, cross-course or cross-user concept rejects the whole response.
- **Consistency states.** `Consistent`, `Possible inconsistency`, `Insufficient evidence`, stored as `consistent` / `possible-inconsistency` / `insufficient-evidence` and surfaced as `CONSISTENT` / `POSSIBLE_INCONSISTENCY` / `INSUFFICIENT_EVIDENCE` from the model. A `POSSIBLE_INCONSISTENCY` must name at least one existing concept as the evidence that disagrees; otherwise the response is rejected as `unjustified-inconsistency`.
- **A course must be analysed first.** Without a ready course analysis there are no evidence-grounded concepts, so the endpoint answers 409 and tells the learner to analyse the course rather than guessing from the question alone. A ready course with no concepts records `insufficient-evidence` honestly, with no model call.
- **State and cost control mirror Phase 6.** Per-question states `not-analyzed` / `analyzing` / `ready` / `failed` / `insufficient-evidence` / `needs-reanalysis`; an up-to-date signature returns `outcome: "up-to-date"` without a model call; a new or changed material makes the signature `needs-reanalysis` because the concepts it was judged against are themselves stale; analysis is only ever an explicit learner action.
- **The course verdict is honest too.** The course-level consistency is the most severe, most recent finding, so a single inconsistent question is never hidden by a later, milder result.

### Verification
Typecheck (`npx tsc --noEmit`) exit 0. `scripts/test-assessment-intelligence.mjs` reports **76 passed, 0 failed** against a dev server (port 3260) started with the deterministic provider; the Phase 6 suite reports **59 passed, 0 failed** and the Phase 5.6 regression **91 passed, 0 failed** on the same server. The live provider (`scripts/verify-gemini-live.mjs`, model `gemini-3.5-flash`) reports **34 passed, 0 failed**. The database and bucket were returned to baseline afterwards (`assessment_analysis` 0, `source_mapping` 0, `course_analysis` 0, `concept_evidence` 0, `material_chunk` 0; 3 users / 4 courses / 20 materials / 20 concepts / 8 assessments unchanged; bucket 0 objects).

- **Six-versus-five PASS (deterministic):** the FATHOM fixture with the question "What are the five components of the FATHOM framework?" produced `possible-inconsistency` with a reason naming both numbers, six tested concepts, and six real `source_mapping` rows pointing at six real `Section: …` locations.
- **Six-versus-five PASS (live model):** the real API returned `possible-inconsistency` with the reason "The question assumes there are five components in the FATHOM framework, whereas the course evidence shows there are six components: Frame, Assemble, Trace, Hold, Order, and Move.", naming all six real concepts and nothing invented.
- **Consistent question PASS:** a question that agrees with the evidence was recorded as `consistent` with the concepts it tests.
- **Rejection PASS:** an invalid concept id, an unjustified inconsistency, malformed output and a provider failure each produced 502, zero source mappings, a `failed` signature and a safe error summary that never echoed raw output.
- **Gate PASS:** checking a question before the course is analysed is refused with 409; a ready course with no concepts records `insufficient-evidence` without a model call.
- **Cost control PASS:** re-checking an up-to-date question returned `up-to-date` with no model call.
- **Staleness PASS:** adding a material marked the signature `needs-reanalysis`, and re-checking was refused until the course was re-analysed.
- **Isolation PASS:** another learner could not check the course (404), an unauthenticated request was refused (401), and a question id from another course was not found (404). No mapping ever pointed at another course's concept.
- **Demo honesty PASS:** a seeded workspace's questions start `not-analyzed` with no concepts, and are refused until the course is analysed.

### Impact on this document
- §15 data model: `assessment_analysis` is added (migration `0005`); `source_mapping` and `consistency_finding` move from schema-only to populated.
- §16.1: Phase 7 is complete and verified end to end against both the deterministic provider and the live Google Gemini API.
- `docs/IMPLEMENTATION_PLAN.md`, `README.md`, `conversation.md` and `docs/EDVANCE_EXECUTION_STATE.md` updated to match.
- **Not claimed:** no second AI provider, embeddings, vector database, or auto-analysis. Edvance never accuses a question of inconsistency without naming the evidence it disagrees with, and never states a number the course's materials do not establish.

---

## Change 17 — Phase 8: Mastery Intelligence

**Date:** 2026-10-01  
**Requested by:** Product Owner (autonomous completion directive, §14)  
**Status:** Implemented and verified end to end (deterministic provider; no model call)

### Reason
Phases 6–7 established what a course teaches and what each question tests. Neither says anything about the learner. A mastery profile is only trustworthy if it is earned: if a status could be produced by the AI, or seeded as if it were a result, the learner would be looking at an assertion rather than evidence of their own work. Phase 8 makes mastery a pure function of what the learner actually did.

### Alternatives Considered
- **Letting the model grade an answer and set a status:** rejected. That is exactly the "AI-set mastery" the directive forbids; it would make the profile an opinion, cost a model call per attempt, and cannot be reproduced. Mastery is derived in code from recorded attempts.
- **Deriving mastery on every read from the full attempt history only:** rejected as the sole mechanism, because the database would then have no materialised profile to read cheaply or reason about over time, and the Phase 4 `mastery_state` contract would go unused. Attempts remain the source of truth; `mastery_state` is recomputed from them on each write.
- **Counting a single correct answer as mastery:** rejected. One lucky answer is not mastery; the rule requires a minimum number of attempts before the top state is reachable.
- **Inventing a distinct status vocabulary:** rejected. The product already ships **Untested / Weak / Developing / Mastered** and `ConceptStatus` already carried them; Phase 8 uses that vocabulary unchanged.
- **A model-written "why" explanation of a computed status:** deferred. It would add a model call and a quota dependency for no new information; the attempt trail itself is the explanation (`explainMastery` renders it in words).

### Decision
- **`practice_attempt` is the source of truth.** Migration `0006_practice_mastery.sql` adds it (learner, course, concept and/or assessment question, the answer text, correctness, timestamp) with an invariant that an attempt is always about a concept, a question, or both, plus indexes for the per-learner-per-concept read. It also adds `attempt_count`, `correct_count` and `last_attempt_at` to `mastery_state` so the materialised row shows the practice behind it; the defaults keep seeded demo rows valid.
- **One deterministic rule.** `lib/mastery.ts` is pure and unit-testable: no attempts → **Untested**; fewer than half correct → **Weak**; at least half correct but not yet earned → **Developing**; at least 80% correct over at least three attempts → **Mastered**. `score` is the percentage of correct attempts (0 for Untested). The same history always yields the same result, and a single answer can never reach Mastered.
- **Never AI-set.** No model is called anywhere in this phase. An attempt is the learner's own record of what they did; the status is computed from those records and nothing else.
- **Attempts are attributed, not ambiguous.** Practising an assessment question writes one attempt per concept that question was checked against (its real `source_mapping`), so the attribution survives a later re-analysis; practising a single concept writes one attempt for that concept. After writing, the affected concepts' mastery is re-derived from the learner's complete attempt history and upserted into `mastery_state` in the same transaction.
- **Prerequisites are honest.** A question can only be practised once it has been checked against the course's evidence; otherwise the endpoint answers 409 and points at the Assessments tab. A concept can only be practised if it belongs to the course, or the request is refused.
- **The endpoint is the only write path.** `POST /api/courses/[courseId]/practice` authenticates, authorises by ownership, validates the single target and the boolean verdict, and returns the refreshed course. It is always an explicit learner action; nothing runs on a page refresh.
- **The UI shows the trail.** The Mastery tab states that a concept with no attempts stays Untested, shows each concept's attempts and correct count, offers a practice panel (checked questions and single concepts, with an optional answer and a right/wrong record), and lists recent practice with the question and the learner's own answer.

### Verification
Typecheck (`npx tsc --noEmit`, after clearing `tsconfig.tsbuildinfo`) exit 0. `scripts/test-mastery-intelligence.mjs` reports **48 passed, 0 failed** against a dev server (port 3260) started with the deterministic provider; the Phase 7 suite reports **76 passed, 0 failed**, Phase 6 **59 passed, 0 failed**, and the Phase 5.6 regression **91 passed, 0 failed** on the same server. The secret scan is clean, and the database and bucket were returned to baseline afterwards (`practice_attempt` 0; `mastery_state` 20 unchanged; 3 users / 4 courses / 20 materials / 20 concepts / 8 assessments unchanged; bucket 0 objects). No model call was made.

- **Honest baseline PASS:** before any practice every concept is **Untested**, no attempt rows exist, and no practice counts are invented.
- **Ladder PASS:** on the six-part FATHOM fixture, one wrong attempt made all six tested concepts **Weak** (score 0); 1/2 correct → Developing (50); 2/3 → Developing (67); 3/4 → Developing (75); 4/5 → **Mastered** (80). The status only moved as the attempts justified, and every concept moved together.
- **Attribution PASS:** a wrong question attempt wrote exactly six `practice_attempt` rows, one per tested concept; the stored score equalled the attempts that produced it (reproducible); the answer and the question were both retained on the attempt.
- **Per-concept isolation PASS:** practising a single concept changed only that concept; the others stayed Mastered, and exactly one new row was written.
- **Gate PASS:** practising an unchecked question was refused with 409 and a message pointing at the Assessments tab.
- **Validation PASS:** a missing target, two targets at once, a non-boolean verdict, an over-long answer, an unknown concept and a non-JSON body were each refused with 400. No attempt was written for any rejected request.
- **Isolation PASS:** another learner could not practise the course (404), an unauthenticated request was refused (401), a question id from another course was not found (404), and another course's concept was refused (400).
- **Demo honesty PASS:** a seeded workspace still renders its demo mastery with no real attempts, and a demo question cannot be practised before the course is analysed (409).

### Impact on this document
- §15 data model: `practice_attempt` is added (migration `0006`); `mastery_state` gains attempt counts and a last-practised timestamp.
- §16.1: Phase 8 is complete and verified end to end with no model call.
- `docs/IMPLEMENTATION_PLAN.md`, `README.md`, `conversation.md` and `docs/EDVANCE_EXECUTION_STATE.md` updated to match.
- **Not claimed:** no AI grades an answer, no AI assigns a mastery, and no status is seeded as if earned. Mastery is a deterministic function of the learner's own recorded attempts.

---

## Change 18 — Phase 9: Targeted Revision

**Date:** 2026-10-02  
**Requested by:** Product Owner (autonomous completion directive, §15)  
**Status:** Implemented and verified end to end (deterministic provider)

### Reason
By Phase 8 the learner knows which concepts are weak, but not what to do about it. A mastery profile that stops at a status list leaves the learner to choose their own next step, which is exactly the gap Edvance exists to close. Phase 9 turns evidence and mastery into the smallest useful next action — and practice written for the weak areas, not drawn at random from the course.

### Alternatives Considered
- **Letting the model decide what to revise:** rejected. Which concepts are weak is a fact about the learner's own recorded practice, so it is derived deterministically and needs no model. Only the practice questions need one.
- **Generating practice for the whole course:** rejected outright by the acceptance criteria. The model is given only the weak/untested concepts and the evidence that teaches them, so a question can only be written for a real gap.
- **Recommending by lowest score only:** rejected. The ordering is by weakest evidence of mastery — **Weak** (attempted and mostly wrong) first, then **Developing** (nearest to mastery), then **Untested** (needs a first measurement) — because a failed attempt needs remediation before a fresh one needs starting. A **Mastered** concept is never recommended.
- **Allowing a generated question with no cited evidence:** rejected. A question the course cannot answer is worthless and would be an invented citation, so the whole response is discarded.
- **Storing generated practice beside hand-written assessment questions:** rejected. Generated practice is a distinct, disposable artefact tied to the current weak areas, so it lives in its own table and is replaced on each generation.

### Decision
- **The recommendation is deterministic.** `lib/revision.ts` builds the focus (weak → developing → untested, Mastered excluded) and the single next action from mastery and the course's evidence. It runs on every read, so the recommendation is always current and costs nothing.
- **Schema.** Migration `0007_targeted_revision.sql` adds `practice_question` (the question, its concept, a rationale, and the real material/location it was grounded in) and `revision_plan` (per-course generation state, mirroring `course_analysis` and `assessment_analysis`, including a `generated_for` weak-area fingerprint).
- **Only the weak areas are sent.** `getConceptEvidenceChunks` loads exactly the chunks that teach the focus concepts, scoped to this learner and course. The prompt offers only those concepts and that evidence, so the model never sees the rest of the course.
- **Every reference is proved real.** `resolveRevisionReferences` rejects the whole response if a question names a concept that was not supplied or cites a chunk that was not supplied — the same honesty rule as Phases 6 and 7. Questions are bounded (`MAX_PRACTICE_QUESTIONS` 12).
- **Practice feeds mastery.** A generated question can be recorded as right or wrong through the Phase 8 practice endpoint, so the mastery profile — and therefore the recommendation and the weak-area fingerprint — updates immediately.
- **Staleness is free.** When mastery moves, the fingerprint changes and the stored plan becomes `needs-reanalysis` with no model call; the learner regenerates only when they choose to. An up-to-date generation is never recomputed. Recording an attempt never spends a model call.
- **Honest states.** A course that has not been analysed is refused with 409; a course with no concepts records `insufficient-evidence`; a fully-mastered course records `nothing-to-revise`; a weak area with no stored evidence records `insufficient-evidence` — each without a model call.
- **A new Revision tab** shows the next action, the focus with its evidence, the generation state, and the targeted practice with a right/wrong record per question.

### Verification
Typecheck (`npx tsc --noEmit`, after clearing `tsconfig.tsbuildinfo`) exit 0. `scripts/test-targeted-revision.mjs` reports **72 passed, 0 failed** against a dev server (port 3260) started with the deterministic provider; the Phase 8 suite reports **48 passed, 0 failed**, Phase 7 **76**, Phase 6 **59**, and the Phase 5.6 regression **91**. The secret scan is clean, and the database and bucket were returned to baseline afterwards (`practice_question` 0, `revision_plan` 0; 3 users / 4 courses / 20 materials / 20 concepts / 8 assessments / 20 mastery rows unchanged; bucket 0 objects).

- **Recommendation PASS:** on the six-part FATHOM fixture with no practice, all six Untested concepts were in focus and the next action named the first one and its real `Section: …` evidence — with no model call and no `revision_plan` row.
- **Targeted generation PASS:** the model produced one question per weak concept, each naming a supplied concept, citing a real `Section: …` location, and stored with the plan's weak-area fingerprint and safe provider metadata. No question ever pointed at another course's concept.
- **Cost control PASS:** a second generation returned `up-to-date` and did not duplicate the stored questions.
- **Re-targeting PASS:** mastering *Frame* and failing *Assemble* moved the recommendation — *Frame* left the focus, *Assemble* became the recommended first action, the stored plan became `needs-reanalysis`, and regeneration wrote five questions with none for the Mastered concept and replaced the stored set.
- **Nothing-to-revise PASS:** with all six concepts Mastered the focus emptied and a generation recorded `nothing-to-revise` with zero questions.
- **Rejection PASS:** an invalid concept id, an invalid chunk id, malformed output and a provider failure each produced 502, zero stored questions, a `failed` plan and a safe error summary that never echoed raw output.
- **Insufficient evidence PASS:** a model that returned no questions recorded `insufficient-evidence` honestly with no questions invented.
- **Gate and isolation PASS:** generation before the course is analysed is refused with 409; another learner gets 404 and an unauthenticated request 401. A seeded demo course refuses generation until it is analysed.

### Impact on this document
- §15 data model: `practice_question` and `revision_plan` are added (migration `0007`).
- §16.1: Phase 9 is complete and verified end to end.
- `docs/IMPLEMENTATION_PLAN.md`, `README.md`, `conversation.md` and `docs/EDVANCE_EXECUTION_STATE.md` updated to match.
- **Not claimed:** the model never chooses what to revise — that is derived from recorded practice — and never writes practice for a concept outside the learner's actual weak areas, nor cites evidence that was not supplied.

---

# Appendix B — Lesson 6 Verification Checklist

## Task 1 — Implementation Plan
- [x] AI builder has read this PRD
- [x] Ordered implementation phases exist
- [x] Framework named: Next.js + TypeScript
- [x] Database named: PostgreSQL
- [x] Authentication named: Better Auth
- [x] File storage named: Cloudflare R2
- [x] App explicitly runs locally for now
- [x] PostgreSQL explicitly runs locally for now
- [x] At least one architecture choice was questioned and documented

## Task 2 — Design Preview
- [x] `design.html` exists
- [x] Colors are visible
- [x] Typography is visible
- [x] Styled button is visible
- [x] Sample input is visible
- [x] Edvance-specific component is visible
- [x] Real design refinement was requested
- [x] Refinement is visible in `design.html`
- [x] Refinement is documented in Appendix A

## Task 3 — Prototype & Demo
- [x] Initial application page opens locally
- [x] App page is separate from `design.html`
- [x] Mock/test data only is used
- [x] Current phase is accurately documented
- [x] Next phase is identified
- [x] Code is pushed to the public GitHub repository
- [x] No secrets are committed
- [ ] Demo video is recorded
- [ ] Demo link is ready

---

# Appendix C — Recommended Task 1 Builder Prompt

```text
Review the complete Edvance project folder and read PRD.md carefully before making changes.

First, create or update a detailed implementation plan divided into ordered phases with concrete outputs.

The implementation plan must explicitly identify:
- the framework,
- database,
- authentication solution,
- file storage strategy,
- local development architecture,
- and future external services.

For the current assessment, the application and PostgreSQL database should run locally. Do not attempt to build the full product.

Before implementing later phases, explain any major architectural choices and reasonable alternatives so I can review and steer the decisions.

For Phase 1, create design.html as a standalone design-system preview containing:
- Edvance colors,
- typography,
- a styled primary button,
- a sample input,
- and at least one Edvance-specific component.

Also prepare the initial single-page Assessment Intelligence prototype using mock/test data only.

Do not implement working authentication, live AI APIs, production database logic, cloud deployment, or real file storage yet.

Stop after the implementation plan and first design preview are ready so I can review them before continuing.
```

---

# Appendix D — Recommended Design Refinement Prompt

```text
I have reviewed the first Edvance design preview.

Improve the design without changing the core product direction.

Focus on:
- clearer heading and body-text hierarchy,
- stronger contrast,
- a more prominent primary action,
- clearer input borders and focus states,
- better spacing around cards,
- easier-to-scan evidence sections,
- and a clearer mastery/progress presentation.

Keep Edvance clean, modern, calm, evidence-driven, and education-focused.

After making the changes, update the Agent Steering & Decision Log in PRD.md with:
1. what I asked you to change,
2. what you changed in design.html,
3. and the impact on the design system.

Do not claim changes that are not actually visible in the implementation.
```

---

# Appendix E — Recommended Phase 1 Build Prompt

```text
Proceed with Phase 1 only.

Build a single working Edvance Assessment Intelligence page that opens locally in the browser and uses mock/test data only.

The page should clearly show:
- an assessment question,
- the concepts being tested,
- supporting course evidence,
- a consistency status,
- learner mastery status,
- and a recommended revision action.

Use the approved Edvance design system.

Do not implement real authentication, external APIs, production database functionality, cloud deployment, or real file uploads yet.

When Phase 1 is complete, stop and report:
1. what was implemented,
2. how to run it locally,
3. what remains for Phase 2,
4. and which files were changed.
```
