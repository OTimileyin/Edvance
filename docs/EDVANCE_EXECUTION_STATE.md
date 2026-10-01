# Edvance — Execution State

Persistent memory for the autonomous completion run. On a bare `continue`, recover from **this
file + the repository** — never from chat memory.

---

## CURRENT PHASE

**Phase 8 — Mastery Intelligence** (autonomous completion directive §14)

## CURRENT TASK

Phase 7 is **complete and committed**, including the live Gemini verification. Begin Phase 8: turn
practice attempts into evidence-based mastery. Add `practice_attempt`, derive mastery per learner per
concept, and use the states **Untested / Weak / Developing / Mastered** — never an AI-set mastery.

## LAST VERIFIED COMMIT

`feat(assessment): build evidence-grounded assessment intelligence` (Phase 7). Branch `main`.
Phase 6 was `2bce681`; Phase 5.6 was `f45ad5a`; Phase 5.5 was `0e33c80`.

## COMPLETED PHASES

- Phase 0–4 — foundation, design system, core structure, Better Auth, course data in PostgreSQL.
- Phase 5.5 — Supabase Storage. Committed `0e33c80`. User-approved.
- Phase 5.6 — Text Extraction & Evidence Chunking. Committed `f45ad5a`. Verified (91 tests).
- Phase 6 — Course Intelligence. Committed `2bce681`. Deterministic **59**; live Gemini **26**
  (before the Phase 7 extension, which now reports **34**); Phase 5.6 regression **91**.
- Phase 7 — Assessment Intelligence. **Complete.** Deterministic **76 passed**; live Gemini
  **34 passed** (now includes the assessment); regressions **59** and **91**; typecheck exit 0.

## ACTIVE BLOCKERS

None.

## HUMAN ACTIONS REQUIRED

None.

## ENVIRONMENT NOTES

- `GEMINI_API_KEY` present in Infisical `dev`; `GEMINI_MODEL` pinned to `gemini-3.5-flash` in `dev`
  (the `-latest` alias was intermittently capacity-limited). Code default stays `gemini-flash-latest`
  with the SDK retry pinned to three attempts. Never print or commit either value.
- Gemini free-tier quota is **per model**; prefer one analysis per verification run.
- Next.js 16 allows only **one `next dev` per project directory** — stop the current server first.
- A stale route manifest 404s nested routes: `rm -rf .next` before starting a server. **Always
  `rm -f tsconfig.tsbuildinfo` before `npx tsc --noEmit`** — a stale incremental cache produced a
  false "clean" result during Phase 7.
- Ports: `test-ingestion.mjs` defaults to **3250**; `test-course-intelligence.mjs`,
  `test-assessment-intelligence.mjs` and `verify-gemini-live.mjs` default to **3260**. Pass
  `BASE_URL` explicitly.
- `ensureSeeded` only seeds a learner who owns **no** courses yet — a test that creates a course
  before checking demo content will find no demo workspace. Use a fresh learner.
- Mock-phrasing assertions are brittle: the deterministic provider writes numerals (`5`), the real
  model writes prose (`five`).

## NEXT AUTONOMOUS ACTION

Phase 8 — Mastery Intelligence, per the directive §14:

1. Read the relevant Next.js 16 docs in `node_modules/next/dist/docs/` before writing code.
2. Add `practice_attempt` (learner, course, assessment question and/or concept, the answer, whether
   it was correct, when) via a new migration. Mastery must be derived from real attempts, never set
   by a model.
3. Keep the existing `mastery_state` contract (`user_id`, `concept_id`, `status`, `score`) and the
   **Untested / Weak / Developing / Mastered** vocabulary; the Mastery tab already renders it and
   `ConceptStatus` already includes `"Untested"`.
4. Make mastery traceable: every status change should be explainable from the attempts behind it,
   and a concept with no attempts stays `Untested`.
5. If AI is involved at all, it may only *explain* a mastery result that was computed from attempts
   — it must never assign one. Prefer no model call unless it adds real value; if added, follow the
   Phase 6/7 pattern exactly (server-only, explicit action, strict validation, bounded cost).
6. Extend the golden FATHOM fixture: a practice attempt that answers the six-versus-five question
   wrongly should move a concept to Weak/Developing, and correct answers should move it up.
7. Deterministic tests (new `scripts/test-mastery-intelligence.mjs` + `npm run test:mastery`) and,
   where a model is used, a live-Gemini check. Then the full gate: `rm -f tsconfig.tsbuildinfo &&
   npx tsc --noEmit`; the Phase 7, Phase 6 and Phase 5.6 suites; secret scan; verify DB + bucket
   return to baseline.
8. Update `Doc/PRD.md` (new Change 17), `docs/IMPLEMENTATION_PLAN.md`, `README.md`,
   `conversation.md` and this file. Commit `feat(mastery): add practice-based mastery intelligence`,
   then begin **Phase 9 — Targeted Revision**.

## TEST STATUS

| Check | Result |
|---|---|
| `npx tsc --noEmit` (after clearing `tsconfig.tsbuildinfo`) | exit 0 |
| Phase 7 — `scripts/test-assessment-intelligence.mjs` | **76 passed / 0 failed** |
| Phase 6 — `scripts/test-course-intelligence.mjs` | **59 passed / 0 failed** |
| Phase 5.6 — `scripts/test-ingestion.mjs` | **91 passed / 0 failed** |
| Live Gemini — `scripts/verify-gemini-live.mjs` | **34 passed / 0 failed** (`gemini-3.5-flash`) |
| Secret scan | `infisical scan --redact` → no leaks found |
| Database + bucket | returned to baseline (bucket 0 objects; 3 users / 4 courses / 20 materials / 20 concepts / 8 assessments) |
| Production build | not yet run (Phase 10) |

## KNOWN LIMITATIONS

- Ingestion is synchronous, so a large PDF holds the upload request open.
- Scanned/image-only PDFs fail as `empty-content` (no OCR).
- No embeddings or vector database; context is bounded (`MAX_EVIDENCE_CHUNKS` 150,
  `MAX_EVIDENCE_CHARS` 120 000).
- A question can only be checked after its course has been analysed (409 otherwise) — deliberate,
  because concepts must come from evidence.
- Legacy `.doc`/`.ppt` are no longer accepted (deliberate, Phase 6 cleanup).
- Live Gemini is a shared free tier: a transient 503/429 can still surface as an honest
  "analysis failed" the learner can retry.
- The seeded demo workspace still carries a seeded course-level consistency narrative until the
  learner's first real question analysis replaces it.

## UNCOMMITTED CHANGES

After the Phase 7 commit, only pre-existing, deliberately untouched files remain: `.gitignore`
(`.specific`, `specific.local`), `.freebuff/`, `db/migrations/0000_better_auth.sql`, `specific.hcl`,
`CLAUDE.md`, and the local `.tmp-scratch/` scratch directory.

## FINAL SUBMISSION STATUS

**Not submission ready.** Phases 8–12 remain.
