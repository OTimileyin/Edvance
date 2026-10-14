// Full Next.js + real Gemini + browser acceptance check. Local PostgreSQL only.
// Run: DATABASE_URL=<local URL> node --env-file=.env.vercel.local scripts/verify-reanalysis-live.mjs
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { readdir, readFile, mkdir, writeFile, appendFile } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";
import { Pool } from "pg";
import { chromium } from "@playwright/test";
import { registerAppImports } from "../tests/lib/app-modules.mjs";

registerAppImports();
const { databaseUrl } = await import("../lib/env.ts");
const connectionString = databaseUrl();
assert.ok(
  ["localhost", "127.0.0.1", "[::1]"].includes(new URL(connectionString).hostname),
  "Remote databases are refused.",
);
assert.ok(process.env.GEMINI_API_KEY, "A real GEMINI_API_KEY is required.");
delete process.env.OYEVOLVE_AI_MOCK;
process.env.NODE_ENV = "development";
const schema = `live_reanalysis_${randomUUID().replaceAll("-", "")}`;
const admin = new Pool({ connectionString });
const port = Number(process.env.LIVE_REANALYSIS_PORT ?? 3272);
const origin = `http://127.0.0.1:${port}`;
const results = [];
let pool, server, browser;
try {
  await mkdir("output", { recursive: true });
  await writeFile("output/live-reanalysis-server.log", "");
  await admin.query(`create schema "${schema}"`);
  const isolatedUrl = new URL(connectionString);
  isolatedUrl.searchParams.set("options", `-c search_path=${schema}`);
  process.env.DATABASE_URL = isolatedUrl.href;
  pool = new Pool({ connectionString: isolatedUrl.href });
  globalThis.oyevolvePool = pool;
  const migrations = new URL("../db/migrations/", import.meta.url);
  for (const file of (await readdir(migrations)).filter((name) => name.endsWith(".sql")).sort()) {
    await pool.query(await readFile(new URL(file, migrations), "utf8"));
  }
  server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "dev", "-p", String(port), "--hostname", "127.0.0.1"],
    {
      windowsHide: true,
      env: {
        ...process.env,
        BETTER_AUTH_URL: origin,
        BETTER_AUTH_SECRET: "local-live-reanalysis-secret-only-not-for-production",
        NEXT_TELEMETRY_DISABLED: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  for (const stream of [server.stdout, server.stderr])
    stream.on("data", (data) => {
      void appendFile("output/live-reanalysis-server.log", data);
    });
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    if (server.exitCode !== null)
      throw new Error("Local Next server exited; inspect output/live-reanalysis-server.log.");
    try {
      if ((await fetch(`${origin}/api/health`)).ok) {
        ready = true;
        break;
      }
    } catch {
      /* starting */
    }
    await sleep(500);
  }
  assert.ok(ready, "Local Next server did not become ready.");
  console.log("PASS local Next server ready; mock provider disabled");
  browser = await chromium.launch({ headless: true });
  const repo = await import("../lib/repo/courses.ts");
  async function source(courseId, title, passages) {
    const materialId = `live-material-${randomUUID()}`;
    await pool.query(
      `insert into learning_material (id, course_id, type, title, location) values ($1, $2, 'Notes', $3, 'Local acceptance fixture')`,
      [materialId, courseId, title],
    );
    await repo.replaceMaterialChunks(
      materialId,
      passages.map(([heading, content]) => ({
        content,
        sourceLocation: `Section: ${heading}`,
        metadata: {},
      })),
    );
    const job = await repo.createIngestionJob(materialId);
    await repo.completeIngestion(job, { chunks: passages.length });
  }
  for (let run = 1; run <= 2; run++) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const api = context.request;
    async function post(path, data) {
      for (let attempt = 0; attempt < 2; attempt++) {
        const response = await api.post(`${origin}${path}`, {
          data,
          headers: { origin },
          timeout: 240000,
        });
        const body = await response.json();
        if (
          !response.ok() &&
          attempt === 0 &&
          /rejected the request \(503\)/.test(body.error ?? "")
        ) {
          console.log(
            `Provider 503 at ${path}; retrying the learner action once (after SDK retries).`,
          );
          await sleep(2000);
          continue;
        }
        assert.ok(response.ok(), `${path} failed (${response.status()}): ${JSON.stringify(body)}`);
        return body;
      }
    }
    await post("/api/auth/sign-up/email", {
      name: `Local live learner ${run}`,
      email: `live-${run}-${Date.now()}@test.invalid`,
      password: "local-live-password",
    });
    const { course: created } = await post("/api/courses", {
      name: `Real Gemini preservation run ${run}`,
      lesson: "Compass framework",
      institution: "Local acceptance test",
    });
    await source(created.id, "Compass framework", [
      [
        "Compass Purpose",
        "Compass Purpose states why a task exists and what a useful result looks like. It defines the reason for the task.",
      ],
      [
        "Compass Role",
        "Compass Role names who performs the task. It selects the vocabulary and level of detail appropriate to that role.",
      ],
      [
        "Compass Objective",
        "Compass Objective states the single measurable result a task must achieve. It describes the outcome rather than the process.",
      ],
    ]);
    console.log(`Run ${run}: calling real Gemini for initial analysis`);
    const initial = (await post(`/api/courses/${created.id}/analyse`)).course;
    assert.equal(initial.intelligence.status, "ready");
    assert.ok(!initial.intelligence.provider.model.startsWith("mock:"));
    const target = initial.intelligence.concepts[0];
    assert.ok(target);
    for (let attempt = 0; attempt < 3; attempt++) {
      await post(`/api/courses/${created.id}/practice`, {
        conceptId: target.id,
        correct: true,
        answer: target.definition,
      });
    }
    const before = (
      await pool.query("select * from mastery_state where concept_id = $1", [target.id])
    ).rows;
    const attemptsBefore = (
      await pool.query("select * from practice_attempt where concept_id = $1 order by id", [
        target.id,
      ])
    ).rows;
    assert.equal(before[0].status, "Mastered");
    assert.equal(attemptsBefore.length, 3);
    await source(created.id, "Compass Constraints", [
      [
        "Compass Constraints",
        "Compass Constraints set limits on the task: length, tone and output format. Constraints bound the freedom available to the performer.",
      ],
    ]);
    console.log(`Run ${run}: calling real Gemini after adding a source`);
    const after = (await post(`/api/courses/${created.id}/analyse`)).course;
    assert.equal(after.intelligence.status, "ready");
    assert.ok(!after.intelligence.provider.model.startsWith("mock:"));
    const retained = after.intelligence.concepts.find((concept) => concept.id === target.id);
    assert.ok(retained, "Real model did not retain the practised concept ID.");
    assert.deepEqual(
      (await pool.query("select * from mastery_state where concept_id = $1", [target.id])).rows,
      before,
    );
    assert.deepEqual(
      (
        await pool.query("select * from practice_attempt where concept_id = $1 order by id", [
          target.id,
        ])
      ).rows,
      attemptsBefore,
    );
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${origin}/courses/${created.id}/mastery`);
    const row = page
      .locator("tbody tr")
      .filter({ has: page.getByText(retained.name, { exact: true }) });
    await row.getByText("Mastered", { exact: true }).waitFor({ state: "visible", timeout: 60000 });
    assert.match(await row.innerText(), /3 of 3/);
    assert.equal(errors.length, 0);
    await page.screenshot({
      path: `output/gemini-reanalysis-run-${run}-mastery.png`,
      fullPage: true,
    });
    console.log(
      `PASS real Gemini run ${run}: same concept ID; 3 attempts; Mastered 100%; Mastery page verified`,
    );
    console.log(
      `Run ${run} identity reuse: ${JSON.stringify(after.intelligence.provider.conceptIdentity)}`,
    );
    results.push({
      run,
      model: after.intelligence.provider.model,
      conceptIdPreserved: true,
      attempts: 3,
      score: 100,
      masteryPageVerified: true,
      conceptIdentity: after.intelligence.provider.conceptIdentity,
    });

    if (run === 2) {
      const updated = (
        await post(`/api/courses/${created.id}/assessments`, {
          lesson: "Compass framework",
          question: "Explain the original practised idea.",
        })
      ).course;
      const question = updated.assessments.find(
        (entry) => entry.question === "Explain the original practised idea.",
      );
      const fingerprint = repo.evidenceFingerprint(updated.sources);
      await repo.saveAssessmentIntelligence(
        created.id,
        question.id,
        fingerprint,
        {
          status: "ready",
          consistency: "CONSISTENT",
          reason: "This question exercises the original idea.",
          nextAction: "Practise it.",
          testedConceptIds: [target.id],
          usage: { model: "local-query-fixture" },
        },
        updated.intelligence.concepts,
      );
      const userId = (await pool.query("select user_id from course where id = $1", [created.id]))
        .rows[0].user_id;
      const evidence = await repo.getCourseEvidence(userId, created.id);
      const references = (
        await pool.query(
          "select concept_id, chunk_id from concept_evidence where concept_id = any($1::text[])",
          [updated.intelligence.concepts.map((concept) => concept.id)],
        )
      ).rows;
      await repo.saveCourseIntelligence(
        created.id,
        fingerprint,
        {
          status: "ready",
          usage: updated.intelligence.provider,
          relationships: [],
          concepts: updated.intelligence.concepts
            .filter((concept) => concept.id !== target.id)
            .map((concept) => ({
              ...concept,
              key: concept.id,
              evidence: references
                .filter((reference) => reference.concept_id === concept.id)
                .map((reference) => ({
                  chunkId: reference.chunk_id,
                  rationale: "Stored reference",
                })),
            })),
        },
        evidence,
      );
      await page.goto(`${origin}/courses/${created.id}/assessments`);
      await page
        .getByText("Needs re-checking", { exact: true })
        .waitFor({ state: "visible", timeout: 60000 });
      assert.ok(
        await page.getByText("Explain the original practised idea.", { exact: true }).isVisible(),
      );
      assert.ok(
        await page.getByText(/Course concepts changed\. Re-check this question/).isVisible(),
      );
      assert.equal(await page.getByText(retained.name, { exact: true }).count(), 0);
      assert.equal(errors.length, 0);
      assert.equal(
        (
          await pool.query(
            "select concept_id from source_mapping where assessment_question_id = $1",
            [question.id],
          )
        ).rows[0].concept_id,
        target.id,
      );
      assert.deepEqual(
        (await pool.query("select * from mastery_state where concept_id = $1", [target.id])).rows,
        before,
      );
      await page.screenshot({ path: "output/archived-assessment-check.png", fullPage: true });
      console.log(
        "PASS Assessments page: archived mapped concept hidden; mapping and mastery retained; re-check notice visible; no browser errors",
      );
      results.push({
        archivedAssessmentPageVerified: true,
        mappingPreserved: true,
        recheckNotice: true,
        browserErrors: 0,
      });
    }
    await context.close();
  }
  await writeFile("output/live-reanalysis-results.json", JSON.stringify(results, null, 2));
} finally {
  if (browser) await browser.close();
  if (server && server.exitCode === null) {
    // Only terminate the process tree this script created; never an existing dev server.
    if (process.platform === "win32")
      spawnSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], {
        windowsHide: true,
        stdio: "ignore",
      });
    else server.kill("SIGTERM");
  }
  if (pool) await pool.end();
  delete globalThis.oyevolvePool;
  await admin.query(`drop schema if exists "${schema}" cascade`);
  await admin.end();
}
