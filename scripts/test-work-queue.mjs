// Oyevolve V2.2 — the work queue, against a real PostgreSQL.
//
//   DATABASE_URL=postgres://… node scripts/test-work-queue.mjs
//
// `lib/jobs/policy.ts` is covered by unit tests, but the rules that matter most
// here cannot be: a partial unique index is what makes coalescing survive two
// simultaneous uploads, `for update skip locked` is what makes two workers take
// different jobs, and a cascade is what stops a deleted course's work from
// running against a row that is gone. Those are properties of the schema and the
// statements, so they are asserted against the database itself.
//
// The queue's own tables are created by `0008_work_queue.sql`; run
// `node scripts/migrate.mjs` first. The suite creates one throwaway learner and
// deletes it at the end, which is also the cascade check.

import { Client } from "pg";

import { registerAppImports } from "../tests/lib/app-modules.mjs";

if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  console.error(
    "DATABASE_URL is not set. Run with: DATABASE_URL=postgres://… node scripts/test-work-queue.mjs",
  );
  process.exit(1);
}

// The repositories import each other the way Next resolves them (`@/…`, and
// extensionless relatives), so the hook has to be registered before the import.
registerAppImports();

const { pool } = await import("../lib/db.ts");
const { claimNextJob, completeJob, enqueueJob, failJob, listQueuedJobs, reclaimStaleJobs } =
  await import("../lib/repo/jobs.ts");
const { MAX_ATTEMPTS, STALE_LOCK_MS, queueState } = await import("../lib/jobs/policy.ts");

const db = new Client({ connectionString: process.env.DATABASE_URL });
const stamp = Date.now().toString(36);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let passed = 0;
let failed = 0;

function check(label, ok, detail = "") {
  if (ok) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

// ---------------------------------------------------------------------------
// Fixtures: two learners, each with a course. Deleting them is the cascade test.
// ---------------------------------------------------------------------------

const learnerA = `queue-a-${stamp}`;
const learnerB = `queue-b-${stamp}`;
let courseA;
let courseB;

async function createLearner(id, email) {
  await db.query(
    `insert into "user" (id, name, email, "emailVerified") values ($1, $2, $3, true)`,
    [id, "Queue test learner", email],
  );
}

async function createCourse(id, userId) {
  await db.query(`insert into course (id, user_id, title) values ($1, $2, $3)`, [
    id,
    userId,
    "Queue test course",
  ]);
  return id;
}

/** How many rows the queue holds for a course in one state. */
async function countJobs(courseId, status) {
  const { rows } = await db.query(
    `select count(*)::int as n from work_job where course_id = $1 and status = $2`,
    [courseId, status],
  );
  return rows[0].n;
}

async function jobRow(id) {
  const { rows } = await db.query(`select * from work_job where id = $1`, [id]);
  return rows[0];
}

/**
 * Empties the queue between scenarios.
 *
 * `claimNextJob` takes the oldest due job across every course, so a leftover
 * from the previous scenario makes "the job that was claimed is the one I just
 * queued" untrue for reasons that have nothing to do with the code under test.
 * Each scenario starts from an empty queue and asserts on its own work.
 *
 * Which is also why this file must run against a database no worker is draining:
 * claiming is global in both directions. A running app takes this suite's jobs
 * out from under it (the suite then fails on work it never got to run), and in
 * exchange the suite takes *real* learners' jobs and leaves them `running` with
 * nobody working on them. In CI this file runs in a job of its own, before any
 * server exists — keep it that way.
 */
async function resetQueue() {
  await db.query(`delete from work_job where user_id = any($1::text[])`, [[learnerA, learnerB]]);
  // Returned so each scenario can state the precondition it depends on. Without
  // this, a stray row shows up as a confusing failure three checks later. It
  // covers every learner, not just this suite's, because claiming is global.
  const { rows } = await db.query(
    `select count(*)::int as n from work_job where status in ('pending', 'running')`,
  );
  return rows[0].n;
}

async function main() {
  await db.connect();
  await createLearner(learnerA, `${learnerA}@oyevolve.test`);
  await createLearner(learnerB, `${learnerB}@oyevolve.test`);
  courseA = await createCourse(`course-${learnerA}`, learnerA);
  courseB = await createCourse(`course-${learnerB}`, learnerB);

  console.log("\nCoalescing");
  check("the queue starts empty", (await resetQueue()) === 0);
  {
    // Reading is per material: the key is the material, so two files are two
    // jobs and both get read.
    const first = await enqueueJob({
      userId: learnerA,
      courseId: courseA,
      kind: "ingest",
      targetId: "material-1",
    });
    const second = await enqueueJob({
      userId: learnerA,
      courseId: courseA,
      kind: "ingest",
      targetId: "material-2",
    });
    check(
      "two materials queue two separate reads",
      first.id !== second.id,
      `${first.id} ${second.id}`,
    );

    const again = await enqueueJob({
      userId: learnerA,
      courseId: courseA,
      kind: "ingest",
      targetId: "material-1",
    });
    check("queueing the same file twice coalesces", again.id === first.id && again.coalesced);
    check(
      "and leaves one pending row",
      (await countJobs(courseA, "pending")) === 2,
      `${await countJobs(courseA, "pending")}`,
    );

    // A course-wide job coalesces across every material: this is what keeps ten
    // files landing together from spending ten model calls on one analysis.
    const analyse = await enqueueJob({ userId: learnerA, courseId: courseA, kind: "analyse" });
    const analyseAgain = await enqueueJob({ userId: learnerA, courseId: courseA, kind: "analyse" });
    check(
      "one analysis per course however many files land",
      analyseAgain.id === analyse.id && analyseAgain.coalesced,
      `${analyse.id} ${analyseAgain.id}`,
    );

    // Concurrent enqueues of the same work must not both insert. This is the
    // race the partial unique index exists for, not the check-then-insert loop.
    const racing = await Promise.all(
      Array.from({ length: 8 }, () =>
        enqueueJob({ userId: learnerA, courseId: courseA, kind: "revision" }).catch(() => null),
      ),
    );
    const revisionRows = await db.query(
      `select count(*)::int as n from work_job
        where course_id = $1 and kind = 'revision' and status = 'pending'`,
      [courseA],
    );
    check(
      "eight simultaneous enqueues make one job",
      revisionRows.rows[0].n === 1,
      `${revisionRows.rows[0].n}`,
    );
    check(
      "and every caller is told which",
      racing.every((entry) => entry && entry.id === racing[0].id),
    );
  }

  console.log("\nClaiming");
  check("the queue starts empty", (await resetQueue()) === 0);
  {
    const m1 = await enqueueJob({
      userId: learnerA,
      courseId: courseA,
      kind: "ingest",
      targetId: "material-1",
    });
    const m2 = await enqueueJob({
      userId: learnerA,
      courseId: courseA,
      kind: "ingest",
      targetId: "material-2",
    });
    const analysis = await enqueueJob({ userId: learnerA, courseId: courseA, kind: "analyse" });
    const revision = await enqueueJob({ userId: learnerA, courseId: courseA, kind: "revision" });

    const first = await claimNextJob();
    check("the oldest due job is claimed first", first?.id === m1.id, `${first?.id} vs ${m1.id}`);
    check(
      "claiming marks it running and counts the attempt",
      first?.status === "running" && first?.attempts === 1,
      `${first?.status} ${first?.attempts}`,
    );
    check("and stamps the lock", Boolean(first?.lockedAt));

    // The same job cannot be handed out twice: it is no longer pending.
    const second = await claimNextJob();
    check(
      "the next claim takes the next job, not the same one",
      second?.id === m2.id,
      `${second?.id}`,
    );

    // Concurrency: two drains starting together take two different jobs, not the
    // same one twice. This is the property that makes several tabs uploading at
    // once safe, and it is `for update skip locked` that provides it.
    const [left, right] = await Promise.all([claimNextJob(), claimNextJob()]);
    check(
      "two simultaneous claims take different jobs",
      Boolean(left) && Boolean(right) && left.id !== right.id,
      `${left?.id} ${right?.id}`,
    );
    check(
      "and between them they take exactly what was left",
      new Set([left?.id, right?.id]).size === 2 &&
        [left?.id, right?.id].sort().join() === [analysis.id, revision.id].sort().join(),
      `${left?.id} ${right?.id}`,
    );
    check("nothing is left pending", (await countJobs(courseA, "pending")) === 0);

    // A running job does not block new work arriving: the follow-up run is how
    // work that landed mid-flight is not forgotten.
    const followUp = await enqueueJob({ userId: learnerA, courseId: courseA, kind: "analyse" });
    check(
      "enqueueing during a run queues a follow-up, not a duplicate",
      followUp.coalesced === false,
      `${followUp.coalesced}`,
    );
    check(
      "and it is a new pending row",
      (await countJobs(courseA, "pending")) === 1,
      `${await countJobs(courseA, "pending")}`,
    );
  }

  console.log("\nFinishing, failing and retrying");
  check("the queue starts empty", (await resetQueue()) === 0);
  {
    const job = await enqueueJob({
      userId: learnerA,
      courseId: courseA,
      kind: "ingest",
      targetId: "material-finish",
    });
    const claimed = await claimNextJob();
    check("the claimed job is the one just queued", claimed?.id === job.id, `${claimed?.id}`);
    await completeJob(claimed.id);
    check("a finished job is done", (await jobRow(claimed.id)).status === "done");
    check("and keeps no lock", (await jobRow(claimed.id)).locked_at === null);
    check("and no stale error", (await jobRow(claimed.id)).error_code === null);

    // A failure that could plausibly succeed goes back in the queue, deferred.
    const retryable = await enqueueJob({
      userId: learnerA,
      courseId: courseA,
      kind: "ingest",
      targetId: "material-retryable",
    });
    const attempt1 = await claimNextJob();
    check("the retryable job is claimed", attempt1?.id === retryable.id, `${attempt1?.id}`);
    const outcome1 = await failJob(attempt1, {
      code: "storage-unavailable",
      summary: "storage was unreachable",
    });
    check("a storage failure is scheduled for another attempt", outcome1.retrying === true);
    const row1 = await jobRow(retryable.id);
    check("it returns to pending", row1.status === "pending", row1.status);
    check(
      "with the reason recorded and no lock",
      row1.error_code === "storage-unavailable" && row1.locked_at === null,
    );
    check(
      "and it is not due yet — that is the backoff",
      new Date(row1.run_after).getTime() > Date.now(),
    );

    // A failure that cannot succeed is reported instead of retried. It is also
    // the backoff's proof: the deferred job is still pending, and this claim
    // steps over it rather than waiting.
    const permanent = await enqueueJob({
      userId: learnerA,
      courseId: courseA,
      kind: "ingest",
      targetId: "material-empty",
    });
    const attempt2 = await claimNextJob();
    check(
      "a deferred job is stepped over, not waited for",
      attempt2?.id === permanent.id,
      `${attempt2?.id}`,
    );
    const outcome2 = await failJob(attempt2, {
      code: "empty-content",
      summary: "no readable text",
    });
    check("an unreadable file is not retried", outcome2.retrying === false);
    const row2 = await jobRow(permanent.id);
    check(
      "it is failed, with the reason kept",
      row2.status === "failed" && row2.error_code === "empty-content",
    );

    // The ceiling is what ends a retryable loop, so it has to be reached.
    for (let attempt = attempt1.attempts; attempt < MAX_ATTEMPTS; attempt += 1) {
      await db.query(`update work_job set run_after = now() where id = $1`, [retryable.id]);
      const next = await claimNextJob();
      if (next?.id !== retryable.id) {
        check(`attempt ${attempt + 1} claims the retried job`, false, `${next?.id ?? "none"}`);
        break;
      }
      await failJob(next, { code: "storage-unavailable", summary: "still unreachable" });
    }
    const spent = await jobRow(retryable.id);
    check(
      "a retryable failure stops at the attempt ceiling",
      spent.status === "failed",
      `${spent.status} after ${spent.attempts}`,
    );
    check("having really used the attempts", spent.attempts >= MAX_ATTEMPTS, `${spent.attempts}`);
  }

  console.log("\nReclaiming work a dead process left behind");
  check("the queue starts empty", (await resetQueue()) === 0);
  {
    // A job left running by a restart: old lock, attempts still available.
    const abandoned = await enqueueJob({
      userId: learnerA,
      courseId: courseA,
      kind: "ingest",
      targetId: "material-abandoned",
    });
    const claimed = await claimNextJob();
    check("the job to abandon is claimed", claimed?.id === abandoned.id, `${claimed?.id}`);
    await db.query(
      `update work_job set locked_at = now() - make_interval(secs => $2) where id = $1`,
      [abandoned.id, (STALE_LOCK_MS + 60_000) / 1000],
    );

    // A job that is still within its lock must be left alone.
    const healthy = await enqueueJob({
      userId: learnerA,
      courseId: courseA,
      kind: "ingest",
      targetId: "material-healthy",
    });
    const healthyClaim = await claimNextJob();
    check("the live job is claimed", healthyClaim?.id === healthy.id, `${healthyClaim?.id}`);

    const result = await reclaimStaleJobs();
    check("exactly the abandoned job is reclaimed", result.reclaimed === 1, `${result.reclaimed}`);

    const revived = await jobRow(abandoned.id);
    check("it is pending again", revived.status === "pending", revived.status);
    check("with the lock released", revived.locked_at === null);
    check("and it says why", revived.error_code === "stale-lock");
    check(
      "and it is due immediately, not on a backoff",
      new Date(revived.run_after).getTime() <= Date.now() + 1000,
    );
    check("the live job was not touched", (await jobRow(healthy.id)).status === "running");

    // A job that keeps getting abandoned eventually has to stop, or a crash loop
    // would go round forever while the learner watches.
    await db.query(
      `update work_job set attempts = $2, locked_at = now() - make_interval(secs => $3) where id = $1`,
      [healthy.id, MAX_ATTEMPTS, (STALE_LOCK_MS + 60_000) / 1000],
    );
    const second = await reclaimStaleJobs();
    check(
      "a stale job that is out of attempts is failed instead",
      second.failed >= 1,
      `${second.failed}`,
    );
    const givenUp = await jobRow(healthy.id);
    check("and it is not put back in the queue", givenUp.status === "failed", givenUp.status);
  }

  console.log("\nIsolation, cascade and what the UI is told");
  check("the queue starts empty", (await resetQueue()) === 0);
  {
    const waiting = await enqueueJob({
      userId: learnerA,
      courseId: courseA,
      kind: "ingest",
      targetId: "material-iso",
    });
    const finished = await enqueueJob({
      userId: learnerA,
      courseId: courseA,
      kind: "revision",
    });
    const doneJob = await claimNextJob();
    check(
      "one of the two is claimed",
      doneJob?.id === finished.id || doneJob?.id === waiting.id,
      `${doneJob?.id}`,
    );
    await completeJob(doneJob.id);

    const forA = await listQueuedJobs(learnerA, courseA);
    check("a learner sees their own course's unfinished work", forA.length > 0, `${forA.length}`);
    check(
      "finished jobs are not listed",
      forA.every((job) => job.status !== "done"),
      `${forA.length}`,
    );

    const foreign = await listQueuedJobs(learnerB, courseA);
    check("another learner sees nothing of it", foreign.length === 0, `${foreign.length}`);

    // The other learner's own course is a queue of its own, and neither learner's
    // read crosses over — the same shape of work must not become visible work.
    await enqueueJob({
      userId: learnerB,
      courseId: courseB,
      kind: "ingest",
      targetId: "material-other",
    });
    const forB = await listQueuedJobs(learnerB, courseB);
    check("the other learner has their own work", forB.length === 1, `${forB.length}`);
    const crossing = await listQueuedJobs(learnerA, courseB);
    check(
      "and it does not appear in this learner's view",
      crossing.length === 0,
      `${crossing.length}`,
    );

    const state = queueState(forA);
    check(
      "the UI is told what is outstanding",
      typeof state.line === "string" && state.line.length > 0,
      `${state.line}`,
    );
    check(
      "and counting agrees with the sentence",
      state.active + state.retrying + state.waiting > 0,
      JSON.stringify(state),
    );

    // Finish what is left, and the honest answer becomes "nothing outstanding".
    for (;;) {
      await db.query(`update work_job set run_after = now() where status = 'pending'`);
      const job = await claimNextJob();
      if (!job) break;
      await completeJob(job.id);
    }
    const quiet = queueState(await listQueuedJobs(learnerA, courseA));
    check("a course with nothing left to do says nothing", quiet.line === null, `${quiet.line}`);
  }

  console.log("\nCleanup (which is also the cascade test)");
  {
    const before = await db.query(`select count(*)::int as n from work_job where course_id = $1`, [
      courseA,
    ]);
    await db.query(`delete from course where id = $1`, [courseA]);
    const after = await db.query(`select count(*)::int as n from work_job where course_id = $1`, [
      courseA,
    ]);
    check(
      "deleting a course removes its queued work",
      before.rows[0].n > 0 && after.rows[0].n === 0,
      `${before.rows[0].n} → ${after.rows[0].n}`,
    );

    await db.query(`delete from "user" where id = any($1::text[])`, [[learnerA, learnerB]]);
    const orphans = await db.query(
      `select count(*)::int as n from work_job where user_id = any($1::text[])`,
      [[learnerA, learnerB]],
    );
    check(
      "deleting a learner removes any work they owned",
      orphans.rows[0].n === 0,
      `${orphans.rows[0].n}`,
    );
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
    // Best effort: leave the database as it was found even on a hard failure.
    await db
      .query(`delete from "user" where id = any($1::text[])`, [[learnerA, learnerB]])
      .catch(() => undefined);
  })
  .finally(async () => {
    await db.end().catch(() => undefined);
    await pool.end().catch(() => undefined);
    // Give the pools a moment to close before the process exits.
    await sleep(0);
  });
