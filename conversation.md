# Edvance — Full Conversation Record

> Purpose: a complete, detailed record of the Edvance build conversation — every prompt the Product Owner gave and, in detail, what the AI builder did in response. Created so work can continue in another environment (e.g. Freebuff, with image uploads). The opening section (before "Change 6") is reconstructed from the session record and the steering log in `Doc/PRD.md` Appendix A; wording is faithful but not verbatim. From Change 6 onwards, prompts are quoted verbatim.

- **Dates:** 2026-09-27 (all work done this day)
- **Repo:** `https://github.com/OTimileyin/Edvance` (branch `main`)
- **Stack decided:** Next.js + TypeScript (App Router, Turbopack) · PostgreSQL (local for now) · Better Auth (later) · Cloudflare R2 (later)
- **Source of truth docs:** `Doc/PRD.md` · `docs/IMPLEMENTATION_PLAN.md` · `conversation.md`
- **Local run:** `npm run dev` → http://localhost:3000

---

## Episode 1 — Kickoff: "Build Edvance" (Phase 0, reconstructed)

### Product Owner prompt
The Lesson 6 request: build the Edvance product from the PRD under Lesson 6 constraints — no real databases, no hosted dependencies, no live AI, and only what the lesson actually requires. "Do not overbuild."

### What the AI builder did
1. **Read the PRD** (`Doc/PRD.md`) and extracted the product essence: evidence-first assessment intelligence. Learners connect assessment questions to the exact lecture/slide/transcript that taught the answer, surface inconsistencies between materials, and track per-concept mastery.
2. **Questioned the database choice before writing code** — surfaced as "Decision 1" in Appendix A:
   - Option A (hosted, e.g. Supabase) vs Option B (local PostgreSQL).
   - Compared cost, complexity, control, local workflow, vendor dependency, future scalability, migration path, and Lesson 6 requirements.
   - **Decision: local PostgreSQL.** App and database run locally; no hosted dependency; portable schema so a managed Postgres host can be chosen later. Documented in `docs/IMPLEMENTATION_PLAN.md` and the PRD.
3. **Created `docs/IMPLEMENTATION_PLAN.md`** with ordered phases:
   - Phase 0 — Project Foundation
   - Phase 1 — Design System & Assessment Intelligence Prototype
   - Phase 2 — Core Application Structure
   - Phase 3 — Accounts & Authentication (Better Auth)
   - Phase 4 — Course Data & PostgreSQL
   - Phase 5 — Course Material Ingestion
   - Phase 6 — Course Intelligence
   - Phase 7 — Assessment Intelligence
   - Phase 8 — Mastery Intelligence
   - Phase 9 — Targeted Revision
   - Each phase has outputs, acceptance criteria, and a status; the plan §7 has a global status block updated as work progresses.
4. **Governance pattern established:** every real Product Owner instruction is logged in the PRD Appendix A decision/change log, and docs never claim deferred functionality works.

### Files created
- `docs/IMPLEMENTATION_PLAN.md`
- `.gitignore` (node_modules, env, build output, runtime artifacts, `.opencode/`)

---

## Episode 2 — Design preview and refinement (Phase 1, reconstructed)

### Product Owner prompt
"Build the design system preview page (colours, typography, buttons, inputs, an Edvance component) that I can open in the browser."

### What the AI builder did
1. Wrote `design.html` — a standalone HTML/CSS design preview using the token system:
   - Primary/success/warning/error/neutral colour tokens, 4px grid, Inter font, radius 8/12/16.
2. Asked the Product Owner for **real design refinement feedback**.
3. The Product Owner gave detailed feedback (recorded as **Change 2** in Appendix A): hierarchy between title/headings/body not distinct enough; primary button didn't stand out; inputs too subtle; spacing compressed; consistency status not noticeable; mastery list hard to scan; some status colours lacked contrast; page risked looking like a generic AI dashboard.
4. Refined `design.html` accordingly:
   - Display 40px/800 hero title; 24px section headings with numbered uppercase kickers; `neutral-950`/`neutral-600` text roles.
   - Primary button 700-weight, larger padding, layered shadow, hover lift; flat outlined secondary.
   - 2px input borders with `neutral-500` at rest → `primary-500` hover → `primary-700` focus + 4px translucent ring.
   - Spacing opened up (96px section margins, 32px grid gaps, larger card padding).
   - Full-width "Possible inconsistency" consistency banner with left accent and icon.
   - Mastery converted to a scannable table (Concept / Progress / Status) with summary bar.
   - Contrast fixed with `success-700`/`error-700` tokens and text-on-tinted-badge patterns (no colour-only).
   - Added an Assessment → Concepts → Evidence → Consistency → Mastery → Revision pipeline strip to reinforce the evidence-first framing.

### Files created/changed
- `design.html` (created + refined)
- `README.md` (§ run instructions added later)
- `Doc/PRD.md` (Change 2 logged)

---

## Episode 3 — Prototype scope control (reconstructed)

### Product Owner prompt
Kept the build focused: only the Assessment Intelligence experience as the working page, using mock data — no auth, no database, no live AI.

### What the AI builder did
- Logged **Change 3** (Prototype Scope Control) in Appendix A.
- Built `assessment-intelligence.html` — the signature experience as a separate static page: concept list, per-concept status, an "Ask what was tested / where taught / does evidence agree" assessment flow, consistency flags, and a targeted revision list, all driven by mock data.
- Tested it locally in the browser.

### Files created
- `assessment-intelligence.html`

---

## Episode 4 — Phase 1 completion + status documentation (reconstructed)

### Product Owner prompt
Wrap up Phase 1; make the documentation reflect reality and nothing more.

### What the AI builder did
- Logged **Change 4** (Phase 1 Completion & Status Documentation).
- Updated `Doc/PRD.md` §16.1 Current Status: Phase 1 complete; listed "not yet implemented" (Better Auth, PostgreSQL integration, Cloudflare R2, real ingestion, live AI, source pipeline, deployment); next phase Phase 2.
- Verified against the **Lesson 6 checklist** (Appendix B) — 31/31 PASS, with two items flagged and fixed afterward (filename rename and push, below).
- Added README instructions for running the local prototype.

### Files changed
- `Doc/PRD.md`, `README.md`

---

## Episode 5 — Safety review and first commits + push (reconstructed)

### What the AI builder did
1. Ran a final repo safety review: **SAFE TO COMMIT** — 0 secret hits, no `.env*`, no key files, no generated directories, no files >1MB.
2. Committed:
   - `cd4bcdb` — "feat: build Edvance assessment intelligence prototype" (6 files, +2597/−70).
   - `9090f45` — "docs: rename PRD to Doc/PRD.md" (the old `PRD.md` literal filename was an audit flag; it is now under `Doc/`).
3. Audited: 31/31 PASS (the two earlier flags were the `PRD.md` filename and the pending push).
4. Pushed to GitHub `origin/main` — the push paused for a **Git Credential Manager** browser sign-in, which the Product Owner completed, then the push succeeded. `origin/main` = `9090f45`.

---

## Episode 6 — Phase 2: Core Application Structure (reconstructed)

### Product Owner prompt
"Continue." (Build the next phase.)

### What the AI builder did
1. Scaffolded a **Next.js 16.3.6 + TypeScript** app (App Router, Turbopack) in the repo root:
   - `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `next-env.d.ts` (git-ignored), `app/`, `components/`, `lib/`.
2. Ported the approved design system into `app/globals.css` (tokens, type ramp, radius, spacing, buttons, forms, badges, alerts, tables, progress, responsive, reduced-motion).
3. Built the learning workspace:
   - `/` redirected to `/courses`.
   - `app/courses/page.tsx` — course directory (open seeded courses: `ai-foundry`, `storytelling-with-data`, or create a new one).
   - `app/courses/[courseId]/layout.tsx` — workspace layout with sidebar nav (Overview / Sources / Assessments / Mastery).
   - `overview`, `sources`, `assessments`, `mastery` pages.
   - `components/`: header, badges, course-directory, add-assessment-form.
   - `lib/`: `types.ts`, `data.ts` (mock courses), `store.ts` (localStorage CRUD), `useCourses.ts` (hydration-safe hooks + `reload()` for post-add refresh).
4. Verified: `npm run typecheck` pass; `npm run build` pass (7 routes compiled); production smoke test = 200 for `/`, `/courses`, `/courses/ai-foundry`, `/sources`, `/assessments`, `/mastery`.
5. Logged **Change 5** in Appendix A; updated PRD §16.1 (Phase 2 complete, next Phase 3) and plan status (Phase 2 acceptance all `[x]`).

### Notes
- `npm` must be invoked as `npm.cmd` on this Windows machine; PowerShell scripts need `-ExecutionPolicy Bypass`.
- Workspace content is client-rendered after hydration (SSR shows a loading placeholder) — expected.

### Files created
- `app/`, `components/`, `lib/`, `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`

---

## Episode 7 — Progress check: "What did we do so far?"

### Product Owner prompt
"What did we do so far?"

### What the AI builder did
Produced the full session summary: objective, constraints, current phase, completed work, commit history, the check for uncommitted Phase 2 files, and next steps (Phase 3 — Better Auth). Confirmed everything is uncommitted and awaiting approval.

---

## Episode 8 — "what is happeng" (image attached)

### Product Owner prompt
"what is happeng" + an attached screenshot (`image.png`).

### What the AI builder did
- Could not read the image — the model does not support image input — so asked for the error text / URL or a description instead.

---

## Episode 9 — ERR_CONNECTION_REFUSED

### Product Owner prompt (verbatim)
> Hmmm… can't reach this page
> localhost refused to connect.
> Try:
> - Search the web for localhost
> - Checking the connection
> - Checking the proxy and the firewall
> ERR_CONNECTION_REFUSED

### What the AI builder did
Diagnosed: no dev server is running (the test server was stopped earlier). Restarted it detached in the background:

```
Start-Process npm.cmd run dev (output → C:\Users\ADMIN\AppData\Local\Temp\opencode\edvance-dev.log)
```

The shell wrapper printed a cosmetic `ChildProcess.kill` error each time, but the server launched fine. Verified:
- Port 3000 LISTENING (pid captured in `edvance-dev.pid`).
- Log shows `GET /courses 200`.
- Confirmed open http://localhost:3000 (first page load is slower due to on-demand compilation).
- Also noticed Next 16 auto-generated `AGENTS.md` and `CLAUDE.md` at the repo root (untracked) — left alone.

---

## Episode 10 — Request for a landing page + sign-in/sign-up

### Product Owner prompt (verbatim)
> i thought we are supposed to have a landing page that has hero an other sections then a login or sign up part that takes one to another page you

### What the AI builder did
1. **Clarified the gap:** the app had no landing page and no auth; `/` redirected straight to `/courses`. The plan puts real auth in Phase 3, which had not started — so the expected structure was missing by design.
2. Asked one question: should sign-in be **mock/demo now** (localStorage session) or **real Better Auth now** (pulls PostgreSQL forward).

### Product Owner answer (verbatim, custom reply)
> are we not going to have langing page

### What the AI builder did
- Understood: the landing page is non-negotiable and independent of the auth choice. Re-confirmed and proceeded:
  - Landing page at `/` + sign-in/sign-up with a **local demo session** (localStorage) — NOT real Better Auth, so the database phase isn't pulled forward. Real Better Auth + PostgreSQL remain Phase 3/4.
- **Build details:**
  - `lib/session.ts` — `getSession`/`setSession`/`clearSession` over `localStorage` key `edvance.session.v1` (DemoSession `{name, email}`).
  - `components/header.tsx` — converted to a client component: shows the signed-in user's name + **Sign out**, or **Sign in**; retains the brand and "Demo · mock data" flag.
  - `components/session-guard.tsx` — client guard: if no session, `router.replace("/signin?next=<current path>")`; renders children once a session exists.
  - `app/courses/layout.tsx` — wraps the whole course workspace in the SessionGuard (gates `/courses` and all `[courseId]` sections).
  - `app/page.tsx` — replaced the 307 redirect with a full landing page (server component): hero ("Know what is tested, where it was taught, and what to study next.") with **Get started** / **Sign in** CTAs; **Four questions** section (01–04); **What Edvance does** feature grid; **How it works** numbered journey (6 steps); **Where the demo stands** honest-status alert + CTAs.
  - `app/signin/page.tsx` — email + password form (any input accepted; name derived from email prefix) plus a one-click **Continue with a demo account**; redirects to `next` param or `/courses`.
  - `app/signup/page.tsx` — name/email/password form → demo session → `/courses`; cross-links with sign-in preserving `next`.
  - `app/globals.css` — added landing styles (hero, `cta-row`, `landing-section`/`-alt`, `question-grid`/`feature-grid`, `q-card`, `journey` with counter, `auth-wrap`/`auth-card`, `nav-user`/`nav-action`).
  - `app/layout.tsx` — footer updated ("Phase 2 prototype with landing page and demo sign-in").
3. **Verification:** stopped dev server → `npm run typecheck` pass → `npm run build` pass (routes: `/`, `/_not-found`, `/courses`, dynamic `[courseId]` ×4, `/signin`, `/signup`) → restarted dev server detached → all of `/`, `/signin`, `/signup`, `/courses` return 200.
4. **Docs updated (governance):**
   - `Doc/PRD.md` — §16.1 (landing page + demo sign-in added), new **Change 6** entry with reason/decision/verification.
   - `docs/IMPLEMENTATION_PLAN.md` — status block updated (steering addition noted, next phase still Phase 3).
   - `README.md` — status and "Running the Local Prototype" rewritten (landing → sign-in → gated workspace).

### Files changed in this episode
- New: `lib/session.ts`, `components/session-guard.tsx`, `app/courses/layout.tsx`, `app/signin/page.tsx`, `app/signup/page.tsx`
- Changed: `app/page.tsx`, `components/header.tsx`, `app/layout.tsx`, `app/globals.css`
- Docs: `Doc/PRD.md`, `docs/IMPLEMENTATION_PLAN.md`, `README.md`

---

## Episode 11 — "Continue if you have next steps…"

### Product Owner prompt (system/agent, verbatim)
> Continue if you have next steps, or stop and ask for clarification if you are unsure how to proceed.

### What the AI builder did
Finished the remaining build + verification work from Episode 10 (CSS fix for the journey counter reset, typecheck, build, restart, route checks, doc updates). No unresolved issues remained.

---

## Episode 12 — Create conversation.md to continue elsewhere (this episode)

### Product Owner prompt (verbatim)
> for all the things we have been discussing for a very long time create a conversation.md. it would consist of all the prompts i did and your responses wiht deatiled things of what you did .i want to go and continue in freebuff where i can be able to upload images

### What the AI builder did
1. Read the full steering log from `Doc/PRD.md` Appendix A (Decision 1, Changes 2–6) and phase headings from the plan to make the record accurate.
2. Wrote this file: `conversation.md` at the repo root.
3. Added `conversation.md` to the README documentation list.

---

## Episode 13 — Visual redesign from three reference images (Freebuff)

### Product Owner prompt (paraphrase)
> Before continuing, I want us to redesign. I'll upload 3 pictures — use their elements to elevate this project to the next level.

The three references: a glassmorphism ride-sharing welcome screen, a web-design showcase page with a deep-green feature band and earthy tinted tiles, and an artisan website with warm editorial serif type, coral accents, and stamp badges.

### What the AI builder did
1. **Fused the three references into one coherent system, named "Field Guide":**
   - Palette: deep forest green (structure, primary buttons, dark bands), warm paper/cream (study surfaces), coral (the flag colour for inconsistencies), gold and oak (support tones).
   - Type: Fraunces (soft display serif, SOFT/WONK variable axes) for display/headings + Inter for body/UI, self-hosted via `next/font/google` (replaced the hardcoded Google Fonts `<link>`).
   - Atmosphere: glassmorphism panels over radial-gradient tints with subtle SVG film-grain texture.
2. **Rebuilt the design system** in `app/globals.css`: forest/paper/coral/gold/oak tokens (semantic aliases kept so existing components kept working), display-serif heading classes, glass card styles, pill buttons (primary/coral/secondary/ghost), left-accent alerts, tinted badges with borders, forest footer, noise-textured bands, responsive + reduced-motion preserved.
3. **Landing page** (`app/page.tsx`): atmospheric hero with Fraunces italic coral emphasis and a **glass evidence card** (badge + source refs, the five-vs-six PROMPT inconsistency, numbered Question→Concept→Evidence→Consistency→Mastery→Revision pipeline, mastery bar, floating "Evidence checked · 6 sources" chip); paper **four questions** band; **forest feature band** with glass icon chips; **oak how-it-works band** with tinted journey tiles (green/oak/coral/cream); demo-status band with a dashed **"Evidence checked · no gaps" stamp badge**.
4. **Auth pages** rebuilt as split screens (`app/signin/page.tsx`, `app/signup/page.tsx`): forest brand panel with quote, glass flag card, and radial glows; paper card with the form. Exported a shared `AuthForest` component from the sign-in page for reuse in sign-up.
5. **Workspace restyle**: glass sticky sidebar nav (active tab = solid forest), serif page titles, tinted link cards with coral hover, bordered badges, left-accent alerts, serif table headers with uppercase kickers.
6. **Header**: added the circular forest "e" seal brand mark; **fixed a real bug** — the header now re-reads the demo session on client-side route changes (previously "Sign in" stayed visible after signing in until a full reload).
7. **`design.html`** rewritten to preview the Field Guide system (swatches, type ramp, buttons, inputs, badges, alerts, progress, evidence glass card, stamp, forest band sample).
8. **Verified**: `npm run typecheck` ✓, `npm run build` ✓ (9 routes), all routes return 200, and screens reviewed visually in the browser at 1440px (hero, question cards, forest band, journey tiles, stamp section, sign-in, courses, mastery). Fixed during review: progress fill needed `display:block`; hero title sizing tuned; floating chip moved to avoid the card button.
9. **Docs updated**: `Doc/PRD.md` (Change 7 + §16.1), `docs/IMPLEMENTATION_PLAN.md` status block, `README.md`, this file.

### Files changed
- `app/globals.css` (rewritten), `app/layout.tsx`, `app/page.tsx`, `app/signin/page.tsx`, `app/signup/page.tsx`, `app/courses/layout.tsx`, `components/header.tsx`, `design.html`
- Docs: `Doc/PRD.md`, `docs/IMPLEMENTATION_PLAN.md`, `README.md`, `conversation.md`

---

## Episode 14 — Phase 3: real accounts with Better Auth (autonomous run)

### Product Owner prompt (verbatim, condensed)
> From this point forward, operate as autonomously as possible… proceed with all normal development actions yourself… only stop for things you genuinely cannot complete (credentials, external accounts, OS confirmations, product decisions)… never do destructive/irreversible/security-sensitive/externally-consequential actions without asking.

### What the AI builder did
1. **Committed Phase 2 + redesign** as `2af22eb` (33 files, +5406/−1223) — a normal commit covered by the autonomy grant; push still deferred (externally consequential).
2. **Provisioned local PostgreSQL** (Decision 1 stack) for Phase 3:
   - Found no running server; installed PostgreSQL 18 via `winget` — **stopped to request OS elevation** (the one thing that cannot be done without the user; approval granted, UAC prompt clicked).
   - The EDB silent install hit a transient resource lock and registered no service initially; diagnosed, re-ran, and the service `postgresql-edvance` came up on `127.0.0.1:5432` with the intended dev password.
   - A parallel manual `initdb` cluster on 5433 was initialized, found redundant, and removed (own artifact, reversible).
   - Created database `edvance`.
3. **Integrated Better Auth 1.7**: installed `better-auth` + `pg`; `lib/auth.ts` (Kysely adapter over `pg.Pool`, email/password, `nextCookies()` last); `app/api/auth/[...all]/route.ts` via `toNextJsHandler`; `lib/auth-client.ts` React client; `npx auth migrate` created `user`, `session`, `account`, `verification`.
4. **Secrets hygiene**: generated a 32-char base64 secret locally; `.env` (git-ignored) holds `DATABASE_URL`/`BETTER_AUTH_SECRET`/`BETTER_AUTH_URL`; committed `.env.example` template. `git status --short` confirmed `.env` never appears.
5. **Auth flows**: sign-up/sign-in rewritten to `authClient.signUp.email` / `signIn.email` with inline error states (401 mismatch, 422 duplicate, 8-char minimum); "Continue with a demo account" now provisions/signs in a real local `demo@edvance.app`; header driven by `authClient.useSession`; Sign out calls the server (`authClient.signOut`).
6. **Route protection, server-side**: `app/courses/layout.tsx` converted to an RSC calling `auth.api.getSession({ headers: await headers() })` → `redirect("/signin?next=/courses")`; client `SessionGuard` kept as second layer. This closes the Phase 2 gap where the guard was client-only.
7. **Per-user workspaces**: `lib/store.ts` and hooks now take the signed-in email and key storage `edvance.courses.v1.<email>`; a `UserBootstrapper` seeds demo workspaces on a user's first visit. (Course rows as DB entities remain Phase 4 — PRD governance kept: no claims beyond what is built.)
8. **Verified end-to-end**: typecheck ✓, build ✓ (`/api/auth/[...all]`, `/courses` now dynamic). curl: sign-up → user created; get-session with cookie → session; `/courses` without cookie → **307 → /signin?next=/courses**; with cookie → 200. PostgreSQL shows 2 users with hashed `credential` accounts. Browser: real sign-up (Amara Okafor) → lands on `/courses`, header shows "Amara Okafor · Sign out", workspace renders 6 scoped concept rows. (Sign-up click-through needed `requestSubmit` due to a preview-bridge quirk; form logic itself worked.)
9. **Docs**: PRD **Change 8** + §16.1 (Phase 3 complete, next Phase 4), plan status + Phase 3 acceptance criteria checked, README prerequisites/run instructions rewritten, this episode appended.

### Where the user was asked to act
Exactly once: the Windows elevation prompt to install PostgreSQL (requested via the elevation dialog, approved, UAC clicked by the user). Everything else — installs, services, database, migrations, code, tests, docs, commit — was done autonomously. Push to GitHub remains deferred until the Product Owner asks.

### Files changed
- New: `lib/auth.ts`, `lib/auth-client.ts`, `lib/demo-data.ts`, `components/user-bootstrapper.tsx`, `app/api/auth/[...all]/route.ts`, `.env` (untracked), `.env.example`
- Changed: `app/courses/layout.tsx`, `app/courses/[courseId]/layout.tsx`, `app/signin/page.tsx`, `app/signup/page.tsx`, `components/header.tsx`, `components/session-guard.tsx`, `components/course-directory.tsx`, `components/add-assessment-form.tsx`, `lib/store.ts`, `lib/useCourses.ts`, `package.json`, `package-lock.json`
- Docs: `Doc/PRD.md`, `docs/IMPLEMENTATION_PLAN.md`, `README.md`, `conversation.md`

---

## Episode 15 — "Press Room" redesign from an artisan-poster reference, plus a real logo

### Product Owner prompt (verbatim)
> follow this inspiration to redesign the websitte. dont foeget the apple design skills. ans other importan skills. also create a logo that sells for me

(Reference attached: an artisan website design — vintage travel-poster illustration, teal/cream/rust palette, italic serif display type, a dark band of captioned product tiles, circular icon medallions, pill controls.)

### What the AI builder did
1. **Read the reference then made one call explicitly**: shift the palette to match the reference (deep teal, cream, rust, sage) rather than adopt only its layout. Rationale recorded in PRD Change 9 — the reference's dominant band colour is deep teal, and it is close enough to the old forest green that the *meaning* of every colour survives (rust still = flag, teal still = structure/evidence). Legacy token names (`--forest-*`, `--paper-*`, `--coral-*`, `--oak-*`) were kept as aliases, so the entire workspace retinted with zero component churn — verified on `/courses` and `/courses/ai-foundry/mastery`.
2. **Designed the logo as a product statement, not decoration.** The mark is a seal containing an "E" built from three stacked source bars; the middle bar is rust, because Edvance highlights the evidence that matters and flags the source that disagrees. Shipped as `components/logo.tsx` (`LogoMark` / `Logo`, with an `idSuffix` so the gradient ids stay unique across header, footer, and auth instances), `app/icon.svg` (Next.js file-convention favicon → new `/icon.svg` route) and `public/logo.svg` (full lockup with a serif fallback stack).
3. **Rebuilt the landing page to the reference's rhythm**: a two-panel printed poster hero — cream paper panel for the words, a hand-drawn SVG poster (sky, seal-sun, layered ranges with snow caps, sea, sailboat, headland with a lighthouse) for the art — then a dark teal band of three captioned illustration tiles, a cream band of four medallions with dotted stitched rims, a sand editorial spread with six step chips and a desk illustration, and a dark teal honest-status band with the stamp.
4. **Rebuilt header and footer.** Header: logo lockup left, centred anchor nav, circular tool buttons right (the reference's medallion controls). Footer: forest-dark → cream, with circular action buttons and a corrected honesty note.
   - **Honesty fix found along the way:** the footer still claimed "no backend involved", which Change 8 made false. It now says accounts and sessions are real (local PostgreSQL + Better Auth) while course analysis is still mock data.
5. **Craft pass (the "Apple skills"):** italic Fraunces display with optical sizing and WONK/SOFT axes; one shared grain-texture token instead of four copy-pasted data URIs; one easing curve; a dotted stitched seam where paper meets illustration; print-style grain over dark bands; `prefers-reduced-motion` respected globally; 44px+ touch targets on the circular buttons with `aria-label`s.
6. **Two real bugs caught by measuring instead of guessing.** The medallion icons rendered at 0×0 — the CSS rule targeted `svg.medallion-art` while the class sat on a wrapping `<span>`; a sweep for decorative SVGs under 8px now returns none. The poster's card originally sat on the water *and* the copy ran down over the sea; the hero was restructured into two panels so all text sits on cream (a contrast problem no screenshot would have flagged as clearly as the numbers did). The illustration's composition was then verified numerically (sun upper-right, sailboat and wave band above the card, lighthouse inside the frame, card docked at 31% of the panel).
7. **Verified**: `npm run typecheck` ✓ · `npm run build` ✓ (all routes plus `/icon.svg`) · browser DOM checks at 1440×980 — no horizontal overflow anywhere, medallion discs 148px with 76px icons, `/signin` teal panel with cream logo, workspace teal nav/mastery and rust weak bars.
8. **Docs**: PRD **Change 9** + §16.1 + §17 (palette, typography, brand identity rewritten to what is actually implemented), plan status block, README (new Brand section), this episode. `design.html` rewritten as the brand & interface sheet, since the Product Owner's second ask was a logo — the logo needed a home where its rules live.

### Notes / limits
- `preview_screenshot` failed repeatedly ("webview is not being composited") even after closing and reopening the tab, so visual verification was done by measuring computed layout, geometry, and colour in the live page rather than by looking at pixels. This is a tooling limit, not a page fault.
- No route, data, or authentication behaviour changed. This was a presentation change; the only functional fix was the false footer claim.

### Files changed
- New: `components/logo.tsx`, `app/icon.svg`, `public/logo.svg`
- Rewritten: `app/page.tsx`, `app/globals.css`, `design.html`
- Changed: `app/layout.tsx`, `components/header.tsx`, `app/signin/page.tsx`
- Docs: `Doc/PRD.md`, `docs/IMPLEMENTATION_PLAN.md`, `README.md`, `conversation.md`

---

## Episode 16 — Interface sheet re-pointed at the live application

### Product Owner prompt (verbatim)
> kindly let the design.html be updated to how the project currently looks

### What the AI builder did
1. **Diagnosed what `design.html` had actually become.** After Episodes 13–15 it was a *brand sheet*: a standalone page that restated the palette, type scale, buttons, medallions, and an evidence card **by hand**, in its own CSS, with a note telling future maintainers to "keep the two in sync". That is a second source of visual truth — it can show components the app no longer renders that way, and it described none of the screens a learner actually uses.
2. **Decided to render the product itself rather than illustrate it.** The sheet now contains seven labelled frames — landing page (`/`), sign-in (`/signin`), course directory (`/courses`), course overview, sources, assessments, mastery — each using the **real markup, real class names, and the seeded demo content**, so it shows what the app shows.
3. **Inlined the stylesheet as a verbatim snapshot** between `APP-CSS:BEGIN` / `APP-CSS:END` markers instead of linking `app/globals.css`. This was a measured decision, not a preference: the editor's preview server serves exactly one HTML file and returns 404 for every sibling asset (`README.md`, `package.json`, `app/page.tsx` all 404), so a *linked* sheet renders as unstyled HTML there and when opened from the filesystem under some servers. The snapshot makes it correct by construction and self-contained; refreshing it is a deliberate, visible copy step.
4. **Stopped copy-pasting chrome.** The guest header, the signed-in header, and the footer are defined once as `<template>` elements and injected into every frame, so all seven screens show identical navigation and footer. The only edits to app styling are three sheet-scoped overrides that neutralise `position: sticky` on the header and workspace nav (stacked sections would otherwise pile up) and give the auth split a fixed height.
5. **Kept the honesty notes per screen** — what is real (accounts, sessions, per-user workspaces) versus what is seeded demo data — and demoted the logo/palette/controls reference to a final section rendered with the application's own classes rather than private duplicates.
6. **Verified by measuring, not by looking** (screenshots are still non-compositing in this environment): body background `rgb(251,246,234)`; hero title 72px italic Fraunces with the `SOFT`/`WONK`/`opsz` axis settings applied; medallion discs 148px with 76×76 icons; poster grid `1.04fr .96fr` with the evidence card docked inside the illustration panel; footer cream `rgb(246,239,221)`; workspace nav-active `rgb(34,84,90)`; weak mastery bar `rgb(220,99,56)`; section order `poster-hero → band--ink → band--cream → band--sand → band--ink`; 7 frames with 7 headers and 7 footers and no leftover template slots; no clipped text; no horizontal overflow anywhere; no decorative SVG under 8px. The values match the live app because the CSS is the same bytes.
7. **Docs:** PRD **Change 10** + §16.1 + §17 reworded, plan status block, README (Brand table row, static-preview description, status paragraph), this episode.
8. **Committed and pushed.** The sheet work landed as `f89fdfc` (5 files, +3610/−461) and was pushed to `origin/main` at the Product Owner's request. That push also carried the three commits that had been sitting local-only since `9090f45` — Phase 2 + Field Guide (`2af22eb`), Phase 3 Better Auth (`bfe0e4c`), and Press Room + logo (`b092460`). The push moved `9090f45..f89fdfc`; this log entry is the commit immediately after it.

### Notes / limits
- `design.html` is a **point-in-time snapshot**, deliberately. If `app/globals.css` changes, the sheet must be re-copied between the markers — that is now a visible manual step rather than silent drift. A script could automate the copy; not built yet.
- The frames are renderings, not a running app: their links and buttons are inert, and the page says so. Interactive behaviour (auth, workspace writes) still requires `npm run dev`.
- `preview_screenshot` remains broken ("webview is not being composited"), so verification is numeric.

### Files changed
- Rewritten: `design.html`
- Docs: `Doc/PRD.md`, `docs/IMPLEMENTATION_PLAN.md`, `README.md`, `conversation.md`

---

## Episode 17 — Phase 4: Course Data & PostgreSQL (autonomous run)

### Product Owner prompt (verbatim)
> Start Phase 4 — Course Data & PostgreSQL: design the schema and migrations for the course/learner data model, add a repository data-access layer, and move the course workspace off localStorage onto real tables.

### What the AI builder did
1. **Surveyed what was actually there.** Better Auth already ran on PostgreSQL (`user`, `session`, `account`, `verification`), but its tables had been created by `npx auth migrate` with **no migration files in the repo**, and there was no ORM, no schema, and no data-access layer. Courses lived in `localStorage` under `edvance.courses.v1.<email>`, seeded from `lib/data.ts`.
2. **Chose plain SQL migrations over an ORM.** `pg` was already a dependency (Better Auth uses it); the PRD states the model in SQL-shaped terms already. Adding Drizzle or Prisma would have introduced a second schema definition and a generation step for no benefit at this size. The alternative is recorded in PRD Appendix A, Change 11.
3. **Wrote the §15 schema** — `course`, `learning_material`, `concept`, `assessment_question`, `source_mapping`, `consistency_finding`, `mastery_state` — plus a `schema_migrations` ledger. Two additions beyond the PRD: `course.institution` and `course.lesson` (fields the existing UI already collects) and `concept.ordinal`, because ordering concepts by name would have scrambled the PROMPT-framework sequence the product is built around.
4. **Added a migration runner** (`scripts/migrate.mjs`, `npm run migrate`) that applies each pending file once, in filename order, inside a transaction. Re-running reports "Database already up to date."
5. **Built the repository layer** (`lib/repo/courses.ts`) as the only module that knows SQL. It bulk-loads materials, concepts (left-joined to the learner's `mastery_state`), questions, and the latest consistency finding for the courses requested — no per-course query loop — and maps rows to the existing `Course` domain type, so no UI component had to change shape.
6. **Scoped every query by owner.** The repository always takes the signed-in `user.id`; the three route handlers (`/api/courses`, `/api/courses/[courseId]`, `/api/courses/[courseId]/assessments`) derive it from the Better Auth session and return 401 or 404 otherwise.
7. **Moved off `localStorage`.** The hooks now fetch from the API and the create/add-question forms POST to it. `lib/store.ts`, `lib/session.ts`, `lib/demo-data.ts`, and `components/user-bootstrapper.tsx` were deleted as dead code, and the copy that promised "stored locally on this device (demo data only)" was corrected to say PostgreSQL.
8. **Moved seeding to the server and made it concurrency-safe** — `ensureSeeded` takes a per-user advisory lock, re-checks the learner still has no courses, and writes everything in one transaction, so two parallel first requests cannot double-seed. Seeded rows now live in PostgreSQL with readable UUID-based ids (`qubators-ai-foundry-48abb340`).
9. **Verified end to end with real sessions** (curl + cookie jar): sign-in → `GET /api/courses` returns seeded workspaces in authored concept order → `GET` one course → `POST` a new course → `POST` an assessment that reads back on the next request; unauthenticated `GET` → 401; a second learner sees only their own course ids; `/courses` → 200 with a session and 307 → `/signin?next=/courses` without one. `source_mapping` round-tripped against the schema (insert → select → delete). Row counts confirmed the data reached PostgreSQL. The throwaway test course was removed afterwards.
10. **Docs:** PRD **Change 11** + §16.1 (with the Change 9 bullet corrected, since its "course data is browser-local" line is no longer true), plan status block + Phase 4 acceptance criteria, README (status paragraph, `npm run migrate` step, prerequisite wording), this episode.
11. **Committed and pushed** at the Product Owner's request: `7a84394` — `feat: persist course and learner records in PostgreSQL` (22 files, +938/−252). The push moved `96e3702..7a84394` on `origin/main`. The pre-existing untracked `.freebuff/` was deliberately left out of the commit.

### Notes / limits
- **`source_mapping` is schema-and-repository only** — nothing populates it yet, because linking an assessment question to the concept and material that evidence it is the intelligence work of Phases 6–7. It is deliberately not claimed as a working feature.
- **No live AI, no file storage, no ingestion.** Course content is still seeded demo data; Phase 5 replaces the seeder with real uploads to Cloudflare R2.
- `preview_screenshot` remains non-compositing in this environment, so verification was numeric and API-level rather than visual.

### Files changed
- New: `db/migrations/0001_course_data.sql`, `scripts/migrate.mjs`, `lib/db.ts`, `lib/repo/courses.ts`, `lib/api-session.ts`, `app/api/courses/route.ts`, `app/api/courses/[courseId]/route.ts`, `app/api/courses/[courseId]/assessments/route.ts`
- Changed: `package.json` (migrate script), `lib/data.ts` (`MOCK_COURSES` → `SEED_COURSES`), `lib/useCourses.ts`, `components/course-directory.tsx`, `components/add-assessment-form.tsx`, `app/courses/layout.tsx`
- Deleted: `lib/store.ts`, `lib/session.ts`, `lib/demo-data.ts`, `components/user-bootstrapper.tsx`
- Docs: `Doc/PRD.md`, `docs/IMPLEMENTATION_PLAN.md`, `README.md`, `conversation.md`

---

## Episode 18 — Phase 5: Course Material Ingestion (Cloudflare R2)

### Product Owner prompt (verbatim)
> Start Phase 5 — Course Material Ingestion: add a file upload flow that stores materials in Cloudflare R2 with a storageReference, surfaces them in the Sources section, and handles unsupported files gracefully. Tell me what credentials you need from me.

### What the AI builder did
1. **Surveyed the storage surface first.** `learning_material` already had a `storage_reference` column and the repository mapped it into the `Course` type, but nothing wrote to it and the Sources list was seeded rows with no bytes behind them. There was no object-storage dependency in the project.
2. **Chose a dependency-free R2 client over an S3 SDK.** The project had already refused an ORM to stay dependency-light (Phase 4, Change 11), and only three operations are needed. `lib/r2.ts` implements AWS SigV4 over Node's `crypto`: a signed `PUT` (upload), a signed `DELETE` (cleanup), and a presigned `GET` (retrieval). R2 is S3-compatible, so this covers it with no new package.
3. **Uploaded server-side, then recorded the row.** `POST /api/courses/[courseId]/materials` verifies the learner owns the course *before* touching storage, sends the bytes to R2 under an owner-scoped key (`<user>/<course>/<material>/<safe name>`), then inserts the `learning_material` row with that key as its `storageReference`. If the insert fails, the object is removed.
4. **Added retrieval.** `GET …/materials/[materialId]/download` checks the material belongs to one of the learner's courses and redirects to a public object URL (when `R2_PUBLIC_BASE_URL` is set) or a short-lived presigned URL otherwise.
5. **Made unsupported files graceful at both ends.** `lib/materials.ts` defines the accepted set (PDF; PowerPoint; Word; Markdown/plain-text notes; WebVTT/SRT transcripts) and a 25 MB limit, shared by the form and the route. The route returns a specific status and message per failure — 415 unsupported, 413 too large, 400 empty/missing, 503 storage unconfigured, 502 upload failed, 401/404 for auth/ownership — and the form shows them inline.
6. **Surfaced materials in Sources.** `components/add-material-form.tsx` handles selection, client-side validation, upload progress, and errors; the Sources list now shows a “Stored in R2” badge, the file size, and a Download action for stored files (seeded citations keep their location text and no download). The list already renders from PostgreSQL, so an upload appears on reload.
7. **Schema.** `db/migrations/0002_material_storage.sql` adds `mime_type` and `size_bytes` to `learning_material`; `storage_reference` was already there from Phase 4. Applied with `npm run migrate`.
8. **Verified.** `npm run typecheck` ✓ · `npm run build` ✓ (new routes listed) · `npm run migrate` applied 0002 once ✓ · live against the dev server with a real session: unauthenticated upload → 401, `.exe` → 415, missing file field → 400, non-owned course → 404. Throwaway test account removed afterwards.
9. **Documented honestly.** PRD **Change 12** + §16.1 (Phase 5 implemented, verification pending credentials), plan status + Phase 5 deliverables (acceptance criteria left unchecked with the reason), README status and prerequisites (the R2 variables). The source-processing pipeline is explicitly **not** claimed — it is Phase 6.

### Where the user was asked to act
None of the work was blocked beyond credentials: object storage needs an R2 account. The builder named the exact environment variables and stopped short of inventing values. **No live upload has been exercised yet.**

### Files changed
- New: `db/migrations/0002_material_storage.sql`, `lib/r2.ts`, `lib/materials.ts`, `app/api/courses/[courseId]/materials/route.ts`, `app/api/courses/[courseId]/materials/[materialId]/download/route.ts`, `components/add-material-form.tsx`
- Changed: `lib/types.ts`, `lib/repo/courses.ts`, `lib/useCourses.ts`, `app/courses/[courseId]/sources/page.tsx`, `app/globals.css`, `.env.example`
- Docs: `Doc/PRD.md`, `docs/IMPLEMENTATION_PLAN.md`, `README.md`, this episode

---

## Episode 19 — Phase 5.5: Storage migrated to Supabase Storage (verified end to end)

### Product Owner prompt (verbatim, abridged)
> I have decided to use Supabase Storage instead of Cloudflare R2 for Edvance's course-material storage. … Do NOT replace our existing PostgreSQL database. Do NOT migrate Better Auth to Supabase Auth. Do NOT use Supabase as our application database. … Supabase is being introduced ONLY for private file/object storage. … The browser must never receive the Supabase secret key. … Never print, echo, log, display, or expose secret values. You may only report environment variable NAMES and whether they are PRESENT or MISSING. [Then a nine-step procedure: verify configuration; record the decision in PRD Appendix A and the plan; review the R2 implementation; implement `lib/supabase-storage.ts`; run real end-to-end tests A–E; sanitize errors; typecheck; document verified results; secret-scan and commit.]

### What the AI builder did
1. **Verified the configuration first, names only.** `infisical export --env=dev --format=dotenv | cut -d= -f1` listed exactly `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_STORAGE_BUCKET`. All three Supabase names were **PRESENT**; no value was ever read into the transcript.
2. **Recorded the steering decision before changing code.** PRD **Appendix A, Change 13** states plainly that R2 had been selected and implemented but **never successfully connected or tested**, that the Product Owner chose Supabase Storage using their existing account, and that this is storage only — PostgreSQL stays the database, Better Auth stays authentication, Infisical stays the secrets manager. §14, §16.1, and §16.2 and the implementation plan were re-pointed to Supabase Storage; the historical R2 record was kept.
3. **Reviewed, then replaced — did not rebuild.** The good behaviour was preserved untouched: Better Auth session check, course-ownership check, extension validation, empty-file and 25 MB checks, server-derived MIME type, upload-then-insert with rollback, the Sources UI, and the delete support added just before. Only the storage layer changed.
4. **Added the official Supabase server client.** `npm install @supabase/supabase-js` (the only new dependency, +8 packages, 0 vulnerabilities) and a new server-only `lib/supabase-storage.ts`: the client disables session persistence, and it exposes `putObject`, `createDownloadUrl` (300-second signed URL), `deleteObject`, and `isStorageConfigured`. The secret key is only ever read from Infisical into the server process.
5. **Owner-scoped object keys.** The stored path is now `users/{userId}/courses/{courseId}/materials/{materialId}/{safe filename}` — the client-supplied filename is sanitised and is only ever the final segment, so a learner cannot steer the path, and a listing cannot cross learners.
6. **Rewired the three routes.** Upload stores to the private bucket then inserts the row (removing the object if the insert fails); download verifies ownership and redirects to a short-lived signed URL; delete removes the row (authoritative) then the object (best-effort, orphans logged). The raw-provider-error leak was closed: provider bodies stay in the server log and the browser sees only "File storage is temporarily unavailable."
7. **Removed the superseded R2 code.** `lib/r2.ts` deleted; no `R2_*` reference remains in `app`, `lib`, or `components`; README, `.env.example`, and the plan no longer ask for R2 credentials. Git history keeps the old implementation.
8. **Ran the real tests against the private bucket** (dev server on port 3250 via `infisical run`; see results below).
9. **Cleaned up after itself.** Every uploaded object was deleted through the app, the throwaway accounts were removed, the bucket was confirmed **empty**, and the database returned to baseline (`user` 3, `course` 4, `learning_material` 20, `session` 8). The test server was stopped and the fixture directory removed.

### Real end-to-end results (2026-10-01)
- **Upload (A):** a real PDF → HTTP 201; the `learning_material` row carried `application/pdf`, size 218, and the owner-scoped `storageReference`; the object was confirmed present at that exact path with the service key. A real TXT (C) uploaded the same way to `…/sample.txt` as `text/plain`.
- **Download (B):** `GET …/download` → 307 → signed URL → 200; **SHA-256 matched** the uploaded file for both the PDF and the TXT.
- **Delete (D):** `DELETE` → 200; the row disappeared, the object was confirmed **absent** in the bucket, and a later download returned 404. Deleting one material left the others' objects untouched.
- **Privacy:** anonymous requests to the public, authenticated, and bare object URLs all returned **HTTP 400** — the bucket is not public.
- **Security/validation (E):** unauthenticated upload/download/delete → **401**; a second learner downloading, deleting, or uploading to the first learner's course → **404** (and the first learner's file survived); `.exe` → **415**; zero-byte → **400**; 26 MB → **413**; a PDF sent with a fake `text/html` content type was still stored as **`application/pdf`**.
- **Typecheck:** `npx tsc --noEmit` exit 0.

### Where the user was asked to act
Only the credentials were the user's to provide; they were already in Infisical. Nothing else blocked, and no placeholder value was invented.

### Files changed
- New: `lib/supabase-storage.ts`
- Changed: `app/api/courses/[courseId]/materials/route.ts`, `app/api/courses/[courseId]/materials/[materialId]/route.ts`, `app/api/courses/[courseId]/materials/[materialId]/download/route.ts`, `lib/materials.ts`, `lib/repo/courses.ts`, `lib/useCourses.ts`, `components/add-material-form.tsx`, `app/courses/[courseId]/sources/page.tsx`, `package.json`, `package-lock.json`
- Deleted: `lib/r2.ts`
- Docs: `Doc/PRD.md`, `docs/IMPLEMENTATION_PLAN.md`, `README.md`, `.env.example`, this episode

---

## Episode 20 — Phase 5.6: Text Extraction & Evidence Chunking (verified end to end)

### Product Owner prompt (verbatim, abridged)
> Phase 5.5 has been reviewed and approved. … Proceed to Phase 5.6 — Text Extraction and Evidence Chunking. Do NOT begin Gemini or any AI-provider integration yet. … Transform uploaded course materials from opaque stored files into structured, location-aware evidence that later AI phases can safely use. [Required pipeline: Stored Learning Material → Download/read bytes server-side → Extract text → Preserve source locations → Split into meaningful chunks → Store chunks in PostgreSQL → Expose ingestion status to the learner.] Implement real extraction for PDF, TXT, Markdown, DOCX, PPTX, VTT, SRT. Preserve real source locations (page, slide, timestamp, section/line) — do not create fake locations. Add `material_ingestion_job` and `material_chunk`. Keep the architecture server-only under `lib/extraction/`. On failure, mark the job failed, keep the uploaded file, and store only a safe diagnostic. No AI provider, no prompts, no concept extraction, no embeddings, no vector database. Sources should show real state ("Ready for analysis", never "Analyzed") and derived metadata only when actually derived. Do not present seeded mock sources as real. [Then a Definition of Done, a documentation list, and a commit convention.]

### What the AI builder did
1. **Chose three focused parsers, not a framework.** Checked maintenance, size, server compatibility, and licensing before adding: `pdfjs-dist` 6.3.289 (Apache-2.0) for per-page PDF text, `mammoth` 1.13.0 (BSD-2-Clause) for DOCX, and `jszip` 3.10.2 (MIT) to read the PPTX Open XML package. TXT, Markdown, WebVTT, and SRT are hand-written — no extra dependency. The three server libraries were added to `serverExternalPackages` so Next serves them from `node_modules` rather than bundling their worker/wasm assets.
2. **Built one normalised extraction shape.** `lib/extraction/` (`types`, `shared`, `pdf`, `docx`, `pptx`, `text`, `markdown`, `vtt`, `srt`, `chunk`, `index`) returns blocks of `{ text, location }` where the location type is `page` | `slide` | `timestamp` | `section` | `line` and the label is the human-readable citation ("Page 7", "00:04:12–00:04:38", "Section: Introduction to PROMPT"). Nothing here imports React or the database.
3. **Made chunking deterministic and safe.** `chunk.ts` splits each block at sentence boundaries toward a ~900-character target (hard limit 1600), merges uselessly small tails, and never lets a chunk cross a source location, so every chunk's citation is exact. Ordinals are assigned in order at storage time.
4. **Added the schema.** `db/migrations/0003_material_ingestion.sql` creates `material_ingestion_job` (status `pending|processing|completed|failed`, start/complete timestamps, `error_code`, `error_summary`, derived `metadata`) and `material_chunk` (`ordinal`, `content`, `source_location`, structured `metadata`, `unique (material_id, ordinal)`), both `references learning_material(id) on delete cascade`.
5. **Wired synchronous ingestion.** `lib/ingestion.ts` runs create job → mark processing → download object (new `downloadObject` in `lib/supabase-storage.ts`) → extract → chunk → store (one transaction that replaces the material's chunks) → mark completed. The upload route triggers it after the material row exists and still returns 201 regardless; `POST …/materials/[materialId]/ingest` retries.
6. **Made failures safe and honest.** A `MaterialExtractionError` carries a short code and a user-safe message (`corrupt-file`, `malformed-transcript`, `empty-content`, `unsupported-format`); anything else becomes `extraction-failed`. The job stores only the code and safe summary — material contents and raw provider errors never appear in the log or the database, and the uploaded file is always kept.
7. **Gave the Sources page a real state.** "Ready for analysis" (never "Analyzed"), "Processing…", and "Extraction failed" with a Retry button; factual derived metadata only when a count was actually produced ("PDF · 14 pages", "Transcript · 37 cues", chunk count). Seeded rows without a `storageReference` are labelled **Demo source** and their locations are never mixed with derived evidence.
8. **Wrote a real end-to-end test.** `scripts/test-ingestion.mjs` signs up two learners, creates courses, uploads a unique in-memory fixture per format, and verifies the extracted text, source locations, chunk order, job lifecycle, ownership isolation, failed states, and delete cascades directly against PostgreSQL. No copyrighted material is used.
9. **Ran, verified, cleaned up, and documented.** `npx tsc --noEmit` exit 0; the suite reported **91 passed, 0 failed**; every test object was deleted and the database returned to baseline (`user` 3, `course` 4, `learning_material` 20; `material_ingestion_job` 0, `material_chunk` 0; bucket empty). The pre-commit secret scan passed. PRD **Change 14** + §15/§16, the plan, README, and this episode were updated with observed results only.

### Real end-to-end results (2026-10-01)
- **Extraction, all seven formats PASS:** PDF, TXT, Markdown, DOCX, PPTX, WebVTT, SRT — each upload reported completed ingestion, wrote a job, and stored chunks whose text matched the known fixture text.
- **Locations PASS:** PDF `Page 1`/`Page 2`; PPTX `Slide 1`/`Slide 2`; WebVTT/SRT `00:00:01–00:00:04` and `00:00:05–00:00:09`; Markdown/DOCX `Section: …`; TXT `Lines 1–2` style labels.
- **Jobs & chunks PASS:** ordinals are `0..n-1` in order; chunks belong to the correct material; re-ingestion replaces chunks without duplication.
- **Ownership isolation PASS:** a second learner could neither download nor trigger ingestion of the first learner's material (404) and owned zero chunks.
- **Failed-ingestion PASS:** corrupted PDF (`corrupt-file`), malformed VTT (`malformed-transcript`), and whitespace-only TXT (`empty-content`) each failed the job with a safe code and zero chunks while keeping the file; an unsupported `.xyz` was rejected at upload with 415.
- **Delete cascade PASS:** removing a material removed its chunks and jobs.

### Where the user was asked to act
Nowhere — the credentials were already in Infisical, and no AI provider was configured or needed. (One dev-environment note for the next session: the Next.js dev server must be started after clearing `.next`, or nested dynamic routes under `…/materials/[materialId]/…` can 404 from a stale route manifest.)

### Files changed
- New: `db/migrations/0003_material_ingestion.sql`, `lib/ingestion.ts`, `lib/extraction/{index,types,shared,pdf,docx,pptx,text,markdown,vtt,srt,timed,chunk}.ts`, `app/api/courses/[courseId]/materials/[materialId]/ingest/route.ts`, `scripts/test-ingestion.mjs`
- Changed: `lib/supabase-storage.ts`, `lib/types.ts`, `lib/repo/courses.ts`, `lib/useCourses.ts`, `app/api/courses/[courseId]/materials/route.ts`, `app/courses/[courseId]/sources/page.tsx`, `next.config.ts`, `package.json`, `package-lock.json`
- Docs: `Doc/PRD.md`, `docs/IMPLEMENTATION_PLAN.md`, `README.md`, this episode

## Episode 21 — Phase 6: Course Intelligence (implemented; live Gemini call pending)

### Product Owner prompt (verbatim, abridged)
> [Autonomous completion master directive §12, Phase 6.] Turn real `material_chunk` evidence into real structured course intelligence. First stop accepting legacy `.doc` and `.ppt`. Use exactly one AI provider — Google Gemini (`GEMINI_API_KEY`); check only whether the key is present, and if it is missing, complete every safe non-key task first and then stop with HUMAN ACTION REQUIRED. Verify the current official Gemini JS/TS SDK before implementing. Keep AI server-side under `lib/ai/`; the browser must never call Gemini. Use strict structured validation and reject unknown, cross-course and cross-user chunk ids. Preserve exact instructor terminology. Support `SUPPORTED`/`PARTIALLY_SUPPORTED`/`INSUFFICIENT_EVIDENCE`. Add `POST /api/courses/[courseId]/analyse`. Support analysis states and mark intelligence stale when materials change. Never call Gemini on an ordinary page refresh. Create an original golden fixture — a fictional six-part framework — and reuse it in Phase 7.

### What the AI builder did
1. **Checked the key first, honestly.** `infisical export --env=dev` (names only) shows six secrets — `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DATABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_STORAGE_BUCKET`, `SUPABASE_URL`. **`GEMINI_API_KEY` is not present.** Every key-independent task below was completed; the live provider call is the one recorded blocker.
2. **Cleaned up the accepted formats.** `lib/materials.ts` no longer accepts `.doc` or `.ppt` — there is no reliable server-side extractor for the binary Office formats, so accepting them would let a learner upload a file Edvance can never read. `.pdf .txt .md .docx .pptx .vtt .srt` continue to work, and the form hint, upload route rejection (415) and docs all agree. The acceptance test asserts both legacy formats are refused.
3. **Verified the current SDK, then installed one dependency.** Read the official `googleapis/js-genai` README and Google's structured-output docs, then installed `@google/genai@^2.25.0` (pinned below `3.0.0`, which the SDK itself recommends) and confirmed `GenerateContentConfig.responseJsonSchema` in its shipped type definitions before writing any call. `ai.models.generateContent({ model, contents, config: { systemInstruction, responseMimeType: "application/json", responseJsonSchema } })` is the API used.
4. **Built the server-only intelligence layer.** `lib/ai/types.ts` (shapes + `AiProviderError`/`ModelOutputError`), `schemas.ts` (the structured-output JSON Schema, a strict runtime validator, and `resolveReferences`), `prompts.ts` (evidence-only instructions that demand exact chunk ids and preserve course terminology), `gemini.ts` (the single provider plus an env-gated deterministic test provider), and `course-intelligence.ts` (bounded context → generate → validate → resolve → de-duplicate). The browser never imports any of it.
5. **Made validation the centre of the design.** Every cited chunk id must have been in the model's input, which was loaded scoped to this learner and this course — so a fabricated, cross-course or cross-user citation rejects the **whole** response. Malformed JSON, out-of-range confidence, unknown evidence states and relationships pointing at undefined concepts are all rejections. Nothing partial is ever stored, and the raw output is never persisted or logged.
6. **Added the schema and repository work.** `db/migrations/0004_course_intelligence.sql` creates `course_analysis` (status, safe error fields, an **evidence fingerprint**, counts, safe provider metadata), `concept_evidence` (concept → real material + chunk + location + verbatim excerpt) and `concept_relationship`; `concept` gains `origin`, `evidence_status` and `confidence`. A real analysis deletes the course's demo concepts first, so seeded concepts are never shown as extracted intelligence.
7. **Added `POST /api/courses/[courseId]/analyse`** — authenticate → ownership → load evidence → bound → Gemini → validate → resolve → persist in one transaction. It refuses to start a second analysis while one runs (409), and returns `outcome: "up-to-date"` without a model call when the stored intelligence already matches the evidence.
8. **Made staleness live, not stored.** `evidenceFingerprint` (material ids + chunk counts, no contents) is compared on every read, so adding, removing or changing a material turns stored intelligence into **needs re-analysis** immediately — still with no model call.
9. **Built the Intelligence workspace tab** showing the analysis state, each concept with its evidence status, definition, instructor term and the exact evidence behind it (material, location, excerpt), plus justified relationships. The demo-only state, the failure state and the insufficient-evidence state each explain themselves honestly.
10. **Wrote the golden fixture and the tests.** `scripts/test-course-intelligence.mjs` uploads an original fictional six-part framework — the **FATHOM** framework (Frame, Assemble, Trace, Hold, Order, Move) — and asserts all six are extracted with evidence; it also covers instructor terminology, multi-source concepts, insufficient evidence, invalid chunk ids, staleness, malformed output, provider failure, duplicate merging, cost control, cross-user isolation, the upload-format cleanup, and the Phase 5.6 regression. The fixture is deliberately reused by Phase 7 for the six-versus-five inconsistency.

### Real end-to-end results (2026-10-01)
- **Typecheck PASS:** `npx tsc --noEmit` exit 0.
- **Phase 6 PASS:** `scripts/test-course-intelligence.mjs` reported **59 passed, 0 failed** against a dev server on port 3260 started with the deterministic provider (`EDVANCE_AI_MOCK=simple infisical run --env=dev -- npx next dev -p 3260`).
- **Phase 5.6 regression PASS:** `scripts/test-ingestion.mjs` reported **91 passed, 0 failed** on the same server.
- **Database and bucket returned to baseline:** `concept_evidence` 0, `concept_relationship` 0, `course_analysis` 0, `material_chunk` 0, `material_ingestion_job` 0; the three existing accounts and their four workspaces untouched.
- **Not claimed:** the live Google Gemini call has **not** been made — no `GEMINI_API_KEY` exists in the dev environment yet. The pipeline is verified with a deterministic provider that is refused in production; the provider path itself is written and typechecked but unexercised.

### Where the user was asked to act
A human-only blocker: adding `GEMINI_API_KEY` to the Infisical `dev` environment. See `docs/EDVANCE_EXECUTION_STATE.md`; after adding it, typing `continue` resumes at the real-Gemini verification.

### Files changed
- New: `db/migrations/0004_course_intelligence.sql`, `lib/ai/{types,schemas,prompts,gemini,course-intelligence}.ts`, `app/api/courses/[courseId]/analyse/route.ts`, `app/courses/[courseId]/intelligence/page.tsx`, `scripts/test-course-intelligence.mjs`, `docs/EDVANCE_EXECUTION_STATE.md`
- Changed: `lib/materials.ts`, `lib/types.ts`, `lib/data.ts`, `lib/repo/courses.ts`, `lib/useCourses.ts`, `components/badges.tsx`, `app/courses/[courseId]/{layout,page,mastery/page}.tsx`, `package.json`, `package-lock.json`, `.env.example`
- Docs: `Doc/PRD.md` (Change 15 + §15/§16), `docs/IMPLEMENTATION_PLAN.md`, `README.md`, this episode

---

## Episode 22 — Phase 6 completed: the real Gemini call (verified) and committed

### Product Owner prompt (verbatim, abridged)
> [The Product Owner supplied the `GEMINI_API_KEY` value and the standing directive:] on a bare `continue`, recover state, re-check blockers, and resume automatically through subsequent phases; stop only for a genuine human-only blocker or when Edvance is SUBMISSION READY.

### What the AI builder did
1. **Stored the key without ever echoing it.** Verified it lived in the Infisical `dev` environment — `infisical secrets set GEMINI_API_KEY=… --env=dev` — and confirmed it by listing secret *names* only. Nothing entered the repository, a log, or a `NEXT_PUBLIC_` variable, and the secret scan still reports no leaks.
2. **Checked the key against the live API before trusting it.** A single `generateContent` probe returned 200 and the `models` list resolved, so the key was real. The probe also revealed that this account's Google project now recommends `gemini-3.8-flash` and that `gemini-2.5-flash` is retired for new users — the maintained `gemini-flash-latest` alias answered, so the code's default model was already correct after the SDK check made in Episode 21.
3. **Wrote the live acceptance check.** `scripts/verify-gemini-live.mjs` is the real-provider counterpart to the deterministic suite: it uploads the FATHOM golden fixture, calls `POST /api/courses/[courseId]/analyse` against a server started **without** `EDVANCE_AI_MOCK`, and asserts the six components, exact instructor terminology, a real `Section: …` location and a verbatim excerpt for every citation, a justified relationship between real concepts, cost control and staleness.
4. **Diagnosed the 503s honestly instead of guessing.** The first live runs failed with 502/503. A direct SDK probe proved the *request* was fine (`gemini-3.6-flash schema=true OK`) — the failures were Google-side capacity (503) and free-tier quota (429). Two findings came out of it: the SDK **already retries** (default up to five attempts with delays growing toward a minute), and quota is **per model**. The first draft added a second retry loop that multiplied requests and drained quota — that was wrong, and was removed.
5. **Fixed the retry policy properly.** `lib/ai/gemini.ts` now pins the SDK's own retry policy explicitly — three attempts, initial 1 s, capped at 8 s — instead of a duplicate outer loop. Transient 429/5xx are retried a bounded number of times inside one learner action; everything else fails at once. The `dev` environment pins `GEMINI_MODEL=gemini-3.5-flash` because the `-latest` alias was intermittently capacity-limited; the code default remains the maintained alias.
6. **Verified the real model.** `scripts/verify-gemini-live.mjs` reported **26 passed, 0 failed** against live `gemini-3.5-flash`: all six FATHOM concepts (Frame, Assemble, Trace, Hold, Order, Move), each with `SUPPORTED` status, exact instructor terminology, a real `Section: …` evidence reference and a verbatim excerpt, plus one justified `Frame --prerequisite--> Assemble` relationship. Token usage was recorded (737 in / 718 out) as safe provider metadata only.
7. **Re-ran the whole gate and returned everything to baseline.** `npx tsc --noEmit` exit 0; the deterministic suite **59 passed**; the Phase 5.6 regression **91 passed** (after clearing `.next`, which a stale route manifest had made 404 the nested material routes); `infisical scan --redact` → no leaks found. The database was exactly at baseline, and the bucket was found to hold **23 orphaned objects** from earlier test runs (all belonging to already-deleted test users, none referenced by a single database row) — those were removed so the bucket is empty again.
8. **Committed Phase 6 and updated every doc.** `Doc/PRD.md` Change 15 now records the live provider result, `docs/IMPLEMENTATION_PLAN.md` ticks the real-Gemini acceptance box, `README.md` documents the live script and the model pin, and `docs/EDVANCE_EXECUTION_STATE.md` was rewritten for Phase 7. Commit message: `feat(ai): add evidence-grounded course intelligence`.

### Real end-to-end results (2026-10-01)
- **Live Google Gemini PASS:** `scripts/verify-gemini-live.mjs` — **26 passed, 0 failed** — model `gemini-3.5-flash`, six concepts, exact terminology, every citation resolvable and non-fabricated, cost control and staleness holding.
- **Deterministic suite PASS:** `scripts/test-course-intelligence.mjs` — **59 passed, 0 failed**.
- **Phase 5.6 regression PASS:** `scripts/test-ingestion.mjs` — **91 passed, 0 failed**.
- **Typecheck PASS:** `npx tsc --noEmit` exit 0. **Secret scan PASS:** no leaks found.
- **Baseline restored:** bucket 0 objects; 3 users, 4 courses, 20 materials, 20 concepts, 8 assessments untouched.
- **Not claimed:** no second provider, embeddings or vector database; the live model remains a shared free tier, so a transient capacity error can still surface as an honest, retryable "analysis failed" — Edvance would rather say that than invent a concept.

### Where the user was asked to act
Nowhere further — the key the Product Owner supplied unblocked the last gate. Phase 7 begins automatically.

### Files changed
- New: `scripts/verify-gemini-live.mjs`
- Changed: `lib/ai/gemini.ts` (pinned SDK retry policy)
- Docs: `Doc/PRD.md` (Change 15), `docs/IMPLEMENTATION_PLAN.md`, `README.md`, `docs/EDVANCE_EXECUTION_STATE.md`, this episode

---

## Episode 23 — Phase 7: Assessment Intelligence (verified with the live model)

### Product Owner prompt (verbatim, abridged)
> [Autonomous completion master directive §13, Phase 7.] Connect assessment questions to concepts, sources and consistency checks. Populate the `source_mapping` that Phase 4 created but never used. Support `CONSISTENT` / `POSSIBLE_INCONSISTENCY` / `INSUFFICIENT_EVIDENCE`, and add a per-question signature. Reuse the FATHOM golden fixture: a question that asks for five components while the material teaches six is the canonical inconsistency. Commit `feat(assessment): build evidence-grounded assessment intelligence`, then continue automatically to Phase 8.

### What the AI builder did
1. **Judged questions against evidence, not wording.** `lib/ai/assessment-intelligence.ts` is given the concepts the course analysis already extracted — with their evidence status, definition and taught locations — and asks which of *those* the question tests, and whether it agrees. It never re-reads raw chunks, so a question cannot disagree with the course about what the course teaches, and it costs one call instead of a re-analysis.
2. **Wired the table that had been dormant since Phase 4.** `source_mapping` is now written from the validated verdict (one row per concept per evidence location, with the real material id, location and confidence) and read back to build each question's signature. This is the last schema-only table in the PRD §15 model.
3. **Made a contradiction impossible to fake.** A verdict of `POSSIBLE_INCONSISTENCY` must name at least one existing concept as the evidence that disagrees — otherwise `parseAssessmentIntelligence` rejects the response as `unjustified-inconsistency`. Concept ids are resolved against the exact concepts that were sent, so a hallucinated, cross-course or cross-user concept rejects the whole response, exactly as in Phase 6.
4. **Required a ready course.** A question can only be judged against evidence-grounded concepts, so checking one before the course is analysed returns 409 with a message telling the learner to analyse the course. A ready course that established no concepts records `insufficient-evidence` honestly, with no model call.
5. **Mirrored the Phase 6 state machine and cost controls.** `assessment_analysis` carries the same six states, and an up-to-date signature returns `outcome: "up-to-date"` without a model call. Because a signature is judged against the course's concepts, a new material makes it `needs-reanalysis` too — the signature can never be fresher than the concepts behind it.
6. **Fixed the course verdict while in there.** The course-level consistency is now the most severe, most recent finding, so one inconsistent question is never hidden by a later, milder result; and writing a real signature deletes the seeded course-level narrative, so demo prose is never shown beside genuine analysis.
7. **Built the per-question UI.** The Assessments tab shows each question's state, verdict, reason and next action, plus the concepts it tests with their own evidence and a short excerpt. Buttons are disabled until the course has concepts.
8. **Wrote the deterministic suite and extended the live one.** `scripts/test-assessment-intelligence.mjs` — **76 passed, 0 failed** — covers the six-versus-five verdict, a consistent question, source-mapping persistence, cost control, staleness, insufficient evidence, four rejection paths (invalid concept id, unjustified inconsistency, malformed, provider failure), ownership isolation and the demo regression. `scripts/verify-gemini-live.mjs` gained an assessment section and now reports **34 passed, 0 failed**.
9. **Caught a false-clean typecheck.** `npx tsc --noEmit` reported success while `lib/data.ts` genuinely failed, because a stale `tsconfig.tsbuildinfo` suppressed the errors. Clearing it revealed four real errors — seed assessments needed the new `signature` field. Recorded in `docs/EDVANCE_EXECUTION_STATE.md` as a permanent gotcha: **always `rm -f tsconfig.tsbuildinfo` before typechecking.**

### Real end-to-end results (2026-10-01)
- **Deterministic PASS:** `scripts/test-assessment-intelligence.mjs` — **76 passed, 0 failed**. The FATHOM question "What are the five components of the FATHOM framework?" produced `possible-inconsistency`, six tested concepts and six real `source_mapping` rows pointing at six `Section: …` locations.
- **Live model PASS:** `scripts/verify-gemini-live.mjs` — **34 passed, 0 failed** — `gemini-3.5-flash` returned `possible-inconsistency` with the reason *"The question assumes there are five components in the FATHOM framework, whereas the course evidence shows there are six components: Frame, Assemble, Trace, Hold, Order, and Move."*
- **Regressions PASS:** Phase 6 **59 passed**, Phase 5.6 **91 passed**. Typecheck exit 0 after clearing the build cache. Secret scan found no leaks.
- **Baseline restored:** bucket 0 objects; 3 users / 4 courses / 20 materials / 20 concepts / 8 assessments untouched; all analysis tables back to 0.
- **Not claimed:** no second provider, no embeddings or vector database, and no automatic analysis. Edvance never accuses a question of inconsistency without naming the evidence it disagrees with.

### Where the user was asked to act
Nowhere — Phase 7 ran end to end autonomously. Phase 8 begins automatically.

### Files changed
- New: `db/migrations/0005_assessment_intelligence.sql`, `lib/ai/assessment-intelligence.ts`, `app/api/courses/[courseId]/assessments/[assessmentId]/analyse/route.ts`, `scripts/test-assessment-intelligence.mjs`
- Changed: `lib/ai/{schemas,prompts,gemini,types}.ts`, `lib/repo/courses.ts`, `lib/types.ts`, `lib/data.ts`, `lib/useCourses.ts`, `app/courses/[courseId]/assessments/page.tsx`, `scripts/verify-gemini-live.mjs`, `package.json`
- Docs: `Doc/PRD.md` (Change 16), `docs/IMPLEMENTATION_PLAN.md`, `README.md`, `docs/EDVANCE_EXECUTION_STATE.md`, this episode

---

## Episode 24 — Phase 8: Mastery Intelligence (verified; no model call)

### Product Owner prompt (verbatim, abridged)
> [Autonomous completion master directive §14, Phase 8.] Connect learner performance to assessed concepts. Add `practice_attempt`; derive mastery from real attempts (**Untested / Weak / Developing / Mastered**) and never let AI set it. Commit `feat(mastery): add practice-based mastery intelligence`, then continue automatically to Phase 9.

### What the AI builder did
1. **Made mastery earned, not asserted.** `practice_attempt` (migration `0006`) records each thing a learner actually did — an assessment question or a single concept — with the answer text, the correctness verdict and when it happened. `lib/mastery.ts` turns those attempts into a status by one deterministic rule, so the same history always gives the same answer. **No model is called anywhere in this phase**: an attempt is the learner's own record, and the status is computed from it.
2. **Chose a rule that a single answer cannot game.** No attempts → **Untested**; fewer than half correct → **Weak**; at least half correct → **Developing**; at least 80% correct over at least three attempts → **Mastered**. A lone correct answer can never crown a concept.
3. **Attributed attempts durably.** Practising a question writes one attempt per concept that question was checked against (its real `source_mapping` rows), so the trail survives a later re-analysis; practising a concept writes one attempt for it. After writing, the affected concepts are re-derived from the learner's *whole* history and upserted into `mastery_state` — with attempt counts and a last-practised timestamp — in the same transaction.
4. **Kept the Phase 4 contract.** `mastery_state` stays the materialised per-learner, per-concept result; the new columns make the practice behind it visible. Seeded demo rows keep their defaults and are never presented as earned.
5. **Gated on evidence.** A question can only be practised once it has been checked against the course's evidence; otherwise the endpoint answers 409 and points at the Assessments tab. A concept can only be practised if it belongs to the course.
6. **Added one write path.** `POST /api/courses/[courseId]/practice` authenticates, authorises by ownership, validates a single target and the boolean verdict (with a bounded answer), and returns the refreshed course — always an explicit learner action.
7. **Showed the trail.** The Mastery tab states the rule, shows each concept's attempts and correct count, offers a practice panel (checked questions and single concepts, an optional answer, right/wrong record), and lists recent practice with the learner's own answer.
8. **Wrote the deterministic suite.** `scripts/test-mastery-intelligence.mjs` — **48 passed, 0 failed** — covers the honest Untested baseline, the full ladder on the FATHOM fixture (wrong → Weak; 1/2 → Developing at 50; 2/3 → 67; 3/4 → 75; 4/5 → Mastered at 80), attribution, reproducibility, per-concept isolation, the unchecked-question gate, validation, ownership isolation and demo honesty.

### Real end-to-end results (2026-10-01)
- **Deterministic PASS:** `scripts/test-mastery-intelligence.mjs` — **48 passed, 0 failed**.
- **Regressions PASS:** Phase 7 **76 passed**, Phase 6 **59 passed**, Phase 5.6 **91 passed**. Typecheck exit 0 after clearing `tsconfig.tsbuildinfo`. Secret scan found no leaks.
- **Baseline restored:** `practice_attempt` 0; `mastery_state` 20 unchanged; bucket 0 objects; 3 users / 4 courses / 20 materials / 20 concepts / 8 assessments untouched.
- **Not claimed:** no AI grades an answer, no AI assigns a mastery, and no status is seeded as if earned.

### Where the user was asked to act
Nowhere — Phase 8 ran end to end autonomously. Phase 9 begins automatically.

### Files changed
- New: `db/migrations/0006_practice_mastery.sql`, `lib/mastery.ts`, `app/api/courses/[courseId]/practice/route.ts`, `scripts/test-mastery-intelligence.mjs`
- Changed: `lib/types.ts`, `lib/data.ts`, `lib/repo/courses.ts`, `lib/useCourses.ts`, `app/courses/[courseId]/mastery/page.tsx`, `package.json`
- Docs: `Doc/PRD.md` (Change 17), `docs/IMPLEMENTATION_PLAN.md`, `README.md`, `docs/EDVANCE_EXECUTION_STATE.md`, this episode

---

## Episode 25 — Phase 9: Targeted Revision (verified)

### Product Owner prompt (verbatim, abridged)
> [Autonomous completion master directive §15, Phase 9.] Turn evidence and mastery into a useful next action. Recommend the smallest useful next action from weak concepts, and generate targeted practice from weak/untested areas — not random across the course. Commit `feat(revision): add targeted revision workflow`, then continue automatically to Phase 10.

### What the AI builder did
1. **Made the recommendation a fact, not an opinion.** `lib/revision.ts` derives the focus and the single next action from the learner's own mastery and the course's evidence: **Weak** first, then **Developing**, then **Untested**; a **Mastered** concept is never recommended. It runs on every read, so it is always current and costs no model call.
2. **Sent only the weak areas.** The generation endpoint loads exactly the evidence chunks that teach the focus concepts (scoped to the learner and course) and offers the model only those concepts and chunks. It never sees the rest of the course, so practice is targeted by construction.
3. **Made every reference provable.** `resolveRevisionReferences` rejects the whole response if a question names a concept that was not supplied or cites a chunk that was not supplied, and questions are bounded (`MAX_PRACTICE_QUESTIONS` 12) — the same honesty rule as Phases 6 and 7.
4. **Closed the loop with Phase 8.** A generated question can be recorded right or wrong through the practice endpoint, so mastery updates and the stored plan becomes `needs-reanalysis` automatically; regenerating writes practice for the new weak areas and replaces the old set.
5. **Stayed honest about the empty cases.** An un-analysed course is refused with 409; a fully-mastered course records `nothing-to-revise`; a course with no concepts or a weak area with no evidence records `insufficient-evidence` — each with no model call.
6. **Added the Revision tab.** It shows the next action, the focus with its evidence, the generation state, and the targeted practice with a right/wrong record per question.
7. **Wrote the deterministic suite.** `scripts/test-targeted-revision.mjs` — **72 passed, 0 failed** — covers the deterministic recommendation, targeted generation, cost control, mastery-driven re-targeting (mastering *Frame* and failing *Assemble* removed one and promoted the other), the nothing-to-revise boundary, four rejection paths, insufficient evidence, the analysis gate, isolation and demo honesty.

### Real end-to-end results (2026-10-02)
- **Deterministic PASS:** `scripts/test-targeted-revision.mjs` — **72 passed, 0 failed**.
- **Regressions PASS:** Phase 8 **48 passed**, Phase 7 **76 passed**, Phase 6 **59 passed**, Phase 5.6 **91 passed**. Typecheck exit 0 after clearing `tsconfig.tsbuildinfo`. Secret scan found no leaks.
- **Baseline restored:** `practice_question` 0, `revision_plan` 0; bucket 0 objects; 3 users / 4 courses / 20 materials / 20 concepts / 8 assessments / 20 mastery rows untouched.
- **Not claimed:** the model never chooses what to revise, and never writes practice for a concept outside the learner's weak areas or cites evidence that was not supplied.

### Where the user was asked to act
Nowhere — Phase 9 ran end to end autonomously. Phase 10 begins automatically.

### Files changed
- New: `db/migrations/0007_targeted_revision.sql`, `lib/revision.ts`, `lib/ai/revision-intelligence.ts`, `app/api/courses/[courseId]/revision/route.ts`, `app/courses/[courseId]/revision/page.tsx`, `scripts/test-targeted-revision.mjs`
- Changed: `lib/types.ts`, `lib/data.ts`, `lib/repo/courses.ts`, `lib/useCourses.ts`, `lib/ai/{types,schemas,prompts,gemini}.ts`, `app/courses/[courseId]/layout.tsx`, `package.json`
- Docs: `Doc/PRD.md` (Change 18), `docs/IMPLEMENTATION_PLAN.md`, `README.md`, `docs/EDVANCE_EXECUTION_STATE.md`, this episode

---

## Episode 26 — Phase 10: Product Completion & Hardening (verified, production build passes)

### Product Owner prompt (verbatim, abridged)
> [Autonomous completion master directive §16, Phase 10.] Complete and harden the product: edit/delete, an account lifecycle, security headers/CSP/rate limiting/upload quotas, error/not-found/health routes, privacy and terms, responsiveness and accessibility, real test infrastructure, and lint/format/typecheck/build. Commit, then continue automatically to Phase 11.

### What the AI builder did
1. **Made records editable and removable.** `PATCH`/`DELETE` on the course route rename or delete a course (the delete cascades in PostgreSQL and removes its stored files), and a new assessment route edits or deletes a question. Editing a checked question discards its stale verdict — `source_mapping`, the per-question finding and `assessment_analysis` are deleted and it returns to `not-analyzed` — so the app never presents a judgement of wording that no longer exists.
2. **Completed the account lifecycle.** An **/account** page shows the signed-in identity, changes the password (revoking other sessions), and deletes the account. Deletion removes the `user` row, from which everything else cascades, then removes the stored objects. A confirmation email goes through **Resend** when configured, and the API reports `emailSent` truthfully otherwise.
3. **Hardened the surface.** `next.config.ts` now sets a strict CSP plus `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` and HSTS, and stops advertising the framework. A pure, dependency-free fixed-window rate limiter guards model calls, uploads, practice and account actions per learner, and a course is capped at 50 materials and 200 MB.
4. **Added honest failure surfaces.** `error.tsx` and `global-error.tsx` show a reference, never the raw error; `not-found.tsx` explains a 404; and `GET /api/health` reports the database as the one hard dependency plus each integration's configured state without secrets.
5. **Shipped the legal pages.** `/privacy` and `/terms` describe storage, use, deletion and the product's limits, linked from the footer.
6. **Built a dependency-free unit layer.** Node's built-in test runner (no new packages) exercises the mastery rules, the rate limiter and the material helpers; `npm run check` pairs it with the typecheck. One finding along the way: Node's type stripping rejects TypeScript *parameter properties*, so the limiter assigns its clock field explicitly.
7. **Proved the production build.** `next build` compiles and prerenders every route — the first time the app has been built for production.
8. **Wrote the hardening suite.** `scripts/test-product-hardening.mjs` — **43 passed, 0 failed** — covering health, headers, the 404 page, course and question edit/delete (including storage cleanup and check invalidation) and the account lifecycle.

### Real end-to-end results (2026-10-02)
- **Deterministic PASS:** `scripts/test-product-hardening.mjs` — **43 passed, 0 failed**; unit suite — **24 passed, 0 failed**.
- **Regressions PASS:** Phase 9 **72**, Phase 8 **48**, Phase 7 **76**, Phase 6 **59**, Phase 5.6 **91**. Typecheck exit 0 after clearing `tsconfig.tsbuildinfo`.
- **Production build PASS:** `next build` compiled successfully, with TypeScript checked and 13 static pages generated.
- **Baseline restored:** `practice_attempt`/`practice_question`/`revision_plan` 0; bucket 0 objects; the 3 users / 4 courses / 20 materials / 20 concepts / 8 assessments / 20 mastery rows untouched.
- **Not claimed:** ESLint and Prettier are not configured, and rate limiting is per-process. Both are documented gaps.

### Where the user was asked to act
Nowhere — Phase 10 ran end to end autonomously. Phase 11 begins automatically.

### Files changed
- New: `lib/rate-limit.ts`, `lib/api-rate-limit.ts`, `lib/email.ts`, `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx`, `app/api/health/route.ts`, `app/api/account/route.ts`, `app/account/page.tsx`, `app/privacy/page.tsx`, `app/terms/page.tsx`, `app/api/courses/[courseId]/assessments/[assessmentId]/route.ts`, `scripts/test-product-hardening.mjs`, `tests/unit/*.test.mjs`
- Changed: `next.config.ts`, `lib/materials.ts`, `lib/repo/courses.ts`, `lib/useCourses.ts`, `app/api/courses/[courseId]/route.ts`, `app/api/courses/[courseId]/materials/route.ts`, the four AI/practice routes, `app/courses/[courseId]/page.tsx`, `app/courses/[courseId]/assessments/page.tsx`, `app/layout.tsx`, `components/header.tsx`, `app/globals.css`, `package.json`
- Docs: `Doc/PRD.md` (Change 19), `docs/IMPLEMENTATION_PLAN.md`, `README.md`, `docs/EDVANCE_EXECUTION_STATE.md`, this episode

---

## Episode 27 — Phase 11: Deployment (specification completed; deploy blocked on a human action)

### Product Owner prompt (verbatim, abridged)
> [Autonomous completion master directive §17, Phase 11.] Inspect `specific.hcl`, deploy to a free tier with HTTPS and managed PostgreSQL, wire Infisical-compatible secrets, and smoke-test the deployed app end to end.

### What the AI builder did
1. **Stopped at the right boundary.** The `specific` CLI is not installed in this checkout and no deployment credentials exist, and a deploy creates real external infrastructure (a managed PostgreSQL instance and a public HTTPS URL). Rather than guess, the builder recorded this as a genuine human action and asked the Product Owner how to proceed; the Owner chose to **prepare the deploy without running it**.
2. **Caught a deploy that would have shipped a hollow product.** `specific.hcl` declared only `PORT`, `NODE_ENV`, `DATABASE_URL`, `BETTER_AUTH_URL` and `BETTER_AUTH_SECRET`. A deploy from it would have started cleanly and then offered a product **without AI analysis and without file storage** — the two things every earlier phase rests on. The spec now declares `gemini_api_key`, `supabase_url`, `supabase_secret_key`, `supabase_storage_bucket` and the optional `resend_api_key`/`email_from`, and pins `GEMINI_MODEL`.
3. **Verified the spec internally.** Every `secret.*` reference in `specific.hcl` has a matching declaration (checked with a query over the file). `better_auth_secret` remains platform-generated.
4. **Pointed the platform at a real health check.** The endpoint's `health_check` now targets `/api/health` (built in Phase 10) instead of `/`, so the platform sees an unhealthy instance when the database is unreachable.
5. **Documented the procedure rather than inventing it.** The README gains a Deployment section: prerequisites (authenticate the platform, set the operator secrets), a secrets table, the deploy commands, and a verification checklist. Because the CLI is unavailable, the procedure names the steps and points the operator at `specific --help` instead of fabricating flag names.

### Real results (2026-10-02)
- **Spec PASS:** every `secret.*` reference resolves to a declaration; the local production build the platform runs (`npx next build`) succeeds.
- **Not performed:** the deploy, remote migrations and the deployed smoke test — blocked on platform credentials and the account owner's authorisation. Recorded as a human action, not skipped silently.

### Where the user was asked to act
**One genuine human action:** authenticate the platform and supply the integration secrets. The Owner chose to prepare rather than deploy, so nothing external was created.

### Files changed
- Changed: `specific.hcl`, `README.md`, `Doc/PRD.md` (Change 20), `docs/IMPLEMENTATION_PLAN.md`, `docs/EDVANCE_EXECUTION_STATE.md`, this episode

---

## Current state (2026-10-01)

- **Committed & pushed:** the interface sheet is commit `f89fdfc`, and it and everything before it are on `origin/main`. The push moved `9090f45..f89fdfc`, carrying four commits that had accumulated locally: Phase 2 + Field Guide (`2af22eb`), Phase 3 Better Auth (`bfe0e4c`), Press Room + logo (`b092460`), interface sheet (`f89fdfc`). Pushing was done in the same working session.
- **Phase 3 (Episode 14):** Better Auth over local PostgreSQL (service `postgresql-edvance`, db `edvance`); server-side guard on `/courses`; per-user workspaces; Phase 3 docs committed separately.
- **Press Room redesign + logo (Episode 15, committed `b092460`):** teal/cream/rust/sage palette with legacy aliases; Edvance seal monogram shipped as React components, favicon, and a shareable SVG; landing page, header, and footer rebuilt. Presentation only — no behaviour changed.
- **Interface sheet (Episode 16, committed `f89fdfc`):** `design.html` now renders the seven shipped screens from the real markup against a verbatim snapshot of `app/globals.css`, labelled by route, with per-screen notes on real versus mock data. Point-in-time by design; re-copy between the `APP-CSS` markers when the stylesheet changes.
- **Running:** dev server restarted after the editor restart and answering on http://localhost:3000 (`/` → 200, `/courses` → 307 to sign-in when unauthenticated); started detached, log at `/tmp/edvance-dev.log`. PostgreSQL service `postgresql-edvance` listening on 5432.
- **Untracked:** `.freebuff/` (editor tooling metadata) is still untracked and was deliberately not committed — it predates this work and is not in `.gitignore`.
- **Verified:** typecheck ✓ · build ✓ (all routes incl. the three new `/api/courses…`) · migrations apply once and re-run clean ✓ · full API flow with real sessions (seed → read → create → add assessment → read back) ✓ · 401 unauthenticated ✓ · per-learner isolation ✓ · `source_mapping` schema round-trip ✓.
- **Phase 4 (Episode 17):** course/learner data now lives in PostgreSQL. Schema + migration (`db/migrations/0001_course_data.sql`), migration runner (`npm run migrate`), repository layer (`lib/repo/courses.ts`), three route handlers, and the workspace moved off `localStorage`. `source_mapping` is schema/repository only until Phases 6–7.
- **Committed and pushed:** Phase 4 is commit `7a84394` on `main` (`feat: persist course and learner records in PostgreSQL`, 22 files, +938/−252) and is on `origin/main` — the push moved `96e3702..7a84394`, leaving local and remote identical. `.freebuff/` remains untracked and was deliberately excluded.
- **Phase 5 (Episodes 18–19, committed `0e33c80`):** course materials upload to private **Supabase Storage** (bucket `edvance-materials`). Episode 18 built the upload/download flow and the `mime_type`/`size_bytes` migration against Cloudflare R2; Episode 19 replaced R2 with the official Supabase server client (`lib/supabase-storage.ts`), added delete, and **verified the whole path end to end** — real PDF + TXT upload, private signed download with matching checksums, real delete, anonymous access refused, and the full validation/security matrix. Supabase is used for storage only: PostgreSQL remains the database and Better Auth the authentication.
- **Phase 6 (Episodes 21–22, committed `feat(ai): add evidence-grounded course intelligence`):** courses are analysed into concepts grounded in real `material_chunk` evidence by **Google Gemini**, server-only through the official `@google/genai` SDK. Concepts carry instructor terminology, a definition and the exact evidence behind them; `SUPPORTED`/`PARTIALLY_SUPPORTED`/`INSUFFICIENT_EVIDENCE` are honest states and a fabricated citation rejects the whole response. Verified with the deterministic suite (**59 passed**) **and the live provider** (`scripts/verify-gemini-live.mjs`, **26 passed**), plus the Phase 5.6 regression (**91 passed**).
- **Phase 7 (Episode 23, committed `feat(assessment): build evidence-grounded assessment intelligence`):** each assessment question is judged against the concepts the course's own materials taught, with honest verdicts **Consistent with the evidence** / **Possible inconsistency** / **Insufficient evidence**. `source_mapping` (dormant since Phase 4) is now populated and read, and the course verdict is the most severe finding. Verified deterministically (**76 passed**) and with the live model (**34 passed**), including the real six-versus-five detection.
- **Phase 8 (Episode 24, committed `feat(mastery): add practice-based mastery intelligence`):** mastery is **derived from the learner's own recorded practice and never assigned by a model**. `practice_attempt` (migration `0006`) records each attempt — a question (credited to every concept it was checked against) or a single concept — and `lib/mastery.ts` turns the history into **Untested / Weak / Developing / Mastered** by one deterministic rule (no attempts → Untested; under half correct → Weak; at least half → Developing; at least 80% over at least three attempts → Mastered). Recording re-derives the affected concepts and upserts `mastery_state` with attempt counts in one transaction. `POST /api/courses/[courseId]/practice` is the only write path and refuses an unchecked question with 409. The Mastery tab shows the rule, each concept's attempts, a practice panel and recent practice. Verified deterministically (**48 passed, 0 failed**) with no model call.
- **Phase 9 (Episode 25, committed `feat(revision): add targeted revision workflow`):** the **Revision** tab turns evidence and mastery into the smallest useful next action. The recommendation is derived deterministically from mastery and the course's evidence (Weak → Developing → Untested; Mastered excluded) with no model call. Generating practice is an explicit action that sends the model only the weak concepts and the evidence that teaches them, so every generated question targets a real gap and cites a real `Section: …` location; an unsupplied concept or citation rejects the whole response. Generated practice records straight back into mastery through the Phase 8 endpoint, which re-derives the recommendation and marks the stored plan stale. Fully-mastered, un-analysed and no-evidence cases are recorded honestly without a model call. Verified with `scripts/test-targeted-revision.mjs` — **72 passed, 0 failed**.
- **Phase 10 (Episode 26, committed `feat: complete the product and harden it`):** courses, materials and questions can be edited and deleted (deleting cleans up stored files; editing a question discards its stale check); an **/account** page manages the account lifecycle including deletion of the account and everything it owns; the deployment ships security headers and a strict CSP, a per-learner rate limiter, per-course upload quotas, `error.tsx`/`not-found.tsx`/`/api/health`, and `/privacy` and `/terms`; transactional email goes through **Resend** when configured; a dependency-free unit suite joins the end-to-end suites; and a production `next build` passes. Verified with `scripts/test-product-hardening.mjs` (**43 passed**) and the unit suite (**24 passed**).
- **Phase 5.6 (Episode 20):** uploaded materials are now **extracted into location-tagged evidence** — PDF by page, slides by slide, transcripts by timestamp range, documents/notes by section or line range — chunked into ordered `material_chunk` rows with a `material_ingestion_job` tracking each attempt (`db/migrations/0003_material_ingestion.sql`, `lib/extraction/`, `lib/ingestion.ts`). Uploads ingest synchronously; failures keep the file and record only a safe code, and Sources shows **Ready for analysis** / Processing / Extraction failed with Retry. Verified with `scripts/test-ingestion.mjs` — **91 passed, 0 failed** — across all seven formats, locations, ordering, isolation, failed states, cascades, typecheck, and a secret scan. No AI provider, prompt, embedding, or vector database was added.

## Suggested next steps
0. **Phase 12 — Submission Readiness (next, automatic).** Run an adversarial audit and a no-fake-feature sweep (grep for mock/demo/hardcoded/TODO/FIXME/placeholder/fake/seed and confirm every claim), execute the full test gate, write `docs/SUBMISSION_REPORT.md`, walk the app manually, and declare Edvance submission ready — carrying deployment as an explicit pending human action rather than a claimed success.
1. Product Owner review passes worth doing by eye: the **Assessments** tab after checking the five-component question (http://localhost:3260 or :3000), and the **Intelligence** tab — screenshots remain non-compositing in this environment, so the UI has not been seen visually yet.
2. Worth hardening early: the live Gemini free tier is a shared queue, so a bounded retry and a clear learner-facing retry affordance matter more than they look — worth revisiting in Phase 10 alongside rate limiting and upload quotas.
3. A cheap robustness win: replace TS incremental typechecking's stale-cache trap by making `npm run typecheck` clear `tsconfig.tsbuildinfo` first, so a false-clean cannot reach a commit again.
3. Optional polish: a script that regenerates the inlined stylesheet snapshot in `design.html` so the sheet cannot silently drift; a root `PRD.md` pointer so `/PRD.md` resolves on GitHub; a light/dark theme pass; a social/OG image from the poster scene and logo lockup.