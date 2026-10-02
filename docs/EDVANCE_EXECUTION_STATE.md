# Edvance — Execution State

Persistent memory for the autonomous completion run. On a bare `continue`, recover from **this
file + the repository** — never from chat memory.

---

## CURRENT PHASE

**Phase 12 — Submission Readiness** (autonomous completion directive §18)

## CURRENT TASK

Phase 11 is **prepared and documented but not executed** — the deploy is a pending human action (see
below). Begin Phase 12: run an adversarial audit and a no-fake-feature sweep, execute the full test
gate, write `docs/SUBMISSION_REPORT.md`, walk the app manually, and declare Edvance submission ready
— carrying the deployment as an explicit pending human action rather than a claimed success.

## LAST VERIFIED COMMIT

`fb96dc2` — `feat: complete the product and harden it` (Phase 10). Branch `main`.
Phase 9 was `3d7b818`; Phase 8 was `aa6f014`; Phase 7 was `2d51d6f`; Phase 6 was `2bce681`;
Phase 5.6 was `f45ad5a`; Phase 5.5 was `0e33c80`. (Phase 11's spec/doc changes are committed with it.)

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
- Phase 11 — Deployment. **Specification complete; deploy not executed.** `specific.hcl` declares
  every secret the app reads and points the health check at `/api/health`; the procedure is
  documented in `README.md`. Blocked on platform credentials (human action).

## ACTIVE BLOCKERS

None for Phase 12. The following remains a **pending human action**, not a blocker to submission
readiness:

- **Deployment execution** (Phase 11): the `specific` CLI is not installed and no deployment
  credentials exist. The Product Owner chose to prepare the deploy without running it. Nothing
  external was created.

## HUMAN ACTIONS REQUIRED

1. **Run the deployment** when ready: install and authenticate the Specific CLI, set the operator
   secrets (`gemini_api_key`, `supabase_url`, `supabase_secret_key`, `supabase_storage_bucket`, and
   optionally `resend_api_key`/`email_from`), then `specific deploy`. The exact steps are in the
   README's Deployment section. The `pre_deploy` step runs migrations automatically.
2. Confirm the deployment target (project name, region) and that a free tier with managed PostgreSQL
   and HTTPS is acceptable. Do not enable billing.

## ENVIRONMENT NOTES

- `GEMINI_API_KEY` present in Infisical `dev`; `GEMINI_MODEL` pinned to `gemini-3.5-flash` in `dev`
  and in `specific.hcl`. Never print or commit either value.
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
- `specific.hcl` is now committed (Phase 11). It contains no secret values, only references and one
  platform-generated secret.

## NEXT AUTONOMOUS ACTION

Phase 12 — Submission Readiness, per the directive §18:

1. **Adversarial audit.** Walk every route and API; try to make the app lie, invent evidence, hide a
   failure, or cross a user boundary. Record what holds and what does not.
2. **No-fake-feature sweep.** `grep -rinE "mock|demo|hardcoded|todo|fixme|placeholder|fake|seed"` over
   the app and confirm every hit is legitimate (seeded demo content, the env-gated test provider,
   documentation) — never a stubbed feature presented as real. Confirm the mock provider is refused in
   production.
3. **Full test gate.** `rm -f tsconfig.tsbuildinfo && npx tsc --noEmit`; `npm run test:unit`; the
   Phase 10/9/8/7/6/5.6 suites; the live Gemini check if the quota allows; `npx next build`; secret
   scan; DB + bucket back to baseline.
4. **Write `docs/SUBMISSION_REPORT.md`** — scope, what is real, what is deliberately limited, the
   verification results, and the pending deployment action.
5. **Manual walkthrough** of the shipped screens (landing → sign-up → course → sources → intelligence
   → assessments → mastery → revision → account), checking responsive layout and accessibility.
6. Update `Doc/PRD.md`, `docs/IMPLEMENTATION_PLAN.md`, `README.md`, `conversation.md` and this file,
   then state **EDVANCE — SUBMISSION READY** (with deployment as the one outstanding human action).
   Commit `docs: add submission readiness report`.

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
| Production build — `infisical run --env=dev -- npx next build` | **passes** (13 static pages) |
| Secret scan | `infisical scan --redact` → no leaks found |
| Database + bucket | baseline (bucket 0 objects; `practice_attempt`/`practice_question`/`revision_plan` 0; 3 users / 4 courses / 20 materials / 20 concepts / 8 assessments / 20 mastery rows) |

## KNOWN LIMITATIONS

- **Deployment is prepared but not executed** (Phase 11) — pending platform credentials.
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

**Not yet declared.** Phase 12 remains.
