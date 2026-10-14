# Oyevolve — Submission Report

**Date:** 2026-10-02
**Deployment status last re-checked:** 2026-10-13
**Branch:** `main`
**Last verified commit:** `64b115c` — `Merge pull request #6 from OTimileyin/feat/v2-batch-upload`
**Verified at this commit:** CI green on `main` (`lint + formatting`, `typecheck + unit tests`, `production build`, `visual regression`, `end-to-end (batch upload)`, `Supabase Preview`); the Vercel production deployment READY and serving <https://oyevolve.vercel.app>; `/api/health` → **200** (`database: ok`, ai/storage `configured`, email `not-configured`); the remote suite against Vercel → **70 passed / 0 failed**.
**Live deployments:** **https://oyevolve.vercel.app** (Vercel, primary) · **https://white-whale.spcf.app** (Specific, backup)
**Status:** **OYEVOLVE — DEPLOYED AND SUBMISSION READY.** The app is live on both platforms, serves
HTTPS, and the primary passed a remote end-to-end verification of the complete learner journey
(**70 checks, 0 failures**).

> **Earlier verification record (unchanged).** At `9468e85`, `npm run lint` and `npm run format:check`
> exited 0, `npm run check` reported **38 passed / 0 failed**, the production build passed, and the three
> required CI checks were green on PR #2. At `756c4fb`, the remote suite reported Specific **69 passed /
> 0 failed** and the two-deployment diff mode reported **16 passed / 53 failed** against the Vercel host —
> which was then not yet live. That last result is historical: the host now serves the app and passes
> 70/0.

---

## 0. Live deployment

|                         |                                                                                                                                                                                                     |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Primary URL**         | https://oyevolve.vercel.app (Vercel, managed HTTPS)                                                                                                                                                 |
| **Backup URL**          | https://white-whale.spcf.app (Specific, managed HTTPS, HSTS)                                                                                                                                        |
| **Platform**            | Vercel, project `oyevolve` (`prj_mlviOKz6aPa1Dmqly0aGS9Iu9tEY`), production branch `main`; Specific (`specific.hcl`), project `oyevolve` (`proj_0vqsej2psy3sy4tr`), environment `prod`              |
| **Active deployments**  | Vercel `oyevolve-1kuipdmhh` (from `main` at `64b115c`); Specific `depl_02f4368hqt4n86q6`                                                                                                            |
| **Database**            | Two separate managed PostgreSQL instances. Vercel: all 9 migrations in `db/migrations/` applied — its build log lists `0000`–`0008` as already applied. Specific: applied by its `pre_deploy` step. |
| **Health**              | `GET /api/health` → `200 {"status":"ok","database":"ok","integrations":{"ai":"configured","storage":"configured","email":"not-configured"}}`                                                        |
| **Model**               | `gemini-3-flash-preview` (pinned in `specific.hcl` and the Vercel environment)                                                                                                                      |
| **Remote verification** | `npm run verify:remote -- https://oyevolve.vercel.app` → **70 passed / 0 failed**; the Specific URL previously passed the 69-check suite                                                            |

### Second deployment — Vercel (live, and now the primary)

Oyevolve runs a second, independent deployment on Vercel: `vercel.json` runs
`node scripts/migrate.mjs && next build`, the database URL resolves from either `DATABASE_URL` or the
`POSTGRES_URL` that Vercel's Postgres integration injects (`lib/env.ts`, `scripts/migrate.mjs`), and
`docs/VERCEL_DEPLOYMENT_RUNBOOK.md` documents the procedure end to end.

This target is **live at <https://oyevolve.vercel.app>** and passed the full remote suite at
**70 passed / 0 failed**. Its production branch is `main`, so a merge deploys without a manual step.
Two things were needed to get there, and both are worth keeping: `lib/db-url.mjs` — the shim that
appends `uselibpqcompat=true` to the Postgres URL — because without it the migrate step dies in
Vercel's build sandbox with `SELF_SIGNED_CERT_IN_CHAIN`, which failed four consecutive `main` builds;
and the Oyevolve rebrand and the rest of PR #6 landing on `main` at all. **Specific remains live as the
backup**, not as the primary.

---

## 1. What Oyevolve is

Oyevolve is an evidence-first assessment intelligence workspace for a learner. It ingests the
materials a course actually provides, extracts location-tagged evidence from them, and then answers
four questions:

1. **What does this course teach?** Concepts extracted from the learner's own materials, preserving
   the course's own terminology, each with the exact evidence behind it.
2. **What does each assessment question test?** The concepts a question exercises, and whether the
   question agrees with the course's evidence.
3. **What has the learner mastered?** A per-concept status derived only from recorded practice.
4. **What should they study next?** The smallest useful next action, plus targeted practice written
   for the weak areas.

The product principle throughout: **prefer INSUFFICIENT EVIDENCE over invented certainty.** Oyevolve
never invents a citation, page number, timestamp, slide number, terminology, mastery result, or
source.

## 2. What is real, and what is deliberately limited

**Real and verified end to end**

- Accounts and sessions — Better Auth over PostgreSQL, HTTP-only cookies, per-user scoping on every
  query.
- Private file storage — Supabase Storage; uploads, short-lived signed downloads, delete, and
  cascade cleanup.
- Text extraction and evidence chunking — PDF by page, slides by slide, transcripts by timestamp
  range, documents/notes by section or line, chunked into ordered evidence.
- AI course intelligence — concepts, instructor terminology, definitions, evidence status and
  justified relationships, produced by Google Gemini, called only from the server, with every cited
  chunk proven to exist in the model's input.
- AI assessment intelligence — per-question tested concepts, one of three honest verdicts
  (consistent / possible inconsistency / insufficient evidence), and a reason that must name the
  evidence it disagrees with.
- Practice-based mastery — derived from recorded attempts by one deterministic rule; no model is
  involved and no status is seeded as if earned.
- Targeted revision — a deterministic recommendation plus model-written practice, sent only the weak
  concepts and the evidence that teaches them.
- Edit/delete, account lifecycle (password change, account deletion with storage cleanup),
  security headers + CSP, per-learner rate limiting, per-course upload quotas, error/not-found/health
  routes, privacy and terms pages.

**Deliberately limited (documented, not hidden)**

- **The Gemini free tier is 20 requests/day/model.** The deployment pins one available model; a
  burst can still surface as an honest, retryable provider failure, and a very heavy day can exhaust
  the model's quota. The model is a one-line change in `specific.hcl`; a key with quota removes the
  limit entirely.
- **Rate limiting is in-memory per process**; a multi-instance deployment would need a shared store.
- **Ingestion is synchronous**, so a large file holds the upload request open.
- **Scanned/image-only PDFs fail** as `empty-content` — there is no OCR.
- **No embeddings or vector database**; context is bounded (`MAX_EVIDENCE_CHUNKS` 150,
  `MAX_EVIDENCE_CHARS` 120 000, `MAX_PRACTICE_QUESTIONS` 12).
- **Transactional email** is used only for the account-deletion confirmation, and only when
  `RESEND_API_KEY` is configured; otherwise the API reports `emailSent: false` honestly.
- **Analysis prerequisites are deliberate:** analyse the course → check a question → practise it →
  generate revision. Each gate exists because the next step genuinely needs the previous output.
- **Live Gemini is a shared free tier**, so a transient 503/429 can surface as an honest, retryable
  failure.
- **The seeded demo workspace** carries demo consistency and mastery until the learner's first real
  analysis and practice replace them; it is labelled as demo.
- The landing page's evidence card is an **illustrative example**, labelled as such for assistive
  technology.

## 3. Verification

| Check                             | Command                                                                           | Result                                                                                                                                                                    |
| --------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Typecheck                         | `rm -f tsconfig.tsbuildinfo && npx tsc --noEmit`                                  | **exit 0**                                                                                                                                                                |
| ESLint                            | `npm run lint`                                                                    | **exit 0** (0 problems)                                                                                                                                                   |
| Prettier                          | `npm run format:check`                                                            | **exit 0** (all files formatted)                                                                                                                                          |
| Unit tests                        | `npm run test:unit`                                                               | **38 passed / 0 failed**                                                                                                                                                  |
| Phase 10 — product & hardening    | `npm run test:hardening`                                                          | **43 passed / 0 failed**                                                                                                                                                  |
| Phase 9 — targeted revision       | `npm run test:revision`                                                           | **72 passed / 0 failed**                                                                                                                                                  |
| Phase 8 — mastery                 | `npm run test:mastery`                                                            | **48 passed / 0 failed**                                                                                                                                                  |
| Phase 7 — assessment intelligence | `npm run test:assessment`                                                         | **76 passed / 0 failed**                                                                                                                                                  |
| Phase 6 — course intelligence     | `npm run test:intelligence`                                                       | **59 passed / 0 failed**                                                                                                                                                  |
| Phase 5.6 — ingestion             | `npm run test:ingestion`                                                          | **91 passed / 0 failed**                                                                                                                                                  |
| Live provider                     | `node scripts/verify-gemini-live.mjs`                                             | **34 passed / 0 failed** (`gemini-3.5-flash`)                                                                                                                             |
| **Remote (deployed) — Vercel**    | `npm run verify:remote -- https://oyevolve.vercel.app`                            | **70 passed / 0 failed** (`gemini-3-flash-preview`, primary, at `64b115c`)                                                                                                |
| **Remote (deployed) — Specific**  | `BASE_URL=https://white-whale.spcf.app node scripts/verify-remote-deployment.mjs` | **69 passed / 0 failed** (`gemini-3-flash-preview`; the backup, recorded before the Vercel target took over)                                                              |
| Production build                  | `infisical run --env=dev -- npx next build`                                       | **passes** (13 static pages)                                                                                                                                              |
| Production build (no env)         | `npx next build` with only the `specific.hcl` build args                          | **passes** — the env-free builder succeeds                                                                                                                                |
| Secret scan                       | `infisical scan --redact`                                                         | **no leaks found**                                                                                                                                                        |
| Baseline                          | database + bucket                                                                 | restored (`practice_attempt`/`practice_question`/`revision_plan` 0; 3 users / 4 courses / 20 materials / 20 concepts / 8 assessments / 20 mastery rows; bucket 0 objects) |

Every suite creates its own fixtures in memory (no copyrighted material) and deletes everything it
creates.

**The live run.** Against the real API, the golden FATHOM fixture — which teaches _six_ components
while the seeded question asks for _five_ — produced:

> **possible-inconsistency** — "The question assumes there are five components of the FATHOM
> framework, but the course evidence shows there are six components: Frame, Assemble, Trace, Hold,
> Order, and Move."

naming six real concepts and citing only real `Section: …` locations.

**The remote run.** Against the deployed app, the same journey was driven end to end over HTTPS with
the real provider: it signed up a learner, uploaded the FATHOM fixture (ingested synchronously into
evidence chunks), analysed the course (six concepts extracted, each citing real evidence), added the
five-versus-six question and checked it (`possible-inconsistency`, reason naming the six components),
practised it (one wrong attempt → every concept `Weak`; four more correct → `Mastered` at 80%), and
generated a targeted revision plan (weak concepts prioritised, grounded practice questions). It also
confirmed HTTPS + HSTS, the full security-header set, a **404** on unknown routes, **401** on an
unauthenticated account delete, cross-learner isolation (**404** on a foreign course), and that no
configuration secret appears in any payload. All **69** checks passed.

## 4. Adversarial audit (Phase 12)

Attempts to make the app lie, and what happened:

- **Fabricated citation.** A mock scenario citing a non-existent chunk is rejected (`unknown-chunk`),
  nothing is persisted, and the analysis is recorded as failed with a safe summary. Pass.
- **Fabricated concept.** Assessment/revision output naming a concept outside the supplied set is
  rejected (`unknown-concept`); the whole response is discarded rather than partially applied. Pass.
- **Unjustified contradiction.** A `POSSIBLE_INCONSISTENCY` that names no concept is rejected
  (`unjustified-inconsistency`) — Oyevolve never accuses a question of contradicting the evidence
  without pointing at the evidence. Pass.
- **Cross-user access.** Every read and write is keyed by the signed-in learner; another account gets
  404 on a foreign course and 401 unauthenticated. Verified for courses, materials, analysis,
  practice and revision. Pass.
- **Streaming raw provider errors.** Failures store only a short machine code and a user-safe
  summary; raw output is never stored or shown. Pass.
- **Stale judgement.** Changing materials marks intelligence `needs-reanalysis`; editing a question
  discards its check; practising moves mastery and marks the revision plan stale — each recomputed
  without a model call. Pass.
- **Mock reaching production.** `isMockProvider()` requires `NODE_ENV !== "production"`, so the
  deterministic provider can never answer a real learner; `NODE_ENV=production` is set in the
  deployment spec. Pass.
- **Untrusted origin.** Better Auth rejected a sign-in attempt from an origin outside
  `BETTER_AUTH_URL` with `Invalid origin` during the manual walkthrough. Pass (a security feature).
- **Stale product claims — found and fixed.** The landing page, footer and header still said course
  analysis was "not yet live", that analysis "still runs on mock data", and flagged the product as
  "Demo · mock data". All four statements are false as of Phase 6–9 and were corrected in this phase.
  This was the one substantive defect the audit found.

**No-fake-feature sweep.** `grep -rinE "mock|demo|hardcoded|todo|fixme|placeholder|fake|seed"` over
`app/`, `components/` and `lib/` returns only legitimate hits: the env-gated test provider
(`lib/ai/gemini.ts` and the four routes that honour a mock scenario), the seeded demo dataset
(`lib/data.ts`, `ensureSeeded`), the demo account on the sign-in page, and HTML `placeholder`
attributes. There are **no `TODO`/`FIXME`/`HACK` markers and no stubbed feature presented as real**.
No client component imports a server-only module (checked), and no secret is referenced through
`NEXT_PUBLIC_` or hardcoded in source.

## 5. Manual walkthrough (Phase 12)

- `/`, `/signin`, `/signup`, `/privacy`, `/terms` render at the intended layout; the landing page
  screenshot confirms the header, hero, and evidence card render correctly with the corrected copy.
- `/does-not-exist` returns **404** with the explanatory page; `/api/health` returns **200** with
  `database: "ok"`.
- Unauthenticated `/courses` and `/courses/ai-foundry` return **307** to sign-in (server-side guard);
  unauthenticated API calls return **401**; `DELETE /api/account` unauthenticated returns **401**.
- Accessible names are present throughout (`Skip to content`, labelled form fields, `aria-label`s on
  icon controls, `aria-live` loading text, a `Legal` footer nav).
- The authenticated workspace screens (courses, sources, intelligence, assessments, mastery,
  revision, account) are exercised by the seven end-to-end suites, which sign up real accounts and
  drive every route's API layer.

## 6. Deployment — live

`specific.hcl` declares every secret the app reads (`gemini_api_key`, `supabase_url`,
`supabase_secret_key`, `supabase_storage_bucket`, the optional `resend_api_key`/`email_from`, and the
platform-generated `better_auth_secret`), pins `GEMINI_MODEL`, points the endpoint health check at
`/api/health`, and runs `scripts/migrate.mjs` in `pre_deploy` (all migrations are safe to re-run).
The app is deployed at **https://white-whale.spcf.app**.

Two deployment facts are worth recording:

- **The builder has no runtime secrets.** Next.js collects route configuration at build time, and
  `lib/auth.ts`/`lib/db.ts` read configuration at import, so the build would otherwise fail. The
  `build` block therefore passes harmless build-only placeholders (`DATABASE_URL`, `BETTER_AUTH_SECRET`,
  `BETTER_AUTH_URL`) — literals, never the real values, which the service environment supplies at
  runtime. `specific docs builds` documents this pattern.
- **Model choice.** The free tier allows 20 requests/day/model, so the deployed model is pinned to one
  the operator's key can serve (`gemini-3-flash-preview`). Changing it is a one-line edit; a key with
  quota lifts the ceiling.

The operator can manage the deployment (logs, metrics, secrets, database) from
https://dashboard.specific.dev.

A second target, **Vercel**, is live at <https://oyevolve.vercel.app> and is now the primary
deployment (see §0). Its build command applies migrations the same way, and
`scripts/verify-remote-deployment.mjs --diff <urlA> <urlB>` — or
`npm run verify:remote:diff -- <urlA> <urlB>` — reports check by check which of two deployments
agree. It is the natural way to confirm the two still behave identically: while the Vercel host served
nothing it reported **16 passed / 53 failed** against Specific's **69 / 0**, every difference
downstream of no deployment being served — a result that no longer describes either host.

## 7. How to run it

```
npm install
npm run migrate            # applies db/migrations/*.sql (once each)
npm run dev                # infisical run --env=dev -- next dev
npm run check              # typecheck + unit tests
infisical run --env=dev -- npx next build   # production build
```

End-to-end suites need a dev server with the deterministic provider enabled:

```
OYEVOLVE_AI_MOCK=simple infisical run --env=dev -- npx next dev -p 3260
BASE_URL=http://localhost:3260 npm run test:hardening   # and :revision, :mastery, :assessment, :intelligence
```

## 8. Declaration

Oyevolve is **deployed and submission ready**: every claimed capability is implemented and verified —
by automated suites, a live provider run, and a remote end-to-end verification of the running
application over HTTPS (70 checks, 0 failures, against the primary Vercel deployment) — and the
product is honest about its limits. The one
operational caveat is the Gemini free tier's 20 requests/day/model cap, which the deployment
surfaces as an honest retryable failure rather than a crash or a fabricated result.

---

## 9. Installable PWA

Oyevolve is an installable Progressive Web App on the live deployment:

| Piece            | Where                                                                                                                                        |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Web App Manifest | `app/manifest.ts` → `/manifest.webmanifest` (name `Oyevolve`, `display: standalone`, `start_url` `/`, theme `#1E2A6B`, background `#FAF4E7`) |
| Service worker   | `public/sw.js`, registered by `components/pwa-register.tsx` (production only)                                                                |
| Icons            | `public/icons/icon-192.png`, `icon-512.png`, `icon-512-maskable.png` (from the Oyevolve logo mark); `app/apple-icon.png` (180px)             |
| Offline notice   | `public/offline.html` — "You are offline. Reconnect to continue using Oyevolve."                                                             |
| CSP              | `worker-src 'self'`, `manifest-src 'self'` added to the existing policy; nothing else relaxed                                                |

**Install verification:** Chrome's own installability verdict (`Page.getInstallabilityErrors`) against
`https://white-whale.spcf.app` over HTTPS returns **zero errors**; the service worker registers,
activates, and controls the page. The conservative worker never intercepts `/api/*` or non-GET
requests, so no learner data, signed Supabase URLs, or Gemini responses are cached.

**Offline limitations (honest):** offline the app serves only the reconnect notice. Authentication,
AI analysis, assessment intelligence, mastery and revision all require a connection; nothing is
claimed to work offline.

---

## Appendix — Commit history

| Phase  | Commit        | Summary                                                               |
| ------ | ------------- | --------------------------------------------------------------------- |
| 5.5    | `0e33c80`     | Supabase Storage                                                      |
| 5.6    | `f45ad5a`     | Text extraction & evidence chunking                                   |
| 6      | `2bce681`     | Evidence-grounded course intelligence                                 |
| 7      | `2d51d6f`     | Evidence-grounded assessment intelligence                             |
| 8      | `aa6f014`     | Practice-based mastery intelligence                                   |
| 9      | `3d7b818`     | Targeted revision workflow                                            |
| 10     | `fb96dc2`     | Product completion & hardening                                        |
| 11     | `18db198`     | Deployment specification & documentation                              |
| 12     | `b97cd0d`     | Submission readiness report & stale-claim fixes                       |
| Deploy | _this commit_ | Execute the deployment, pin a servable model, add remote verification |
