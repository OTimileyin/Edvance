# Edvance — Execution State

Persistent memory for the autonomous completion run. On a bare `continue`, recover from **this
file + the repository** — never from chat memory.

---

## CURRENT PHASE

**Phase 11 — Deployment — COMPLETE.** Edvance is deployed at https://white-whale.spcf.app.

**Second deployment target (Vercel) — prepared, not live.** `vercel.json`, the `POSTGRES_URL`
fallback, the runbook and the two-deployment diff tooling are on `main`, but the Vercel project has
no production deployment — its domain returns `DEPLOYMENT_NOT_FOUND`. Specific remains the live
deployment. See "SECOND DEPLOYMENT TARGET" below.

## CURRENT TASK

Nothing is in flight. **EDVANCE — DEPLOYED AND SUBMISSION READY.** Phases 0–12 are complete; the
deployment ran and passed a remote end-to-end verification (69 checks, 0 failures) covering HTTPS,
headers, storage, ingestion, Gemini course/assessment intelligence, mastery, revision, cross-learner
isolation and secret non-exposure. The submission deliverable is `docs/SUBMISSION_REPORT.md`.

If a further change is requested, resume from this file and the repository — not from chat memory —
and re-run the gate before claiming anything new.

## LAST VERIFIED COMMIT

`756c4fb` — `feat(deploy): diff two deployments check by check and record the second target`. Branch `main`.
The remote suite was run against this commit's script: Specific **69 passed / 0 failed**, and the
two-deployment diff mode was exercised against the not-yet-live Vercel host (**16 passed / 53 failed**).
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
  run on native Windows) to project `edvance` (`proj_0vqsej2psy3sy4tr`), environment `prod`, active
  deployment `depl_02f4368hqt4n86q6` at **https://white-whale.spcf.app**. All 8 migrations applied;
  `/api/health` returns `200` with database/ai/storage healthy (`email: not-configured`). The `build`
  block gained build-only placeholder env (see ENVIRONMENT NOTES); `GEMINI_MODEL` is pinned to
  `gemini-3-flash-preview`. Remote verification: **69 checks, 0 failures**.
- Phase 12 — Submission Readiness. **Complete.** Edvance declared submission ready: adversarial
audit held, no-fake-feature sweep clean, four stale product claims found and fixed, full gate green
(typecheck, unit 24, end-to-end 43/72/48/76/59/91, live Gemini 34, production build, secret scan,
baseline), `docs/SUBMISSION_REPORT.md` written.

## SECOND DEPLOYMENT TARGET

**Vercel — prepared, not yet live.** The repository supports a second, independent deployment on
Vercel (`vercel.json` build command, `POSTGRES_URL` fallback, `docs/VERCEL_DEPLOYMENT_RUNBOOK.md`).
The Vercel project currently has **no successful production deployment**: its domain answers with
`DEPLOYMENT_NOT_FOUND` and it has served zero requests. `npm run verify:remote:diff -- <urlA> <urlB>`
reports 16 passed / 53 failed against it versus Specific's 69 / 0 — every difference downstream of
nothing being served. To finish: connect Vercel Postgres in the dashboard and redeploy the latest
`main`, then require 69/0 before recording it as live. **Specific stays the live, submission
deployment until then.**

## ACTIVE BLOCKERS

None.

## HUMAN ACTIONS REQUIRED

None — the deployment is live and everything verified. Two optional, non-blocking notes:

1. **Gemini quota.** The operator's key is on the free tier (20 requests/day/model). A busy day can
   exhaust the pinned model. To change it, edit `GEMINI_MODEL` in `specific.hcl`, update it in
   Infisical `dev`, and redeploy; a key with quota removes the limit.
2. **Test residue.** The production database still holds a pre-existing `verify-e2e@edvance.test`
   account (2 courses) created by the earlier Oct-1 deploy verification, not by this run. Harmless;
   delete it from https://dashboard.specific.dev if a clean database is preferred.
3. **Optional second deployment.** To bring the prepared Vercel target live, connect Vercel Postgres
   and redeploy the latest `main` (see `docs/VERCEL_DEPLOYMENT_RUNBOOK.md`). Not required for the
   submission; Specific is live.

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
  `EDVANCE_AI_MOCK=simple infisical run --env=dev -- npx next dev -p 3260`.
- Production build needs env injected: `infisical run --env=dev -- npx next build`.
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
3. Start one mock dev server (`EDVANCE_AI_MOCK=simple infisical run --env=dev -- npx next dev -p 3260`)
   and run the Phase 10 / 9 / 8 / 7 / 6 / 5.6 suites with `BASE_URL=http://localhost:3260`.
4. `infisical run --env=dev -- npx next build`, and once with only the `specific.hcl` build-arg
   placeholders to reproduce the platform builder.
5. If the app changed, redeploy from WSL and re-run the remote suite:
   `BASE_URL=https://white-whale.spcf.app node scripts/verify-remote-deployment.mjs`.
6. Confirm the secret scan is clean and the database + bucket are back to baseline.
7. Update `Doc/PRD.md` (a new Change), `docs/IMPLEMENTATION_PLAN.md`, `README.md`,
   `conversation.md` (a new Episode), `docs/SUBMISSION_REPORT.md` and this file, then commit.

## TEST STATUS

| Check | Result |
|---|---|
| `npx tsc --noEmit` (after clearing `tsconfig.tsbuildinfo`) | exit 0 |
| Unit — `npm run test:unit` (`tests/unit/*.test.mjs`) | **24 passed / 0 failed** |
| Phase 10 — `scripts/test-product-hardening.mjs` | **43 passed / 0 failed** |
| Phase 9 — `scripts/test-targeted-revision.mjs` | **72 passed / 0 failed** |
| Phase 8 — `scripts/test-mastery-intelligence.mjs` | **48 passed / 0 failed** |
| Phase 7 — `scripts/test-assessment-intelligence.mjs` | **76 passed / 0 failed** |
| Phase 6 — `scripts/test-course-intelligence.mjs` | **59 passed / 0 failed** |
| Phase 5.6 — `scripts/test-ingestion.mjs` | **91 passed / 0 failed** |
| Live Gemini — `scripts/verify-gemini-live.mjs` | **34 passed / 0 failed** (`gemini-3.5-flash`) |
| Remote deployed — `scripts/verify-remote-deployment.mjs` | **69 passed / 0 failed** (`gemini-3-flash-preview`, https://white-whale.spcf.app) |
| Production build — `infisical run --env=dev -- npx next build` | **passes** (13 static pages) |
| Secret scan | `infisical scan --redact` → no leaks found |
| Database + bucket | baseline (bucket 0 objects; `practice_attempt`/`practice_question`/`revision_plan` 0; 3 users / 4 courses / 20 materials / 20 concepts / 8 assessments / 20 mastery rows) |

## KNOWN LIMITATIONS

- **Deployed** at https://white-whale.spcf.app (Specific). The Gemini free tier is 20
  requests/day/model, so a burst can surface as an honest, retryable provider failure.
- **ESLint and Prettier are not configured.** Static guarantees are `tsc --noEmit`, the unit suite
  and the end-to-end suites.
- Rate limiting is **in-memory per process**; a multi-instance deployment would need a shared store.
- Ingestion is synchronous; scanned/image-only PDFs fail as `empty-content` (no OCR).
- No embeddings or vector database; context is bounded.
- Analysis prerequisites are deliberate (analyse course → check question → practise → revision).
- Mastery counts a self-recorded attempt; Edvance does not auto-grade prose.
- Live Gemini is a shared free tier: a transient 503/429 can surface as an honest retryable failure.
- The seeded demo workspace carries demo consistency/mastery until real analysis and practice replace
  them.

## UNCOMMITTED CHANGES

Pre-existing, deliberately untouched: `.gitignore` (`.specific`, `specific.local`), `.freebuff/`,
`db/migrations/0000_better_auth.sql`, `CLAUDE.md`, and the local `.tmp-scratch/` scratch directory.
(`specific.hcl` is now tracked, committed with Phase 11.)

## FINAL SUBMISSION STATUS

**EDVANCE — DEPLOYED AND SUBMISSION READY.** Phases 0–12 complete; the app is live at
**https://white-whale.spcf.app** and passed a remote end-to-end verification (69 checks, 0 failures)
covering HTTPS, headers, storage, ingestion, Gemini course/assessment intelligence, mastery,
revision, cross-learner isolation and secret non-exposure. Every claimed capability is implemented,
tested and honest about its limits. See `docs/SUBMISSION_REPORT.md`.
