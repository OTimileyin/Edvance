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

Phases 1–8 are complete, plus four steering additions (landing page/demo sign-in, Change 6; "Field Guide" visual redesign, Change 7; "Press Room" redesign and the Edvance logo, Change 9; interface sheet re-pointed at the live app, Change 10). Phase 5 (course material upload) and Phase 5.6 (text extraction & evidence chunking) are **complete and verified end to end** against private **Supabase Storage**. The product requirements are defined in `Doc/PRD.md` (source of truth), with the plan in `docs/IMPLEMENTATION_PLAN.md`. The current deliverable is a Next.js learning workspace that runs locally: it opens on a marketing landing page, **sign-up/sign-in create real local accounts** (Better Auth over local PostgreSQL, HTTP-only cookie sessions), and **courses, materials, concepts, assessment questions, consistency findings, and mastery states are stored in PostgreSQL** through a repository layer. **Sources accepts real file uploads** (PDF, PowerPoint, Word, Markdown/plain text, WebVTT/SRT) which are stored in a **private Supabase Storage bucket** and recorded against the course with a `storageReference`; downloads go through the app to a short-lived signed URL, and materials can be deleted. **Uploaded materials are now extracted into location-tagged evidence**: PDFs by page, slide decks by slide, transcripts by timestamp range, and documents/notes by section or line range, chunked into ordered evidence stored in `material_chunk` with an `material_ingestion_job` tracking each attempt. The Sources page shows real processing state — **Ready for analysis**, Processing, or Extraction failed — with a Retry action, while seeded demo sources are clearly labelled. Supabase is used **only** for object storage — PostgreSQL is still the database, Better Auth is still authentication, and Infisical is still the secrets manager.

**Phase 6 (course intelligence) is implemented.** Uploaded materials are analysed into concepts by **Google Gemini**, called only from the server: concepts carry the course's own instructor terminology, a definition grounded in the evidence, and the exact evidence behind them (material + location). Edvance supports three honest evidence states — **Supported**, **Partly supported**, and **Insufficient evidence** — and never invents a citation: a chunk the model cites must exist, belong to that learner's course, and have been in the model's input, or the whole response is rejected. Relationships (`prerequisite`, `part_of`, `related_to`, `contrasts_with`) are stored only when the evidence justifies them. Analysis runs only when the learner asks for it — never on a page refresh — and new or changed materials mark the stored intelligence **needs re-analysis**. Uploading `.doc` and `.ppt` is no longer accepted (there is no reliable text extractor for them; save as `.docx`/`.pptx`), so a learner can never upload a file Edvance cannot read. **The real Gemini call is verified end to end** — with `GEMINI_API_KEY` in Infisical, the live provider extracted all six components of the golden fixture with exact instructor terminology and real, resolvable evidence; without the key the analyse action honestly reports that analysis is not configured.

**Phase 7 (assessment intelligence) is implemented.** Each assessment question is checked against the concepts the course's own materials taught — never against the question's wording alone. Edvance names the concepts a question actually tests (with the evidence behind them) and returns one of three honest verdicts: **Consistent with the evidence**, **Possible inconsistency**, or **Insufficient evidence**. A question that asks for "the five components" of a framework the evidence establishes as six is flagged as a possible inconsistency, with the reason stating both numbers and naming the concepts. A verdict of possible inconsistency must name the evidence it disagrees with, or the whole response is rejected. Questions can only be checked once the course itself has been analysed, since that is where the evidence-grounded concepts come from; checking is always an explicit action and an up-to-date signature is never recomputed. The `source_mapping` table — schema-only since Phase 4 — is now populated and read, and the course-level verdict is the most severe, most recent finding so one inconsistent question is never hidden.

**Phase 8 (mastery intelligence) is implemented.** Mastery is derived from the learner's own recorded practice, never assigned by a model. Recording an attempt — practising an assessment question (credited to every concept that question was checked against) or a single concept — re-derives the affected concepts from the complete attempt history by one deterministic rule: no attempts is **Untested**, fewer than half correct is **Weak**, at least half correct is **Developing**, and at least 80% correct over at least three attempts is **Mastered**. A single lucky answer can never earn mastery. The Mastery tab states the rule plainly, shows each concept's attempts and correct count, offers a practice panel, and lists recent practice with the learner's own answer, so every status is traceable to the attempts behind it. A question can only be practised once it has been checked against the course's evidence, and the practice endpoint is always an explicit learner action.

Material parsing uses three focused, server-only libraries — `pdfjs-dist` (PDF), `mammoth` (DOCX), and `jszip` (PPTX); TXT, Markdown, WebVTT, and SRT are parsed in-repo. Course intelligence uses the official `@google/genai` server SDK. Two end-to-end suites run against a running dev server and verify their work in PostgreSQL — `scripts/test-ingestion.mjs` for extraction (text, locations, chunk order, ownership isolation) and `scripts/test-course-intelligence.mjs` for analysis (concepts, instructor terminology, evidence resolution, rejection of unknown chunk ids, staleness, and cross-user isolation):

```
BASE_URL=http://localhost:3250 infisical run --env=dev -- node scripts/test-ingestion.mjs
```

The intelligence suite needs the deterministic test provider enabled, because it verifies the pipeline rather than the model's prose:

```
EDVANCE_AI_MOCK=simple infisical run --env=dev -- npx next dev -p 3260
BASE_URL=http://localhost:3260 npm run test:intelligence
```

A third suite covers assessment intelligence — question-to-concept mapping, the six-versus-five inconsistency, rejection of an unjustified inconsistency, staleness and isolation:

```
EDVANCE_AI_MOCK=simple infisical run --env=dev -- npx next dev -p 3260
BASE_URL=http://localhost:3260 npm run test:assessment
```

A fourth suite covers mastery — the honest Untested baseline, the full status ladder as attempts accumulate, attribution, per-concept isolation, the unchecked-question gate, validation and isolation:

```
EDVANCE_AI_MOCK=simple infisical run --env=dev -- npx next dev -p 3260
BASE_URL=http://localhost:3260 npm run test:mastery
```

`EDVANCE_AI_MOCK` selects a deterministic, evidence-grounded stand-in for Gemini and is **refused in production**, so a mock can never answer a real learner. Every suite generates its fixtures in memory (no copyrighted material) and deletes everything it creates, so they leave the bucket and database as they found them.

A third script is the **live** counterpart: it needs a real key and no mock, calls the actual Gemini API through a running dev server, and checks that real model output survives Edvance's validation with no fabricated citation. It is network-dependent, so it is run deliberately rather than in the offline gate:

```
# dev server without EDVANCE_AI_MOCK, with GEMINI_API_KEY present
BASE_URL=http://localhost:3260 infisical run --env=dev -- node scripts/verify-gemini-live.mjs
```

It reports **34 passed, 0 failed**: six concepts with instructor terminology preserved, every citation resolving to a real `Section: …` chunk, cost control and staleness, and the real model correctly flagging the six-versus-five assessment inconsistency.

## Brand

The Edvance mark is a seal containing an "E" built from three stacked source bars — the middle bar is rust because Edvance highlights the evidence that matters and flags the source that disagrees.

| Asset | Purpose |
|---|---|
| `components/logo.tsx` | `LogoMark` and `Logo` components used by the app (header, footer, auth) |
| `app/icon.svg` | Favicon / app icon (Next.js file convention) |
| `public/logo.svg` | Full lockup for sharing and docs |
| `design.html` | Interface sheet: the shipped screens plus logo rules, palette, and components |

Palette: deep teal `#0D2327`–`#2C6E70` for structure, cream `#FBF6EA` for the page, rust `#C9502E` for flags, sage `#6B8A5E` for mastery. Tokens live in `app/globals.css`.

### Prerequisites (local)
- Node.js + npm
- PostgreSQL running locally. This repo expects a server on `127.0.0.1:5432` with a database named `edvance` (the dev machine runs it as the Windows service `postgresql-edvance`).
- The **Infisical CLI**, authenticated, with this directory linked to the Edvance Infisical project. Secrets are injected through `infisical run`, which `npm run dev` and `npm run migrate` already wrap, so a local `.env` is no longer required. See [Secrets (Infisical)](#secrets-infisical).
- Optional offline fallback: a `.env` file in the repo root (copy `.env.example`) with `DATABASE_URL`, `BETTER_AUTH_SECRET` (32+ chars), and `BETTER_AUTH_URL` — only needed if you run the app outside `infisical run`.
- For material uploads (Phase 5): Supabase Storage credentials in the Infisical `dev` environment — `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (a server-side secret key, **never** prefixed with `NEXT_PUBLIC_`), and `SUPABASE_STORAGE_BUCKET` (the private bucket, `edvance-materials`). Without these, the Sources upload form reports that object storage is not configured; everything else works as before.

First auth run creates the Better Auth tables with `npx auth migrate` (already applied on the dev machine). The application's own tables are created by the migration runner:

```
npm run migrate
```

This applies every pending file in `db/migrations/` once, in order, in a transaction (tracked in `schema_migrations`); re-running it is a no-op. If you are starting from a fresh database, run `npx auth migrate` first, then `npm run migrate`. `npm run migrate` goes through `infisical run` so `DATABASE_URL` comes from Infisical; the production pre-deploy step invokes `node scripts/migrate.mjs` directly with the deployed database's URL.

## Secrets (Infisical)

Edvance reads its configuration from environment variables (`process.env`), the same as any Next.js app. Those values now live centrally in [Infisical](https://infisical.com) instead of a local `.env` file, so nobody has to keep secrets on disk or pass them around out of band.

One-time setup (per machine):

1. Create an account at <https://app.infisical.com> and a project named `edvance`. New projects start with the `dev`, `staging`, and `prod` environments.
2. Import the existing secrets. Either open the project's Secrets Overview for the `dev` environment and drag-and-drop the old `.env` file onto the page, or do the same thing from a terminal (values stay masked):

   ```
   infisical secrets set --file=.env --env=dev
   ```

   The keys the app reads are `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`; for material uploads, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `SUPABASE_STORAGE_BUCKET`; and — for course intelligence — `GEMINI_API_KEY` (optionally `GEMINI_MODEL`, which defaults to `gemini-flash-latest`). The `dev` environment pins `GEMINI_MODEL=gemini-3.5-flash` because the `-latest` alias was intermittently capacity-limited; the provider wrapper also retries a transient 429/5xx a bounded three times.
3. Install the CLI — `winget install infisical` on Windows, or `brew install infisical/get-cli/infisical` on macOS (see the [CLI install docs](https://infisical.com/docs/cli/overview)).
4. Log in. In WSL 2, a remote SSH session, or Codespaces there is no browser, so use the interactive login: `infisical login -i`. Otherwise `infisical login`.
5. Link this directory to the project once: `infisical init` and pick the `edvance` project. This writes `.infisical.json`, which holds local project settings only — no secret values — and is safe to commit. It is interactive and needs a real terminal; there is no flag that selects a project for you.

On Windows, open a **new** terminal after `winget install` so the updated PATH is picked up — otherwise `npm run dev` fails with `'infisical' is not recognized as an internal or external command`.

Day to day, the checked-in scripts already wrap the CLI, so teammates use the injected command by default:

```
npm run dev        # runs: infisical run --env=dev -- next dev
npm run migrate    # runs: infisical run --env=dev -- node scripts/migrate.mjs
```

`infisical run` fetches the secrets you are allowed to see and injects them into the child process, so application code is unchanged. To confirm a secret resolves without printing its value:

```
infisical run --env=dev -- node -e "console.log('DATABASE_URL length', process.env.DATABASE_URL.length)"
```

Never commit a real `.env`; `.env` and `.env.*` are already in `.gitignore`. Scan the repository for leaked secrets with `infisical scan` (see the [secret scanning docs](https://infisical.com/docs/cli/scanning-overview)). Install the pre-commit hook once per clone to catch this automatically:

```
infisical scan install --pre-commit-hook
```

It runs `infisical scan git-changes --staged` before each commit and blocks the commit when a recognizable secret is staged (`git config hooks.infisical-scan false` disables it). It only covers secrets gitleaks can recognise, so a `.env` that is already tracked still has to be removed by hand.

### Rotating a secret

Secrets are updated in place; nothing on disk needs editing.

```
infisical secrets set BETTER_AUTH_SECRET=<new value> --env=dev
```

`infisical run` picks up the new value on the next start, so restart `npm run dev` afterwards. Rotating `BETTER_AUTH_SECRET` invalidates existing sessions and anyone signed in has to sign in again. Rotating the password inside `DATABASE_URL` also changes the PostgreSQL role's password.

The app checks its required variables on startup and stops with a message naming the missing one ("Missing required environment variable …"), which is what you see if `next dev` is started without `infisical run`.

### Non-interactive and deployed environments

Do not put a person's credentials on a server. Create a **Machine Identity** in the project (Infisical dashboard → Access Control → Machine Identities), give it **Universal Auth**, and grant it read access to the environment it serves — `prod` on a server, `dev` on a shared dev box. Machine identities are not tied to a person, survive someone leaving, and can be scoped to a single project.

The runner logs in as that identity instead of a user, and every command above then behaves the same:

```
infisical login --method=universal-auth --client-id=<id> --client-secret=<secret>
infisical run --env=prod -- next start
```

Or hand the process a machine-identity access token directly, with no login step at all: `infisical run --token=<token> --env=prod -- next start`. Either way the child process sees the same variable names, so nothing in the application changes.

## Running the Local Prototype

### Main app (Phase 2 + landing/demo sign-in)
The app is a Next.js + TypeScript project and runs locally with Node.js. `npm run dev` is wrapped with `infisical run`, so it needs the one-time Infisical setup above; secrets arrive as environment variables exactly as before.

```
npm install
npm run dev        # infisical run --env=dev -- next dev
```

Open `http://localhost:3000` in a browser. The app opens on the landing page; **Get started** (sign-up) or **Sign in** creates/uses a real local account (password must be 8+ characters) and enters the course workspace at `/courses`. Workspaces are scoped to the signed-in user in PostgreSQL — every query is keyed by the account id, and a new account is seeded with demo workspaces on first visit so it is never empty. **Continue with a demo account** provisions and signs in a local `demo@edvance.app` account. Unauthenticated visits to `/courses` (and below) redirect to the sign-in page server-side.

### Static previews (Phase 1)
Phase 1 pages are plain HTML/CSS with no build tooling. Open them directly in a browser (double-click the files):

1. `design.html` — interface sheet. Renders the shipped screens from the real markup against a verbatim snapshot of `app/globals.css`: the landing page, sign-in, course directory, overview, sources, assessments, and mastery, with the logo rules, palette, and controls at the end. It is self-contained (no build step, no sibling files) and links inside the frames are inert — run the app for the interactive version.
2. `assessment-intelligence.html` — the Assessment Intelligence signature experience.

The static previews load Fraunces and Inter from Google Fonts, so they look their best with an internet connection but still render without it. (The Next.js app self-hosts both fonts via `next/font`.)

## Documentation

- [Product Requirements Document](Doc/PRD.md) — the full product specification, persona, MVP scope, and success metrics.
- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md) — ordered phases with outputs, acceptance criteria, and current status.
- [Conversation Record](conversation.md) — every Product Owner prompt and the detailed builder response for the whole Edvance build, phase by phase.