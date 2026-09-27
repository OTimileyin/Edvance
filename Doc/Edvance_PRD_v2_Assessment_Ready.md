# Edvance — Product Requirements Document

**Product Name:** Edvance  
**Product Descriptor:** Evidence-First Assessment Intelligence  
**Category:** Impact & Innovation  
**Document Type:** Product Requirements Document (PRD) / Product Bible  
**Version:** 2.0  
**Status:** Planning / Lesson 6 Prototype  
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
- [ ] `design.html` opens locally
- [ ] Color palette is visible
- [ ] Typography examples are visible
- [ ] Styled primary button is visible
- [ ] Styled sample input is visible
- [ ] At least one Edvance-specific component is visible
- [ ] Initial app page opens locally
- [ ] App page is separate from `design.html`
- [ ] Mock/test data only is used

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
**Status:** Current Architecture Decision

### Steering Question
Ask the AI builder to compare a hosted backend/database option such as Supabase with running PostgreSQL locally for the current Edvance development stage.

The comparison should consider:
- Cost
- Complexity
- Control
- Local development workflow
- Later migration/deployment

### Decision
Use **PostgreSQL locally** during the current development stage.

### Reason
- The application is still being built and tested locally.
- The assessment does not require public deployment.
- Local PostgreSQL avoids an unnecessary hosted dependency at this stage.
- PostgreSQL remains suitable for later production deployment.

### Verification
- [ ] Implementation plan names PostgreSQL
- [ ] PRD states app and database run locally
- [ ] Phase 1 prototype does not require a hosted database

---

## Change 2 — Design Refinement

**Date:** Complete after reviewing the first `design.html`  
**Requested by:** Product Owner  
**Status:** Pending Review

### Initial Observation
Record what is weak in the first generated design.

### Requested Refinement
Record the exact design changes requested from the AI builder.

Potential areas:
- Heading hierarchy
- Text contrast
- Primary button prominence
- Input borders
- Focus states
- Card spacing
- Evidence readability
- Mastery indicator clarity

### Changes Made in `design.html`
Record only changes that were actually implemented.

### Impact on Design System
Explain how the refinement improved clarity, accessibility, or the Edvance experience.

### Verification
- [ ] Refinement is documented here
- [ ] Updated `design.html` visibly reflects it

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

# Appendix B — Lesson 6 Verification Checklist

## Task 1 — Implementation Plan
- [ ] AI builder has read this PRD
- [ ] Ordered implementation phases exist
- [ ] Framework named: Next.js + TypeScript
- [ ] Database named: PostgreSQL
- [ ] Authentication named: Better Auth
- [ ] File storage named: Cloudflare R2
- [ ] App explicitly runs locally for now
- [ ] PostgreSQL explicitly runs locally for now
- [ ] At least one architecture choice was questioned and documented

## Task 2 — Design Preview
- [ ] `design.html` exists
- [ ] Colors are visible
- [ ] Typography is visible
- [ ] Styled button is visible
- [ ] Sample input is visible
- [ ] Edvance-specific component is visible
- [ ] Real design refinement was requested
- [ ] Refinement is visible in `design.html`
- [ ] Refinement is documented in Appendix A

## Task 3 — Prototype & Demo
- [ ] Initial application page opens locally
- [ ] App page is separate from `design.html`
- [ ] Mock/test data only is used
- [ ] Current phase is accurately documented
- [ ] Next phase is identified
- [ ] Code is pushed to the public GitHub repository
- [ ] No secrets are committed
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
