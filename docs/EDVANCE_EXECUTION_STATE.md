# Edvance — Execution State

Persistent memory for the autonomous completion run. On a bare `continue`, recover from **this
file + the repository** — never from chat memory.

---

## CURRENT PHASE

**Phase 7 — Assessment Intelligence** (autonomous completion directive §13)

## CURRENT TASK

Phase 6 is **complete and committed**, including the real Google Gemini call. Begin Phase 7:
connect assessment questions to the course's extracted concepts, its sources and a consistency
check, and surface a per-question signature in the UI.

## LAST VERIFIED COMMIT

`feat(ai): add evidence-grounded course intelligence` (Phase 6). Branch `main`.
Phase 5.6 was `f45ad5a`; Phase 5.5 was `0e33c80`.

## COMPLETED PHASES

- Phase 0–4 — foundation, design system, core structure, Better Auth, course data in PostgreSQL.
- Phase 5.5 — Supabase Storage. Committed `0e33c80`. User-approved.
- Phase 5.6 — Text Extraction & Evidence Chunking. Committed `f45ad5a`. Verified (91 tests).
- Phase 6 — Course Intelligence. **Complete.** Deterministic-provider suite **59 passed**; live
  Google Gemini acceptance **26 passed**; Phase 5.6 regression **91 passed**; typecheck exit 0.

## ACTIVE BLOCKERS

None.

## HUMAN ACTIONS REQUIRED

None.

## ENVIRONMENT NOTES (learned during Phase 6)

- `GEMINI_API_KEY` is present in the Infisical `dev` environment. Never print or commit it.
- `GEMINI_MODEL` is pinned to `gemini-3.5-flash` in Infisical `dev`; the `gemini-flash-latest`
  alias was intermittently 503 (capacity) during verification. The code default stays
  `gemini-flash-latest` and the SDK retry policy is pinned to a bounded three attempts.
- Gemini free-tier quota is **per model**. Exhausting one model's quota (429) does not block
  another; prefer a single analysis per verification run.
- Next.js 16 allows only **one `next dev` server per project directory**. Stop the current server
  before starting another.
- A stale route manifest makes nested `…/materials/[materialId]/…` routes 404: `rm -rf .next`
  before starting a server, and expect the first `/signin` request to take a few seconds.
- `scripts/test-ingestion.mjs` defaults to port **3250**; pass `BASE_URL` explicitly.
- `scripts/test-course-intelligence.mjs` and `verify-gemini-live.mjs` default to **3260**.

## NEXT AUTONOMOUS ACTION

Phase 7 — Assessment Intelligence, per the directive §13:

1. Read the relevant Next.js 16 docs in `node_modules/next/dist/docs/` before writing code.
2. Wire the existing-but-unused `addSourceMapping`/`listSourceMappings` in `lib/repo/courses.ts`
   so an assessment question is linked to the concepts and sources it touches.
3. Add the assessment-analysis endpoint — `POST /api/courses/[courseId]/assessments/[assessmentId]/analyse`
   — following the Phase 6 pattern exactly: auth → ownership → evidence → bounded prompt → Gemini
   → strict validation → reference resolution → transactional persistence. One provider, one
   explicit learner action, no calls on page refresh.
4. Consistency states: `CONSISTENT` / `POSSIBLE_INCONSISTENCY` / `INSUFFICIENT_EVIDENCE`, stored in
   `consistency_finding` and shown honestly. A possible inconsistency must cite the exact
   question wording and the exact course evidence that disagrees — never an invented one.
5. Reuse the **FATHOM** golden fixture from `scripts/test-course-intelligence.mjs`: the seeded
   assessment asks for **five** components while the material teaches **six**, which is the
   canonical six-versus-five inconsistency.
6. Build the per-question UI signature (state, what is tested, where it was taught, agreement).
7. Deterministic-provider tests plus a live-Gemini acceptance run, then the full gate:
   `npx tsc --noEmit`; `scripts/test-course-intelligence.mjs`; `scripts/test-ingestion.mjs`;
   secret scan; verify DB + bucket return to baseline.
8. Update `Doc/PRD.md` (new Change 16), `docs/IMPLEMENTATION_PLAN.md`, `README.md`,
   `conversation.md` and this file. Commit `feat(assessment): build evidence-grounded assessment
   intelligence`, then begin **Phase 8 — Mastery Intelligence**.

## TEST STATUS

| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| Phase 6 — `scripts/test-course-intelligence.mjs` | **59 passed / 0 failed** (deterministic provider) |
| Phase 6 — `scripts/verify-gemini-live.mjs` | **26 passed / 0 failed** (live `gemini-3.5-flash`) |
| Phase 5.6 regression — `scripts/test-ingestion.mjs` | **91 passed / 0 failed** |
| Secret scan | `infisical scan --redact` → no leaks found |
| Database + bucket | returned to baseline (bucket 0 objects; 3 users / 4 courses / 20 materials) |
| Production build | not yet run (Phase 10) |

## KNOWN LIMITATIONS

- Ingestion is synchronous, so a large PDF holds the upload request open.
- Scanned/image-only PDFs fail as `empty-content` (no OCR).
- No embeddings or vector database; context is bounded (`MAX_EVIDENCE_CHUNKS` 150,
  `MAX_EVIDENCE_CHARS` 120 000).
- Knowledge only exists once a course has real uploaded materials; demo workspaces are correctly
  reported as `insufficient-evidence`.
- Legacy `.doc`/`.ppt` are no longer accepted (deliberate, Phase 6 cleanup).
- Live Gemini is a shared free tier: a transient 503/429 can still surface as an honest
  "analysis failed" the learner can retry.

## UNCOMMITTED CHANGES

After the Phase 6 commit, only pre-existing, deliberately untouched files remain untracked/
modified: `.gitignore` (`.specific`, `specific.local`), `.freebuff/`, `db/migrations/0000_better_auth.sql`,
`specific.hcl`, `CLAUDE.md`, and the local `.tmp-scratch/` scratch directory.

## FINAL SUBMISSION STATUS

**Not submission ready.** Phases 7–12 remain.
