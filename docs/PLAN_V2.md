# Edvance v2 — the automatic learner loop

**Status:** planned, not implemented. Nothing in this document is built yet.
**Supersedes:** the Phase 6–9 "explicit action" stance (PRD Change 15/16/17/18) for the learner-facing
flow. The evidence-first rules that stance protected are kept — see **What does not change**.
**Requested by:** Product Owner, 2026-10-08.

---

## 1. The change, in one paragraph

Today Edvance is a set of deliberate steps: upload one file, wait for extraction, press **Analyse
course**, press **Check question**, self-record practice, press **Generate practice**. The product
becomes a loop that runs itself: drop up to ten files, and Edvance ingests them, analyses the
course, checks the assessments, builds a strengths-and-weaknesses picture, and hands the learner a
list of what to revise. The learner picks items from that list, is re-assessed on exactly those
items, and sees whether they passed, why, and how far they are from a course-level verdict — with a
year-end-recap style summary of the journey.

```
 10 files (drag & drop)
        │
        ▼
  ingest ──▶ course analysis ──▶ assessment checks        [automatic, queued, budgeted]
        │
        ▼
  the learner takes the assessment  ──▶  graded, explained
        │
        ▼
  strength / weakness picture per concept  (Mastery = the grader)
        │
        ▼
  revision list  ──▶  learner picks items  ──▶  targeted re-assessment
        ▲                                              │
        └──────────── mastery + progress update ◀───────┘
        │
        ▼
  course verdict + progress on the dashboard   ·   recap ("wrapped")
```

## 2. What does not change

These are the product's spine and the new flow must not weaken them:

- **Evidence-first.** Concepts, questions and every explanation cite real `material_chunk` evidence
  with a human-readable location. A citation that cannot be resolved is still rejected outright.
- **Honest states, never a silent failure.** Every automatic step has a visible state: queued,
  running, done, failed, or "the model's answer could not be verified — retrying / retry".
  **This is not hypothetical: the failure in the pasted screenshot ("The analysis service returned a
  response Edvance could not verify. Please try again.") is exactly the state that must never be
  silent once a human is not pressing a button.**
- **No invented verdicts.** Pass/fail and strengths/weaknesses are computed from recorded attempts by
  stated rules, then explained. A model never decides whether the learner passed.
- **No new services.** No Kafka/Redis/queues/vector DB (exclusion list), no new runtime dependency,
  no second deployment target. One Postgres, one service, one provider.
- **Learner data stays theirs.** Automatic work is per-learner, ownership-scoped, and never
  cross-reads another learner's course.

## 3. The hard constraint that shapes the design: the model budget

`specific.hcl` pins `GEMINI_MODEL = "gemini-3-flash-preview"` and notes the free tier is **20
requests/day/model**. An automatic loop can trivially spend more than that:

| Naive automatic flow                     | Calls                 |
| ---------------------------------------- | --------------------- |
| 10-file upload, analysis after each file | 10                    |
| assessment checks, ~8 questions          | 8                     |
| grading one answer at a time, 12 answers | 12                    |
| revision generation                      | 1                     |
| **total**                                | **31 in one sitting** |

So "automatic" means **coalesced, batched and budgeted**, with the queue state shown honestly:

- **Coalesce.** One pending `analyse` job per course, no matter how many files land. Enqueue on
  settle, never one per file.
- **Batch.** One model call grades the whole sitting's short answers, not one per answer.
- **Grade deterministically where possible.** Multiple-choice and true/false are graded in code —
  zero calls, zero variance.
- **Budget with an honest queue.** A per-learner daily model budget; work beyond it is _queued, not
  dropped_, and the UI says which step is waiting and when it will run. The manual **Run now** button
  stays as the escape hatch (and as the retry).
- **Say the number.** The UI reports the budget like it reports everything else: what ran, what is
  queued, what is waiting for tomorrow.

## 4. Work phases

Each phase lands as its own PR with the repo's usual gate (`npm run check`, `lint`, `format:check`,
production build) plus the phase's own verification. Phases are ordered so each is shippable.

### V2.1 — Upload 1–10 files, with drag and drop

- `components/add-material-form.tsx` becomes a drop zone (`dragover`/`drop`, `DataTransfer`) plus
  `<input multiple>`; per-file rows with name, size, state (waiting / uploading / done / failed) and a
  progress indicator without a new dependency.
- Client uploads **one file per request** (the existing route is unchanged and per-file quota checks
  stay exact), with bounded concurrency (~3) so ten files do not open ten sockets.
- One file failing does not abort the batch; the batch summary names exactly which files failed and
  why. `MAX_FILES_PER_UPLOAD = 10` lands in `lib/materials.ts` beside the existing caps (25 MB/file,
  50 files/course, 200 MB/course — unchanged).
- **Acceptance:** ten real files of mixed formats upload in one action; a deliberately oversized and
  a deliberately unsupported file are rejected per file with the others still succeeding; the course
  quota message still names the limit hit.

### V2.2 — Background work that is not a request

Extraction and analysis currently run **inside** the HTTP request (`lib/ingestion.ts` says so
explicitly). Ten uploads plus analysis cannot live in a request.

- New table `work_job` (migration `0008_work_queue.sql`): `id`, `user_id`, `course_id`, `kind`
  (`ingest` | `analyse` | `check` | `grade` | `revision`), `target_id`, `status` (`pending` |
  `running` | `done` | `failed`), `attempts`, `run_after`, `locked_at`, `error_code`,
  `error_summary`, timestamps; a coalescing rule (at most one pending job per course+kind) and an
  index for claiming work.
- A worker started from Next.js `instrumentation.ts` (`register()`) inside the one `next start`
  process that `specific.hcl` deploys: claim → run → record, bounded retries with backoff, stale-lock
  reclaim after a restart. **Plus an on-demand drain** triggered after an upload completes, so
  progress never depends on the worker loop's timing alone.
- The learner sees job state in the UI instead of a spinner that lies.
- **Acceptance:** upload → ingest → analyse → check chains with no button; killing the server
  mid-job leaves a recoverable `running` job that is reclaimed; a failing job retries and then
  reports honestly; two tabs uploading at once do not double-run analysis.

### V2.3 — Analysis and checks run automatically

- Uploading enqueues ingest; when a material settles, the course's analysis is enqueued; when the
  analysis is ready, each unchecked question is enqueued. All three keep their existing honest states
  and staleness rules (evidence fingerprint → `needs-reanalysis`).
- The "could not verify" path (model output rejected by `lib/ai/schemas.ts`) gets a bounded retry
  inside the job, and if it still fails: one plain sentence saying what could not be verified, what
  happens next, and a **Retry** action — never the dead end in the screenshot.
- The existing manual endpoints stay (renamed in the UI to **Run now** / **Retry**) so a learner is
  never blocked by the budget or by a stuck job.
- **Acceptance:** the deterministic suite covers the auto-chain; a deliberately malformed model
  response is retried and reported; the course shows `analyzing` → `ready` with no learner action.

### V2.4 — The learner answers the assessment, and it is graded

Right now questions are only _checked against the course_; nobody answers them.

- `assessment_question` gains a kind: **multiple-choice**, **true/false**, **short answer**, plus
  options and (for objective kinds) the correct option. The instructor-authored question text and its
  checked concepts/evidence are unchanged.
- Answering UI on the Assessments tab (and inside a re-assessment): one question at a time or a
  sitting, with the learner's answer persisted as an attempt.
- **Grading:** objective kinds graded in code (deterministic, free); short answers graded by the
  model **in one batched call per sitting**, strictly against the concepts and evidence that question
  was already checked against, returning a verdict per answer plus a one-sentence reason that cites
  the evidence. A verdict that cannot cite real evidence is rejected like every other model output.
- Every graded answer shows: what you answered, the verdict, why, and where the course teaches it.
- Attempts are recorded against the concepts the question tests, which is what mastery already reads.
- **Acceptance:** an MCQ set is graded with no model call at all; free-text answers are graded in one
  call per sitting; an unverifiable grade is rejected and surfaced; every verdict traceable to an
  attempt row.

### V2.5 — Mastery becomes the grader: strengths and weaknesses, explained

- The Mastery tab becomes a scored picture: per-concept status (existing rule: Untested / Weak /
  Developing / Mastered), plus **what the learner is strong on, what is weak, and why** — derived
  from the attempt history and cited to the evidence each concept came from.
- Progress over time without a chart dependency: attempts, accuracy movement, concepts that moved up
  or down since the last sitting, rendered with inline SVG in the existing design language.
- The rule stays stated on the page, as it is today: no status is asserted without the attempts
  behind it.
- **Acceptance:** strengths/weaknesses match a hand-computed fixture exactly; history renders for a
  learner with 0, 1 and many sittings; no model call is required for this page.

### V2.6 — Revision list → click → re-assess exactly that

- The Revision tab shows the list from the mastery picture, weakest first, each item naming the
  concept, the evidence that teaches it, and why it is next.
- Selecting one or more items starts a **targeted re-assessment**: the questions that already tested
  those concepts (known from `source_mapping`) plus generated practice when none exist. Generated
  practice keeps Phase 9's grounding rules.
- Completing it grades the answers (V2.4), updates mastery, and shows the **delta**: what moved, what
  did not, and what that means for the verdict.
- **Acceptance:** clicking a weak concept produces a re-assessment covering exactly that concept;
  completing it moves mastery by the stated rule; an item with no evidence teaching it is reported
  honestly instead of generating an unanswerable question.

### V2.7 — The verdict, the pass/fail explanation, and the dashboard

- **Course verdict**, computed in code from mastery coverage and assessment performance — e.g.
  `Not started` / `In progress` / `On track` / `Mastered` — with the learner-visible numbers behind
  it. A model never decides this.
- Failing (or not yet passing) comes with the explanation the request asks for: which concepts were
  wrong, what the evidence says, what was answered, what would change the outcome.
- Surfaced where the request asks: **the learner's dashboard** (the courses list `app/courses`)
  carries each course's verdict, and the course overview carries the verdict with its explanation.
- **Acceptance:** the verdict matches a hand-computed fixture; it never contradicts the mastery
  picture shown on the Mastery tab; the explanation names real attempts and real evidence.

### V2.8 — The recap ("wrapped")

- A shareable, non-vanity summary of the learner's journey in a course: concepts mastered, the gap
  they closed, attempts and accuracy, the strongest area, the thing to work on next.
- Derived from stored data; a short model-written narrative is optional and, if used, is labelled as
  written by the model and grounded in the numbers shown beside it.
- Reached from the dashboard; no new service, no image generation, renders with the existing CSS.
- **Acceptance:** every number on the recap is traceable to attempts; it renders for a learner with
  one attempt and for a learner with none (an honest empty recap, not a fake one).

## 5. Data model changes (all additive migrations)

| Migration                     | Adds                                                                                                                                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `0008_work_queue.sql`         | `work_job` table + coalescing index; job state surfaced in the course view                                                                                                                       |
| `0009_assessment_answers.sql` | `assessment_question.kind`, `options`, `correct_option`; `practice_attempt` gains `source` (`practice`/`assessment`), `selected_option`, `grader`, `reason` so mastery keeps reading one history |
| `0010_course_verdict.sql`     | only if a stored snapshot is needed for the recap; the live verdict is derived, like mastery and revision                                                                                        |

Mastery keeps derived-from-attempts. The verdict is derived. Staleness stays live. No table stores a
judgement nobody can trace.

## 6. Why not the alternatives

- **Keep analysis manual and just add the grader.** Rejected by the request: the loop is the product.
- **Run everything inline in the upload request.** Rejected: ten extractions plus analysis in one
  HTTP request; it would time out and the learner would watch a spinner.
- **A queue platform (Kafka/Redis/SQS).** Rejected — on the project's exclusion list, and one
  Postgres table is sufficient at this scale.
- **A model call per answer.** Rejected: blows a 20-call/day budget in one sitting, and makes grading
  slower than the sitting itself.
- **Let the model decide pass/fail.** Rejected: an unfalsifiable verdict is exactly the "misplaced
  confidence" Phase 12 exists to prevent.
- **Fire-and-forget promises after the response.** Rejected: a restart loses the work silently, which
  is the failure mode this plan is trying to remove.
- **Keep `npm run` scripts and the PRD as they are.** Rejected: the privacy page currently tells
  learners "Nothing is analysed automatically", and the landing page says analysis runs only when
  asked. Shipping the loop without changing those claims would make the product lie. The PRD gets a
  new Change entry recording the reversal; `app/privacy/page.tsx`, `app/page.tsx`, the README and
  `docs/EDVANCE_EXECUTION_STATE.md` change with the implementation.

## 7. Verification plan

- **Unit (existing dependency-free suite):** job claiming/coalescing/backoff, budget accounting,
  objective grading, the strength/weakness derivation, the verdict thresholds, recap arithmetic.
- **Deterministic end-to-end (`EDVANCE_AI_MOCK`):** upload 10 files → automatic chain → answer →
  grade → revise → re-assess → verdict, with rejection paths and cross-learner isolation.
- **Live provider:** one real run proving the batched short-answer grading returns evidence-cited
  reasons, and that the auto-chain behaves with the real model's error modes.
- **Remote suite:** extend `scripts/verify-remote-deployment.mjs` with the automatic loop, so the
  deployed app is verified through the flow a learner actually experiences.
- **Quota honesty check:** with the budget exhausted, the UI must say so and the queue must hold
  rather than drop work.

## 8. Decisions taken (2026-10-08, Product Owner)

These three are settled. Changing one later is a new PRD Change entry, not a tweak.

1. **The model grades written answers, grounded in the course's own evidence.** Objective kinds
   (multiple-choice, true/false) are graded in code with no model call at all; written answers are
   graded by the model in **one batched call per sitting**, strictly against the concepts and
   evidence that question was already checked against; the learner sees the verdict and the reason,
   and a reason that cannot cite real evidence rejects the whole grade response — the same rule that
   already governs every other model output.
   _Consequence:_ V2.4 adds a grade schema and validator that reuse the existing evidence-resolution
   rule rather than inventing a second one, and the batched call is what keeps grading inside the
   budget.
2. **When the budget is spent, the work queues and says so.** Nothing is dropped and nothing runs
   silently: the queue names the waiting step and when it will run, and **Run now** / **Retry** stays
   as the manual escape hatch.
   _Consequence:_ V2.2/V2.3 carry a budget ledger and expose the queue state in the UI — "queued,
   waiting for tomorrow's budget" is a real, visible state, and the quota-honesty check in §7 is a
   release gate rather than a nice-to-have.
3. **Mastery of a course is a stated coverage threshold, not a feeling.** Every concept attempted and
   at least Developing, most concepts Mastered, and recent assessment accuracy above a stated bar;
   the verdict names exactly which concepts fall short.
   _Consequence:_ V2.7 puts the threshold in one pure module with unit tests, and the verdict
   explanation lists the concepts that did not meet it instead of asserting a pass.

## 9. Build sequence (implementation plan)

Eight PRs. Each one is independently shippable and passes the repo's own gate (`npm run check`,
`lint`, `format:check`, production build) plus the verification named for it. Sizes are relative, not
promises.

**Ordering rules**

- Infrastructure before automation, automation before the data the grader needs, grader view before
  answering, answering before the loop, verdict and recap last.
- **The claims move with PR 3, not before it.** Correcting the earlier suggestion that the privacy
  page could be fixed first: it cannot. `app/privacy/page.tsx` may not claim automatic analysis
  _before the app performs it_ — that would be a lie in the other direction. The privacy page,
  landing page, README and PRD Change 23 all change in the PR that first makes analysis automatic.
- The loop is demonstrable after PR 6. PRs 7 and 8 can wait without leaving a half-product.

| #   | Phase | Scope                                                | Migration                   | Verification                  | Size |
| --- | ----- | ---------------------------------------------------- | --------------------------- | ----------------------------- | ---- |
| 1   | V2.1  | Batch upload, drop zone, per-file state              | —                           | unit + `test-batch-upload`    | M    |
| 2   | V2.2  | `work_job`, worker, coalescing, retries              | `0008_work_queue`           | unit + E2E chain + reclaim    | L    |
| 3   | V2.3  | Automatic chain, bounded retry, budget, claims       | —                           | E2E chain, retry, budget hold | M    |
| 4   | V2.5  | Mastery grader view (strengths/weaknesses, progress) | —                           | unit + fixture                | S–M  |
| 5   | V2.4  | Answering + batched evidence-grounded grading        | `0009_assessment_answers`   | unit + E2E + live             | L    |
| 6   | V2.6  | Revision → click → targeted re-assessment (delta)    | —                           | E2E loop                      | M    |
| 7   | V2.7  | Verdict, explanation, dashboard surface              | `0010` only if snapshotting | unit + fixture                | S–M  |
| 8   | V2.8  | Recap ("wrapped")                                    | —                           | unit + empty-state            | M    |

**PR 1 — batch upload (V2.1).** `components/add-material-form.tsx` becomes a drop zone with
`<input multiple>` and per-file rows; `lib/materials.ts` gains `MAX_FILES_PER_UPLOAD = 10` and a pure
`validateBatch(files, remainingQuota)` (unit-tested, no DOM); `lib/useCourses.ts` gains an upload
helper built on `XMLHttpRequest` **because `fetch` cannot report upload progress** — same error
contract as today; `app/courses/[courseId]/sources/page.tsx` renders batch state. No API change: one
file per request keeps the per-file quota checks exact. New `scripts/test-batch-upload.mjs` uploads
ten real files including one oversized and one unsupported, asserts 8 stored with per-file reasons,
then cleans up.

**PR 2 — job queue and worker (V2.2).** `db/migrations/0008_work_queue.sql`; `lib/repo/jobs.ts`
(enqueue / claim / complete / fail / reclaim / coalesce); `lib/jobs/policy.ts` as the pure,
unit-testable part (claim order, coalescing key, backoff, stale-lock threshold); a root
`instrumentation.ts` whose `register()` starts the loop; `lib/ingestion.ts` becomes a job handler
while keeping its synchronous entry point for the Retry route; the upload route enqueues instead of
ingesting inline, and calls `drainNow()` once the response is sent. **Verify the hook against
`node_modules/next/dist/docs/01-app/02-guides/instrumentation.md` before writing it** (AGENTS.md
requires reading the local docs), though the feature's presence in 16.3.6 is confirmed —
`next/dist/lib/constants.js` defines `INSTRUMENTATION_HOOK_FILENAME = 'instrumentation'`. If
`register()` proves unsuitable for a long-running loop, the fallback is a small Node entry point that
starts Next plus the worker, changing `specific.hcl`'s service command from `npm start`. This is the
highest-risk PR in the sequence and should land alone.

**PR 3 — automatic chain, honest failures, claims (V2.3).** Analyse and check handlers plus the budget
ledger in `lib/jobs/*`; a bounded retry around unverifiable model output in `lib/ai/*`; queue and
**Run now** / **Retry** surfaced on the Intelligence and Assessments tabs; and the claim sweep —
`app/privacy/page.tsx`, `app/page.tsx`, `README.md`, `Doc/PRD.md` (Change 23) and
`docs/EDVANCE_EXECUTION_STATE.md`.

**PR 4 — the grader view (V2.5), deliberately before answering.** It needs no new model call: it
reads attempts that already exist. New `lib/grader.ts` (pure: strengths, weaknesses, movement,
plain-language reasons) with unit tests over a hand-computed fixture; `app/courses/[courseId]/mastery/page.tsx`
becomes the grader view with inline-SVG progress; `lib/types.ts` grows the view types.

**PR 5 — answering and batched grading (V2.4).** `db/migrations/0009_assessment_answers.sql`;
`lib/ai/grading.ts` plus schema/prompt additions (one call per sitting, every reason cites supplied
evidence, unverifiable responses rejected); an answers route and the Assessments-tab answering UI;
`lib/mastery.ts` reads the extended attempt rows. Objective kinds must be provably free: the
verification asserts **zero model calls** for a multiple-choice sitting.

**PR 6 — the revision loop (V2.6).** Selectable items on `app/courses/[courseId]/revision/page.tsx`, a
re-assessment assembled from the questions that already tested the chosen concepts (via
`source_mapping`) plus generated practice when none exist, then the delta view. Reuses PR 5's grading.

**PR 7 — verdict, explanation, dashboard (V2.7).** New `lib/verdict.ts` (threshold in one pure module,
unit-tested), verdict chips on `app/courses/page.tsx`, verdict plus explanation on the course
overview, and the explanation enumerating the concepts that fell short.

**PR 8 — recap (V2.8).** `lib/recap.ts` (pure arithmetic, unit-tested) and
`app/courses/[courseId]/recap/page.tsx`, with an honest empty state and no new dependency.

**Deliberately not in this plan:** a queue platform, a cron service, embeddings or a vector database,
grading prose without evidence, a recap before the verdict exists, and any new UI or runtime
dependency.

**Do now, before PR 1**

1. Land PR #4 (the pre-commit hook) and settle PR #3 (`.gitattributes`). Measured this session: on
   this Windows checkout the absence of `.gitattributes` re-materialises edited files as CRLF and
   `npm run format:check` then fails until `npm run format` runs. V2 work should start from a stable
   tree.
2. Commit this plan (currently untracked) and open its PR, so the direction is reviewable and
   recorded before any code depends on it.
3. Then start PR 1.

**Risks, ranked, each with the thing that answers it**

- **The budget ledger gets cut for scope**, which is what makes automatic analysis honest. Answer:
  it is in PR 3, and the quota-honesty check in §7 is a release gate.
- **A worker that fails invisibly** is worse than a button. Answer: every job state is user-visible,
  and the reclaim test proves a restart cannot strand work.
- **Grading accuracy.** Answer: objective kinds graded in code, written answers graded only against
  evidence already attached to that question, every verdict traceable to an attempt row.
