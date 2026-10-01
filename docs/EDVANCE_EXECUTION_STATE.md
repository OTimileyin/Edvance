# Edvance — Execution State

Persistent memory for the autonomous completion run. On a bare `continue`, recover from **this
file + the repository** — never from chat memory.

---

## CURRENT PHASE

**Phase 10 — Product Completion & Hardening** (autonomous completion directive §16)

## CURRENT TASK

Phase 9 is **complete and verified**, committed as
`feat(revision): add targeted revision workflow`. Begin Phase 10: complete the product and harden it
— edit/delete for existing records, an account lifecycle, transactional email, security headers and
rate limiting, error/not-found/health routes, privacy and terms, responsiveness and accessibility, a
real test infrastructure, and a production build.

## LAST VERIFIED COMMIT

`feat(revision): add targeted revision workflow` (Phase 9). Branch `main`.
Phase 8 was `aa6f014`; Phase 7 was `2d51d6f`; Phase 6 was `2bce681`; Phase 5.6 was `f45ad5a`;
Phase 5.5 was `0e33c80`.

## COMPLETED PHASES

- Phase 0–4 — foundation, design system, core structure, Better Auth, course data in PostgreSQL.
- Phase 5.5 — Supabase Storage. Committed `0e33c80`. User-approved.
- Phase 5.6 — Text Extraction & Evidence Chunking. Committed `f45ad5a`. Verified (91 tests).
- Phase 6 — Course Intelligence. Committed `2bce681`. Deterministic **59**; live Gemini **34**.
- Phase 7 — Assessment Intelligence. Committed `2d51d6f`. Deterministic **76**.
- Phase 8 — Mastery Intelligence. Committed `aa6f014`. Deterministic **48**; no model call.
- Phase 9 — Targeted Revision. **Complete.** Deterministic **72 passed**; regressions **48**, **76**,
  **59**, **91**; typecheck exit 0; secret scan clean; DB + bucket at baseline.

## ACTIVE BLOCKERS

None.

## HUMAN ACTIONS REQUIRED

None.

## ENVIRONMENT NOTES

- `GEMINI_API_KEY` present in Infisical `dev`; `GEMINI_MODEL` pinned to `gemini-3.5-flash` in `dev`.
  Code default stays `gemini-flash-latest` with the SDK retry pinned to three attempts. Never print
  or commit either value. Live verification is only needed where a model is called (Phases 6/7;
  Phases 8/9 are deterministic or reuse the same provider).
- Phase 10 expects a `RESEND_API_KEY` for transactional email; if it is absent, the email path must
  degrade honestly (report "not configured") rather than fake a send.
- Next.js 16 allows only **one `next dev` per project directory** — stop the current server first.
- A stale route manifest 404s nested routes: `rm -rf .next` before starting a server. **Always
  `rm -f tsconfig.tsbuildinfo` before `npx tsc --noEmit`.**
- Ports: `test-ingestion.mjs` defaults to **3250**; all newer suites default to **3260**. Pass
  `BASE_URL` explicitly. One mock server serves every suite:
  `EDVANCE_AI_MOCK=simple infisical run --env=dev -- npx next dev -p 3260`.
- `ensureSeeded` only seeds a learner who owns **no** courses yet. Use a fresh learner for demo tests.
- Mastery and the revision recommendation are **derived**, never AI-set (`lib/mastery.ts`,
  `lib/revision.ts`). Only targeted-practice generation calls a model.

## NEXT AUTONOMOUS ACTION

Phase 10 — Product Completion & Hardening, per the directive §16:

1. Read the relevant Next.js 16 docs in `node_modules/next/dist/docs/` before writing code.
2. Product completion: edit/delete for courses, materials and assessment questions; an account
   lifecycle (profile / change password / delete account) with the database and storage cleaned up.
3. Hardening: security headers + a Content-Security-Policy, rate limiting, upload quotas, and
   `error.tsx` / `not-found.tsx` / a health endpoint.
4. Compliance pages: privacy and terms.
5. Responsiveness (~375 / 768 / desktop) and an accessibility pass over every shipped screen.
6. Real test infrastructure (unit/integration/E2E) in addition to the existing script suites, plus
   lint, format, typecheck and a production `next build`.
7. Transactional email via Resend (`RESEND_API_KEY`) for the account lifecycle, degrading honestly
   when unconfigured. Do **not** enable billing.
8. Full gate: `rm -f tsconfig.tsbuildinfo && npx tsc --noEmit`; the Phase 9/8/7/6/5.6 suites; a
   production build; secret scan; verify DB + bucket return to baseline.
9. Update `Doc/PRD.md` (new Change 19), `docs/IMPLEMENTATION_PLAN.md`, `README.md`,
   `conversation.md` and this file. Commit, then begin **Phase 11 — Deployment**.

## TEST STATUS

| Check | Result |
|---|---|
| `npx tsc --noEmit` (after clearing `tsconfig.tsbuildinfo`) | exit 0 |
| Phase 9 — `scripts/test-targeted-revision.mjs` | **72 passed / 0 failed** |
| Phase 8 — `scripts/test-mastery-intelligence.mjs` | **48 passed / 0 failed** |
| Phase 7 — `scripts/test-assessment-intelligence.mjs` | **76 passed / 0 failed** |
| Phase 6 — `scripts/test-course-intelligence.mjs` | **59 passed / 0 failed** |
| Phase 5.6 — `scripts/test-ingestion.mjs` | **91 passed / 0 failed** |
| Live Gemini — `scripts/verify-gemini-live.mjs` | **34 passed / 0 failed** (`gemini-3.5-flash`) |
| Secret scan | `infisical scan --redact` → no leaks found |
| Database + bucket | baseline (bucket 0 objects; `practice_attempt`/`practice_question`/`revision_plan` 0; 3 users / 4 courses / 20 materials / 20 concepts / 8 assessments / 20 mastery rows) |
| Production build | not yet run (Phase 10) |

## KNOWN LIMITATIONS

- Ingestion is synchronous, so a large PDF holds the upload request open.
- Scanned/image-only PDFs fail as `empty-content` (no OCR).
- No embeddings or vector database; context is bounded (`MAX_EVIDENCE_CHUNKS` 150,
  `MAX_EVIDENCE_CHARS` 120 000 for analysis, `MAX_PRACTICE_QUESTIONS` 12 for revision).
- A question can only be checked after its course has been analysed (409), and practised after it has
  been checked (409); targeted practice needs an analysed course (409). Deliberate — concepts must
  come from evidence.
- Mastery counts an attempt the learner records themselves; Edvance does not auto-grade prose.
- There is no edit/delete for existing records yet, and no account lifecycle — Phase 10.
- Legacy `.doc`/`.ppt` are no longer accepted (deliberate, Phase 6 cleanup).
- Live Gemini is a shared free tier: a transient 503/429 can surface as an honest "analysis failed"
  the learner can retry.
- The seeded demo workspace carries a seeded consistency narrative and demo mastery until the
  learner's first real analysis and practice replace them.

## UNCOMMITTED CHANGES

Pre-existing, deliberately untouched: `.gitignore` (`.specific`, `specific.local`), `.freebuff/`,
`db/migrations/0000_better_auth.sql`, `specific.hcl`, `CLAUDE.md`, and the local `.tmp-scratch/`
scratch directory. Everything else in the tree belongs to Phase 9.

## FINAL SUBMISSION STATUS

**Not submission ready.** Phases 10–12 remain.
