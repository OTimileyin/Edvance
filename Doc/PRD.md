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
**Cloudflare R2**

Planned for larger course files such as PDFs, images, documents, audio, and video. Production file storage is not required for Lesson 6.

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

**Current Phase:** Phase 3 — Accounts & Authentication (complete; Appendix A, Change 8), on top of Phase 2, the landing page/demo sign-in steering addition (Change 6), and the "Field Guide" visual redesign (Change 7). Next phase: Phase 4 — Course Data & PostgreSQL.

**Completed (2026-09-27):**
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
  - Credentials live only in the git-ignored `.env`; `.env.example` documents the shape. Course data itself remains browser-local mock data (PostgreSQL integration is Phase 4).

**Not yet implemented:**
- PostgreSQL application integration (course data; auth already runs on PostgreSQL).
- Cloudflare R2 file storage.
- Real course ingestion.
- Live AI APIs.
- Source-processing pipeline.
- Production deployment.

**Next Phase:** Phase 4 — Course Data & PostgreSQL.

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

**Planned Storage:** Cloudflare R2

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

### Initial Color Direction

| Token | Value | Usage |
|---|---|---|
| `--color-primary-700` | `#1D4ED8` | Primary actions |
| `--color-primary-500` | `#3B82F6` | Links and highlights |
| `--color-success-600` | `#059669` | Mastered / consistent |
| `--color-warning-500` | `#F59E0B` | Developing / caution |
| `--color-error-600` | `#DC2626` | Weak / inconsistency |
| `--color-neutral-950` | `#0F172A` | Main text |
| `--color-neutral-600` | `#475569` | Secondary text |
| `--color-neutral-200` | `#E2E8F0` | Borders |
| `--color-neutral-50` | `#F8FAFC` | Page background |
| `--color-surface` | `#FFFFFF` | Cards and panels |

These values may be refined after reviewing the first design preview.

### Typography
**Inter, system-ui, sans-serif**

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
