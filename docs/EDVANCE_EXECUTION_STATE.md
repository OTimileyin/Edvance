# Edvance — Execution State

Persistent memory for the autonomous completion run. On a bare `continue`, recover from **this
file + the repository** — never from chat memory.

---

## CURRENT PHASE

**Phase 11 — Deployment** (autonomous completion directive §17)

## CURRENT TASK

Phase 10 is **complete and verified**, including a production build. Begin Phase 11: inspect
`specific.hcl`, deploy to a free tier with HTTPS and managed PostgreSQL, wire Infisical-compatible
secrets, and smoke-test the deployed app end to end.

## LAST VERIFIED COMMIT

`feat: complete the product and harden it` (Phase 10). Branch `main`.
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
- Phase 10 — Product Completion & Hardening. **Complete.** Hardening suite **43**, unit **24**,
  regressions **72 / 48 / 76 / 59 / 91**, typecheck exit 0, **production build passes**, secret scan
  clean, DB + bucket at baseline.

## ACTIVE BLOCKERS

None.

## HUMAN ACTIONS REQUIRED

None.

## ENVIRONMENT NOTES

- `GEMINI_API_KEY` present in Infisical `dev`; `GEMINI_MODEL` pinned to `gemini-3.5-flash` in `dev`.
  Never print or commit either value.
- `RESEND_API_KEY` is **not** currently present. Email is used only for the account-deletion
  confirmation; the API honestly reports `emailSent: false` when it is unconfigured. If the user
  supplies a key, the flow activates without code changes (`EMAIL_FROM` overrides the sender).
- Next.js 16 allows only **one `next dev` per project directory** — stop the current server first.
- A stale route manifest 404s nested routes: `rm -rf .next` before starting a server. **Always
  `rm -f tsconfig.tsbuildinfo` before `npx tsc --noEmit`.**
- Ports: `test-ingestion.mjs` defaults to **3250**; all newer suites default to **3260**. Pass
  `BASE_URL` explicitly. One mock server serves every suite:
  `EDVANCE_AI_MOCK=simple infisical run --env=dev -- npx next dev -p 3260`.
- Production build needs env injected: `infisical run --env=dev -- npx next build` (module-level
  `assertEnv` runs while routes are collected).
- **Deployment reads `specific.hcl`** (untracked, deliberately untouched so far). Inspect it before
  deploying; it is the configured deployment spec.
- Unit tests run the TypeScript directly under Node's type-stripping loader. **Do not add TypeScript
  parameter properties / enums / namespaces to modules under `tests/unit`** — they are unsupported
  by stripping.

## NEXT AUTONOMOUS ACTION

Phase 11 — Deployment, per the directive §17:

1. Read `specific.hcl` and the relevant Next.js 16 deployment docs in `node_modules/next/dist/docs/`.
2. Deploy on a **free tier only** (no billing), with HTTPS and managed PostgreSQL. Do not add any
   service on the excluded list (Kubernetes, Kafka, Redis, complex queues, vector DB, etc.).
3. Provide the same secrets the app already reads (`DATABASE_URL`, `BETTER_AUTH_SECRET`,
   `BETTER_AUTH_URL`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`,
   `SUPABASE_STORAGE_BUCKET`, optionally `RESEND_API_KEY`/`EMAIL_FROM`) through a mechanism the app
   accepts; never commit them.
4. Run migrations against the managed database, then smoke-test the deployed app end to end:
   sign-up/sign-in, upload, analysis, assessment check, practice, revision, edit/delete, health,
   headers.
5. Update `Doc/PRD.md` (new Change 20), `docs/IMPLEMENTATION_PLAN.md`, `README.md`,
   `conversation.md` and this file. Commit, then begin **Phase 12 — Submission Readiness**.

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

- **ESLint and Prettier are not configured.** Static guarantees are `tsc --noEmit`, the unit suite
  and the end-to-end suites. A deliberate, documented gap.
- Rate limiting is **in-memory per process**; a multi-instance deployment would need a shared store.
- Ingestion is synchronous, so a large PDF holds the upload request open; scanned/image-only PDFs
  fail as `empty-content` (no OCR).
- No embeddings or vector database; context is bounded (`MAX_EVIDENCE_CHUNKS` 150,
  `MAX_EVIDENCE_CHARS` 120 000; `MAX_PRACTICE_QUESTIONS` 12).
- Analysis prerequisites are deliberate: a course must be analysed before a question can be checked,
  a question must be checked before it can be practised, and revision needs an analysed course.
- Mastery counts an attempt the learner records themselves; Edvance does not auto-grade prose.
- Live Gemini is a shared free tier: a transient 503/429 can surface as an honest "analysis failed"
  the learner can retry.
- The seeded demo workspace carries a seeded consistency narrative and demo mastery until the
  learner's first real analysis and practice replace them.

## UNCOMMITTED CHANGES

Pre-existing, deliberately untouched: `.gitignore` (`.specific`, `specific.local`), `.freebuff/`,
`db/migrations/0000_better_auth.sql`, `specific.hcl`, `CLAUDE.md`, and the local `.tmp-scratch/`
scratch directory. Everything else in the tree belongs to Phase 10.

## FINAL SUBMISSION STATUS

**Not submission ready.** Phases 11–12 remain.
