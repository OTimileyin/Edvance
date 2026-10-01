# Edvance — Execution State

Persistent memory for the autonomous completion run. On a bare `continue`, recover from **this
file + the repository** — never from chat memory.

---

## CURRENT PHASE

**Phase 9 — Targeted Revision** (autonomous completion directive §15)

## CURRENT TASK

Phase 8 is **complete and verified**, committed as
`feat(mastery): add practice-based mastery intelligence`. Begin Phase 9: turn evidence and mastery
into the smallest useful next action — recommend revision from the learner's weak/untested concepts,
and generate targeted practice from weak areas rather than at random.

## LAST VERIFIED COMMIT

`feat(mastery): add practice-based mastery intelligence` (Phase 8). Branch `main`.
Phase 7 was `2d51d6f`; Phase 6 was `2bce681`; Phase 5.6 was `f45ad5a`; Phase 5.5 was `0e33c80`.

## COMPLETED PHASES

- Phase 0–4 — foundation, design system, core structure, Better Auth, course data in PostgreSQL.
- Phase 5.5 — Supabase Storage. Committed `0e33c80`. User-approved.
- Phase 5.6 — Text Extraction & Evidence Chunking. Committed `f45ad5a`. Verified (91 tests).
- Phase 6 — Course Intelligence. Committed `2bce681`. Deterministic **59**; live Gemini **34**
  (after the Phase 7 extension); Phase 5.6 regression **91**.
- Phase 7 — Assessment Intelligence. Committed `2d51d6f`. Deterministic **76**; live Gemini **34**.
- Phase 8 — Mastery Intelligence. **Complete.** Deterministic **48 passed**; regressions **76**,
  **59**, **91**; typecheck exit 0; secret scan clean; DB + bucket at baseline. **No model call.**

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
  `rm -f tsconfig.tsbuildinfo` before `npx tsc --noEmit`.**
- Ports: `test-ingestion.mjs` defaults to **3250**; `test-course-intelligence.mjs`,
  `test-assessment-intelligence.mjs`, `test-mastery-intelligence.mjs` and `verify-gemini-live.mjs`
  default to **3260**. Pass `BASE_URL` explicitly. A mock server serves all four suites:
  `EDVANCE_AI_MOCK=simple infisical run --env=dev -- npx next dev -p 3260`.
- `ensureSeeded` only seeds a learner who owns **no** courses yet — a test that creates a course
  before checking demo content will find no demo workspace. Use a fresh learner.
- Mastery is **derived**, never AI-set: `lib/mastery.ts` implements the one deterministic rule.
  `practice_attempt` is the source of truth; `mastery_state` is the materialised result (with
  `attempt_count`/`correct_count`/`last_attempt_at`). Do not add a model call to mastery.

## NEXT AUTONOMOUS ACTION

Phase 9 — Targeted Revision, per the directive §15:

1. Read the relevant Next.js 16 docs in `node_modules/next/dist/docs/` before writing code.
2. Recommend the smallest useful next action from the learner's weak/untested concepts, grounded in
   the course's own evidence (Phase 6 concepts + Phase 8 mastery).
3. Generate targeted practice questions focused on weak/untested areas — not random across the
   course. If a model is used, follow the Phase 6/7 pattern exactly (server-only, explicit action,
   strict validation against the concepts actually supplied, bounded cost, honest
   `insufficient-evidence`), reusing the golden FATHOM fixture.
4. Extend the deterministic suite and, where a model is used, the live-Gemini check. Then the full
   gate: `rm -f tsconfig.tsbuildinfo && npx tsc --noEmit`; the Phase 8, 7, 6 and 5.6 suites; secret
   scan; verify DB + bucket return to baseline.
5. Update `Doc/PRD.md` (new Change 18), `docs/IMPLEMENTATION_PLAN.md`, `README.md`,
   `conversation.md` and this file. Commit `feat(revision): add targeted revision workflow`, then
   begin **Phase 10 — Product Completion & Hardening**.

## TEST STATUS

| Check | Result |
|---|---|
| `npx tsc --noEmit` (after clearing `tsconfig.tsbuildinfo`) | exit 0 |
| Phase 8 — `scripts/test-mastery-intelligence.mjs` | **48 passed / 0 failed** |
| Phase 7 — `scripts/test-assessment-intelligence.mjs` | **76 passed / 0 failed** |
| Phase 6 — `scripts/test-course-intelligence.mjs` | **59 passed / 0 failed** |
| Phase 5.6 — `scripts/test-ingestion.mjs` | **91 passed / 0 failed** |
| Live Gemini — `scripts/verify-gemini-live.mjs` | **34 passed / 0 failed** (`gemini-3.5-flash`) |
| Secret scan | `infisical scan --redact` → no leaks found |
| Database + bucket | baseline (bucket 0 objects; `practice_attempt` 0; 3 users / 4 courses / 20 materials / 20 concepts / 8 assessments / 20 mastery rows) |
| Production build | not yet run (Phase 10) |

## KNOWN LIMITATIONS

- Ingestion is synchronous, so a large PDF holds the upload request open.
- Scanned/image-only PDFs fail as `empty-content` (no OCR).
- No embeddings or vector database; context is bounded (`MAX_EVIDENCE_CHUNKS` 150,
  `MAX_EVIDENCE_CHARS` 120 000).
- A question can only be checked after its course has been analysed (409 otherwise), and can only be
  practised after it has been checked (409 otherwise) — deliberate, because concepts must come from
  evidence.
- Mastery counts an attempt the learner records themselves; Edvance does not auto-grade prose.
  Self-reported correctness is deliberate for Phase 8 and keeps the profile free of AI assertions.
- Legacy `.doc`/`.ppt` are no longer accepted (deliberate, Phase 6 cleanup).
- Live Gemini is a shared free tier: a transient 503/429 can still surface as an honest
  "analysis failed" the learner can retry.
- The seeded demo workspace still carries a seeded course-level consistency narrative and demo
  mastery until the learner's first real analysis and practice replace them.

## UNCOMMITTED CHANGES

Pre-existing, deliberately untouched: `.gitignore` (`.specific`, `specific.local`), `.freebuff/`,
`db/migrations/0000_better_auth.sql`, `specific.hcl`, `CLAUDE.md`, and the local `.tmp-scratch/`
scratch directory. Everything else in the tree belongs to Phase 8.

## FINAL SUBMISSION STATUS

**Not submission ready.** Phases 9–12 remain.
