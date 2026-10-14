# Oyevolve — Execution State

Persistent memory for the autonomous completion run. On a bare `continue`, recover from **this
file + the repository** — never from chat memory.

---

## CURRENT PHASE

**Phase 11 — Deployment — COMPLETE.** Oyevolve is deployed at https://white-whale.spcf.app.

**Vercel — LIVE and primary.** <https://oyevolve.vercel.app> (project `oyevolve`) serves the build made
from `main` at `64b115c` and passed the remote end-to-end suite at **70 checks, 0 failures**
(2026-10-13). Specific at <https://white-whale.spcf.app> remains live as the **backup** target. See
"DEPLOYMENT TARGETS" below.

## CURRENT TASK

Nothing is in flight. **OYEVOLVE — DEPLOYED AND SUBMISSION READY.** Phases 0–12 are complete and both
deployments are live. The primary (Vercel) passed a remote end-to-end verification (**70 checks, 0
failures**, 2026-10-13) covering HTTPS, headers, storage, ingestion, Gemini course/assessment
intelligence, mastery, revision, cross-learner isolation and secret non-exposure. The submission
deliverable is `docs/SUBMISSION_REPORT.md`.

If a further change is requested, resume from this file and the repository — not from chat memory —
and re-run the gate before claiming anything new.

## LAST VERIFIED COMMIT

`64b115c` — `Merge pull request #6 from OTimileyin/feat/v2-batch-upload`, the merge that carried the
Oyevolve rebrand — including `lib/db-url.mjs` — onto `main`. Verified on this commit: CI green on
`main` (`lint + formatting`, `typecheck + unit tests`, `production build`, `visual regression`,
`end-to-end (batch upload)`, `Supabase Preview`); the Vercel production deployment
(`oyevolve-1kuipdmhh-timoyelabi.vercel.app`) READY, serving <https://oyevolve.vercel.app> and reachable
from the old aliases; `/api/health` → **200** (`database: ok`, ai/storage `configured`, email
`not-configured`); remote suite against the Vercel URL → **70 passed / 0 failed**.

The Phase-12 verification recorded below was run at `9468e85`, and still stands as that phase's record:
`npm run lint` and `npm run format:check` exit 0, `npm run check` **38 passed / 0 failed**, production
build passes, all three required CI checks green, Specific **69 passed / 0 failed**, and the
two-deployment diff mode exercised against the then not-yet-live Vercel host (**16 passed / 53
failed**) — a result that is now historical, because that host serves the app.

Phase 12 was `b97cd0d`; the deployment commits were `ec06507`, `afef1b8`, `b3e3a98`.
Phase 11 was `18db198`; Phase 10 was `fb96dc2`.
Phase 9 was `3d7b818`; Phase 8 was `aa6f014`; Phase 7 was `2d51d6f`; Phase 6 was `2bce681`;
Phase 5.6 was `f45ad5a`; Phase 5.5 was `0e33c80`.

## COMPLETED PHASES

- Phase 0–4 — foundation, design system, core structure, Better Auth, course data in PostgreSQL.
- Phase 5.5 — Supabase Storage. Committed `0e33c80`. User-approved.
- Phase 5.6 — Text Extraction & Evidence Chunking. Committed `f45ad5a`. Verified (91 tests).
- Phase 6 — Course Intelligence. Committed `2bce681`. Deterministic **59**; live Gemini **34**.
- Phase 7 — Assessment Intelligence. Committed `2d51d6f`. Deterministic **76**.
- Phase 8 — Mastery Intelligence. Committed `aa6f014`. Deterministic **48**; no model call.
- Phase 9 — Targeted Revision. Committed `3d7b818`. Deterministic **72**.
- Phase 10 — Product Completion & Hardening. Committed `fb96dc2`. Hardening **43**, unit **24**,
  regressions **72 / 48 / 76 / 59 / 91**, typecheck exit 0, production build passes.
- Phase 11 — Deployment. **Executed and live.** Deployed from WSL Ubuntu (the Specific CLI does not
  run on native Windows) to project `oyevolve` (`proj_0vqsej2psy3sy4tr`), environment `prod`, active
  deployment `depl_02f4368hqt4n86q6` at **https://white-whale.spcf.app**. All 8 migrations applied;
  `/api/health` returns `200` with database/ai/storage healthy (`email: not-configured`). The `build`
  block gained build-only placeholder env (see ENVIRONMENT NOTES); `GEMINI_MODEL` is pinned to
  `gemini-3-flash-preview`. Remote verification: **69 checks, 0 failures**.
- Phase 12 — Submission Readiness. **Complete.** Oyevolve declared submission ready: adversarial
  audit held, no-fake-feature sweep clean, four stale product claims found and fixed, full gate green
  (typecheck, unit 24, end-to-end 43/72/48/76/59/91, live Gemini 34, production build, secret scan,
  baseline), `docs/SUBMISSION_REPORT.md` written.

## DEPLOYMENT TARGETS

**Two deployments, one repository.** They share the Gemini and Supabase keys but have separate
databases and separate `BETTER_AUTH_SECRET`s, so rotating or breaking one never affects the other.

|                   | Primary                                                         | Backup                                                             |
| ----------------- | --------------------------------------------------------------- | ------------------------------------------------------------------ |
| **URL**           | <https://oyevolve.vercel.app>                                   | <https://white-whale.spcf.app>                                     |
| **Platform**      | Vercel, project `oyevolve` (`prj_mlviOKz6aPa1Dmqly0aGS9Iu9tEY`) | Specific, project `oyevolve` (`proj_0vqsej2psy3sy4tr`), env `prod` |
| **Deploys from**  | `main`, the production branch — a git push deploys              | `main`, via `specific deploy -e prod` from WSL                     |
| **Build**         | `node scripts/migrate.mjs && next build`                        | `pre_deploy` runs the same migration, then `next build`            |
| **Last verified** | **70 passed / 0 failed** (`64b115c`, 2026-10-13)                | **69 passed / 0 failed** (before Vercel took over)                 |

**The Vercel build failed four `main` builds in a row, and the cause is worth remembering.** `main` did
not carry `lib/db-url.mjs`, the shim that appends `uselibpqcompat=true` to the Postgres URL. Without it
`scripts/migrate.mjs` dies in Vercel's build sandbox with `SELF_SIGNED_CERT_IN_CHAIN` —
`pg-connection-string` now treats `sslmode=require` as `verify-full`, a change `lib/db-url.mjs` was
written to absorb — the build exits 1, and no deployment is produced. `64b115c` merged the shim in, and
the next build from `main` was this project's first successful git-sourced production deployment. The
app's runtime path needs the same shim, so **do not remove it from `lib/env.ts` or `scripts/migrate.mjs`.**

**Preview deployments do not build — environment scoping, not code.** Every Postgres variable
(`POSTGRES_URL` and its siblings) is scoped to **Production only**, so a branch preview receives no
connection string and stops at the migrate step; the `oyevolve-git-<branch>` aliases all point at
failed builds. Give the variables a Preview scope — pointing at a separate database, never the
production one — if preview deploys are wanted.

## INSTALLABLE PWA (LESSON 11)

**Complete and verified.** Manifest `app/manifest.ts` → `/manifest.webmanifest`; service worker
`public/sw.js` registered by `components/pwa-register.tsx` (production only); icons in
`public/icons/` (192, 512, 512-maskable) plus `app/apple-icon.png`; offline notice
`public/offline.html`; CSP gains `worker-src 'self'` and `manifest-src 'self'`. Chrome's
`Page.getInstallabilityErrors` against `https://white-whale.spcf.app` returns **zero errors**.
The worker never intercepts `/api/*` or non-GET requests. Offline serves only the reconnect
notice — no offline claims for auth, analysis, or learner data.

## ACTIVE BLOCKERS

None.

## HUMAN ACTIONS REQUIRED

None — both deployments are live and everything verified. Two optional, non-blocking notes:

1. **Gemini quota.** The operator's key is on the free tier (20 requests/day/model), and **both**
   deployments share it. A busy day can exhaust the pinned model, so demo the AI path early rather
   than repeatedly. To change it, edit `GEMINI_MODEL` in `specific.hcl` and in the Vercel project's
   environment, update it in Infisical `dev`, and redeploy both; a key with quota removes the limit.
2. **Test residue (Specific's database only).** It still holds a pre-existing
   `verify-e2e@edvance.test` account (2 courses) created by the earlier Oct-1 deploy verification, not
   by a later run. Harmless; delete it from <https://dashboard.specific.dev> if a clean database is
   preferred. The Vercel database is separate and unaffected.

## ENVIRONMENT NOTES

- `GEMINI_API_KEY` present in Infisical `dev`; `GEMINI_MODEL` pinned to `gemini-3-flash-preview` in
  `dev` and in `specific.hcl`. (Earlier live-provider runs above ran while `dev` pinned
  `gemini-3.5-flash`; the deployed app serves `gemini-3-flash-preview`, which the remote suite
  exercised.) Never print or commit either value.
- `RESEND_API_KEY` is **not** present; the account-deletion email honestly reports
  `emailSent: false`. Adding the key activates the flow without code changes.
- Next.js 16 allows only **one `next dev` per project directory** — stop the current server first.
- A stale route manifest 404s nested routes: `rm -rf .next` before starting a server. **Always
  `rm -f tsconfig.tsbuildinfo` before `npx tsc --noEmit`.**
- Ports: `test-ingestion.mjs` defaults to **3250**; all newer suites default to **3260**. Pass
  `BASE_URL` explicitly. One mock server serves every suite:
  `OYEVOLVE_AI_MOCK=simple infisical run --env=dev -- npx next dev -p 3260`.
- Production build needs env injected: `infisical run --env=dev -- npx next build`.
- **The database URL needs its TLS shim on Vercel.** `lib/db-url.mjs` appends `uselibpqcompat=true` when
  a connection string asks for `sslmode=require|prefer|allow`, because Vercel's build and function
  sandboxes terminate TLS with a chain Node does not trust. Removing that call reintroduces
  `SELF_SIGNED_CERT_IN_CHAIN` and fails every build at the migrate step.
- **Vercel Postgres variables are scoped to Production only**, so preview deployments have no database
  and their builds stop at the migrate step. Scoping them to Preview (with a separate database) is a
  dashboard change, not a code change.
- Unit tests run the TypeScript directly under Node's type-stripping loader. **Do not add TypeScript
  parameter properties / enums / namespaces to modules under `tests/unit`** — they are unsupported
  by stripping.
- `specific.hcl` is committed. It contains no secret values, only references and one
  platform-generated secret.
- **Deploy runs in WSL Ubuntu, not Windows.** `wsl.exe -d Ubuntu -- bash -lc 'cd /mnt/c/Users/ADMIN/Documents/Qubators/Edvance && specific deploy -e prod ...'`;
  the CLI lives at `/usr/local/bin/specific` there and is authenticated as a **claimed** agent
  account. The native-Windows CLI breaks at tarball creation (`specific.hcl not found in project
directory`), so always deploy through WSL.
- Secrets reach the WSL deploy without touching a command line: export
  `WSLENV='GEMINI_API_KEY:SUPABASE_URL:SUPABASE_SECRET_KEY:SUPABASE_STORAGE_BUCKET'` and run the CLI
  under `infisical run --env=dev`, referencing `$GEMINI_API_KEY` etc. inside the WSL shell.
- **The platform builder has no runtime secrets.** Next.js collects route config at build time and
  `lib/auth.ts`/`lib/db.ts` read config at import, so the `build` block must supply harmless
  build-only placeholders (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`) or the build fails
  with `Missing required environment variable DATABASE_URL`. Reproduce the builder with only those
  three dummy values set.

## IF WORK CONTINUES

There is no queued phase. If a new change is requested, resume from **this file + the repository**,
make the change, and re-run the gate before claiming anything:

1. `rm -f tsconfig.tsbuildinfo && npx tsc --noEmit`.
2. `npm run test:unit`.
3. Start one mock dev server (`OYEVOLVE_AI_MOCK=simple infisical run --env=dev -- npx next dev -p 3260`)
   and run the Phase 10 / 9 / 8 / 7 / 6 / 5.6 suites with `BASE_URL=http://localhost:3260`.
4. `infisical run --env=dev -- npx next build`, and once with only the `specific.hcl` build-arg
   placeholders to reproduce the platform builder.
5. If the app changed, land it on `main` — Vercel deploys that automatically — and/or redeploy
   Specific from WSL, then re-run the remote suite against **both** URLs and require 70/0 each:
   `npm run verify:remote -- https://oyevolve.vercel.app` and
   `npm run verify:remote -- https://white-whale.spcf.app`.
6. Confirm the secret scan is clean and the database + bucket are back to baseline.
7. Update `Doc/PRD.md` (a new Change), `docs/IMPLEMENTATION_PLAN.md`, `README.md`,
   `conversation.md` (a new Episode), `docs/SUBMISSION_REPORT.md` and this file, then commit.

## TEST STATUS

| Check                                                          | Result                                                                                                                                                                    |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npx tsc --noEmit` (after clearing `tsconfig.tsbuildinfo`)     | exit 0                                                                                                                                                                    |
| ESLint — `npm run lint`                                        | exit 0 (0 problems)                                                                                                                                                       |
| Prettier — `npm run format:check`                              | exit 0 (all files formatted)                                                                                                                                              |
| Unit — `npm run test:unit` (`tests/unit/*.test.mjs`)           | **38 passed / 0 failed**                                                                                                                                                  |
| Phase 10 — `scripts/test-product-hardening.mjs`                | **43 passed / 0 failed**                                                                                                                                                  |
| Phase 9 — `scripts/test-targeted-revision.mjs`                 | **72 passed / 0 failed**                                                                                                                                                  |
| Phase 8 — `scripts/test-mastery-intelligence.mjs`              | **48 passed / 0 failed**                                                                                                                                                  |
| Phase 7 — `scripts/test-assessment-intelligence.mjs`           | **76 passed / 0 failed**                                                                                                                                                  |
| Phase 6 — `scripts/test-course-intelligence.mjs`               | **59 passed / 0 failed**                                                                                                                                                  |
| Phase 5.6 — `scripts/test-ingestion.mjs`                       | **91 passed / 0 failed**                                                                                                                                                  |
| Live Gemini — `scripts/verify-gemini-live.mjs`                 | **34 passed / 0 failed** (`gemini-3.5-flash`)                                                                                                                             |
| Remote deployed — Vercel (primary)                             | **70 passed / 0 failed** (https://oyevolve.vercel.app, at `64b115c`)                                                                                                      |
| Remote deployed — Specific (backup)                            | **69 passed / 0 failed** (`gemini-3-flash-preview`, https://white-whale.spcf.app)                                                                                         |
| Production build — `infisical run --env=dev -- npx next build` | **passes** (13 static pages)                                                                                                                                              |
| Secret scan                                                    | `infisical scan --redact` → no leaks found                                                                                                                                |
| Database + bucket                                              | baseline (bucket 0 objects; `practice_attempt`/`practice_question`/`revision_plan` 0; 3 users / 4 courses / 20 materials / 20 concepts / 8 assessments / 20 mastery rows) |

## KNOWN LIMITATIONS

- **Deployed** twice: <https://oyevolve.vercel.app> (Vercel, primary) and <https://white-whale.spcf.app>
  (Specific, backup). The Gemini free tier is 20 requests/day/model and both share the key, so a burst
  can surface as an honest, retryable provider failure.
- Rate limiting is **in-memory per process**; a multi-instance deployment would need a shared store.
- Ingestion is synchronous; scanned/image-only PDFs fail as `empty-content` (no OCR).
- No embeddings or vector database; context is bounded.
- Analysis prerequisites are deliberate (analyse course → check question → practise → revision).
- Mastery counts a self-recorded attempt; Oyevolve does not auto-grade prose.
- Live Gemini is a shared free tier: a transient 503/429 can surface as an honest retryable failure.
- The seeded demo workspace carries demo consistency/mastery until real analysis and practice replace
  them.

## UNCOMMITTED CHANGES

None. Everything is committed; `.freebuff/` (agent tooling) and the local `.tmp-scratch/` scratch
directory stay untracked by design, listed in `.gitignore`.

## FINAL SUBMISSION STATUS

**OYEVOLVE — DEPLOYED AND SUBMISSION READY.** Phases 0–12 complete; the app is live at
**https://oyevolve.vercel.app** (primary) and **https://white-whale.spcf.app** (backup), and the
primary passed a remote end-to-end verification (**70 checks, 0 failures**) covering HTTPS, headers,
storage, ingestion, Gemini course/assessment intelligence, mastery, revision, cross-learner isolation
and secret non-exposure. Every claimed capability is implemented, tested and honest about its limits.
See `docs/SUBMISSION_REPORT.md`.
