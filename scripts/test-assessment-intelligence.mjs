// Edvance Phase 7 — Assessment Intelligence end-to-end tests.
//
// Exercises the real assessment pipeline against a running dev server started
// with the deterministic test provider enabled:
//
//   EDVANCE_AI_MOCK=simple infisical run --env=dev -- npx next dev -p 3260
//
// The deterministic provider is env-gated and refused in production; a per-test
// header selects a scenario so one server can exercise every path. For
// assessments it derives its verdict from the actual concepts it is given, so
// every citation it makes is real — which is what the pipeline's validators then
// check.
//
// Usage:
//   BASE_URL=http://localhost:3260 npm run test:assessment
//
// The golden fixture is the same fictional six-part FATHOM framework used by the
// course-intelligence suite: the seeded question asks for *five* components
// while the material teaches *six*, which is the canonical inconsistency.
//
// Everything created is deleted again, so the bucket and database return to
// their prior state.

import { Client } from "pg";

const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3260").replace(/\/$/, "");
const TRUSTED_ORIGIN = process.env.BETTER_AUTH_URL ?? BASE_URL;
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set. Run with: infisical run --env=dev -- node scripts/test-assessment-intelligence.mjs");
  process.exit(1);
}

const PASSWORD = "assessment-test-password";
let passed = 0;
const failures = [];

function check(name, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`PASS  ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const FATHOM_FRAMEWORK = [
  { name: "Frame", body: "Frame the question before looking for evidence. Write down the exact question the material must answer." },
  { name: "Assemble", body: "Assemble every source that could answer the question. Gather the materials that bear on it." },
  { name: "Trace", body: "Trace each claim back to the exact place it appears, and record the page, slide or timestamp." },
  { name: "Hold", body: "Hold uncertainty. When the evidence is thin, report that instead of guessing an answer." },
  { name: "Order", body: "Order the findings by how strongly the evidence supports them." },
  { name: "Move", body: "Move to the next action the evidence actually justifies." },
];

const FATHOM_MARKDOWN = FATHOM_FRAMEWORK.map(
  (component) => `## ${component.name}\n\n${component.body}`,
).join("\n\n");

const FIVE_COMPONENT_QUESTION = "What are the five components of the FATHOM framework?";
const CONSISTENT_QUESTION = "Why does Trace ask you to record where a claim appears?";

class Session {
  constructor() {
    this.cookies = new Map();
  }

  update(response) {
    for (const cookie of response.headers.getSetCookie?.() ?? []) {
      const [pair] = cookie.split(";");
      const index = pair.indexOf("=");
      if (index > 0) this.cookies.set(pair.slice(0, index), pair.slice(index + 1));
    }
  }

  async fetch(path, init = {}) {
    const headers = new Headers(init.headers ?? {});
    if (this.cookies.size > 0) {
      headers.set("cookie", [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; "));
    }
    headers.set("origin", TRUSTED_ORIGIN);
    if (init.body && !(init.body instanceof FormData) && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
    const response = await fetch(`${BASE_URL}${path}`, { ...init, headers, redirect: "manual" });
    this.update(response);
    return response;
  }
}

async function signUp(email) {
  const session = new Session();
  const response = await session.fetch("/api/auth/sign-up/email", {
    method: "POST",
    body: JSON.stringify({ email, password: PASSWORD, name: "Assessment Learner" }),
  });
  return { session, ok: response.ok, status: response.status };
}

async function createCourse(session, name) {
  const response = await session.fetch("/api/courses", {
    method: "POST",
    body: JSON.stringify({ name, institution: "Test University", lesson: "Evidence" }),
  });
  const body = await response.json().catch(() => ({}));
  return body.course?.id;
}

async function upload(session, courseId, name, text) {
  const form = new FormData();
  form.append("file", new Blob([Buffer.from(text, "utf8")], { type: "text/markdown" }), name);
  const response = await session.fetch(`/api/courses/${courseId}/materials`, { method: "POST", body: form });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, material: body.material };
}

async function addQuestion(session, courseId, question) {
  const response = await session.fetch(`/api/courses/${courseId}/assessments`, {
    method: "POST",
    body: JSON.stringify({ lesson: "Evidence", question }),
  });
  const body = await response.json().catch(() => ({}));
  return body.course;
}

async function getCourse(session, courseId) {
  const response = await session.fetch(`/api/courses/${courseId}`);
  const body = await response.json().catch(() => ({}));
  return body.course;
}

async function analyseCourse(session, courseId, scenario) {
  const headers = scenario ? { "x-edvance-mock-scenario": scenario } : {};
  const response = await session.fetch(`/api/courses/${courseId}/analyse`, { method: "POST", headers });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

async function analyseQuestion(session, courseId, questionId, scenario) {
  const headers = scenario ? { "x-edvance-mock-scenario": scenario } : {};
  const response = await session.fetch(
    `/api/courses/${courseId}/assessments/${questionId}/analyse`,
    { method: "POST", headers },
  );
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

function findQuestion(course, text) {
  return course?.assessments?.find((item) => item.question === text);
}

async function loadSignature(db, questionId) {
  const { rows } = await db.query(
    `select status, error_code, error_summary, evidence_fingerprint, tested_concept_count, provider_metadata
       from assessment_analysis where assessment_question_id = $1`,
    [questionId],
  );
  return rows[0];
}

async function loadFinding(db, questionId) {
  const { rows } = await db.query(
    `select status, description, next_action, course_id
       from consistency_finding where assessment_question_id = $1`,
    [questionId],
  );
  return rows[0];
}

async function loadMappings(db, questionId) {
  const { rows } = await db.query(
    `select concept_id, material_id, source_location, confidence
       from source_mapping where assessment_question_id = $1`,
    [questionId],
  );
  return rows;
}

async function loadCourseLevelFindings(db, courseId) {
  const { rows } = await db.query(
    `select id, status, description from consistency_finding
      where course_id = $1 and assessment_question_id is null`,
    [courseId],
  );
  return rows;
}

async function main() {
  const stamp = Date.now();
  const db = new Client({ connectionString: DATABASE_URL });
  await db.connect();

  const emailA = `assess-a-${stamp}@edvance.test`;
  const emailB = `assess-b-${stamp}@edvance.test`;
  // A learner who never creates a course of their own, so the demo workspace is
  // still seeded for them (seeding only happens while a learner is empty).
  const emailC = `assess-c-${stamp}@edvance.test`;
  const cleanupMaterials = [];

  try {
    const a = await signUp(emailA);
    const b = await signUp(emailB);
    const c = await signUp(emailC);
    check("sign-up: learner A", a.ok, `status ${a.status}`);
    check("sign-up: learner B", b.ok, `status ${b.status}`);
    check("sign-up: learner C", c.ok, `status ${c.status}`);
    const learnerA = a.session;
    const learnerB = b.session;
    const learnerC = c.session;

    // --- 1. A ready course with the six-part golden fixture -----------------
    const courseA = await createCourse(learnerA, "Evidence-first method (FATHOM)");
    check("course A created", Boolean(courseA), courseA);
    const golden = await upload(learnerA, courseA, "fathom-framework.md", FATHOM_MARKDOWN);
    check(
      "golden fixture uploads and extracts",
      golden.status === 201 && golden.material?.ingestion?.status === "completed",
      `status ${golden.status} ${golden.material?.ingestion?.status}`,
    );
    cleanupMaterials.push({ session: learnerA, courseId: courseA, materialId: golden.material?.id });

    // Before the course is analysed, a question cannot be judged against concepts.
    const earlyCourse = await addQuestion(learnerA, courseA, FIVE_COMPONENT_QUESTION);
    const earlyQuestion = findQuestion(earlyCourse, FIVE_COMPONENT_QUESTION);
    check("assessment created", Boolean(earlyQuestion?.id), `${earlyQuestion?.id}`);
    {
      const tooEarly = await analyseQuestion(learnerA, courseA, earlyQuestion.id);
      check("gate: question analysis before the course is refused (409)", tooEarly.status === 409, `status ${tooEarly.status}`);
      check("gate: the message tells the learner to analyse the course", /analyse the course/i.test(tooEarly.body.error ?? ""), tooEarly.body.error);
    }

    const courseAnalysis = await analyseCourse(learnerA, courseA);
    check("course analysis succeeds", courseAnalysis.status === 200 && courseAnalysis.body.course?.intelligence?.status === "ready", `${courseAnalysis.status} ${courseAnalysis.body.course?.intelligence?.status}`);
    check("course analysis extracted six concepts", courseAnalysis.body.course?.intelligence?.concepts?.length === 6, `${courseAnalysis.body.course?.intelligence?.concepts?.length}`);

    // --- 2. The canonical six-versus-five inconsistency --------------------
    const withSignature = await getCourse(learnerA, courseA);
    const question = findQuestion(withSignature, FIVE_COMPONENT_QUESTION);
    check("question starts unchecked", question?.signature?.status === "not-analyzed", question?.signature?.status);

    const first = await analyseQuestion(learnerA, courseA, question.id);
    check("question analysis accepted (200)", first.status === 200, `status ${first.status} ${JSON.stringify(first.body.error ?? "")}`);
    check("question analysis outcome is analysed", first.body.outcome === "analysed", first.body.outcome);

    const signature = findQuestion(first.body.course, FIVE_COMPONENT_QUESTION)?.signature;
    check("signature state is ready", signature?.status === "ready", signature?.status);
    check("signature flags a possible inconsistency", signature?.consistency === "possible-inconsistency", signature?.consistency);
    check(
      "signature explains the disagreement",
      /5/.test(signature?.reason ?? "") && /6/.test(signature?.reason ?? ""),
      signature?.reason,
    );
    check("signature recommends a next step", Boolean(signature?.nextAction), signature?.nextAction);
    check("signature names the concepts tested", signature?.concepts?.length === 6, `${signature?.concepts?.length}`);
    check(
      "signature concepts carry real evidence",
      (signature?.concepts ?? []).every((concept) =>
        (concept.evidence ?? []).every((ref) => ref.materialTitle && ref.sourceLocation),
      ),
    );
    check(
      "signature evidence points into real sections",
      (signature?.concepts ?? []).flatMap((concept) => concept.evidence ?? []).every((ref) =>
        ref.sourceLocation.startsWith("Section: "),
      ),
    );

    // --- 3. Persistence matches the API view -------------------------------
    const storedSignature = await loadSignature(db, question.id);
    check("db: signature row is ready", storedSignature?.status === "ready", storedSignature?.status);
    check("db: tested concept count recorded", storedSignature?.tested_concept_count === 6, String(storedSignature?.tested_concept_count));
    check("db: safe provider metadata stored", Boolean(storedSignature?.provider_metadata?.model), JSON.stringify(storedSignature?.provider_metadata));
    check("db: no failure recorded on success", !storedSignature?.error_code && !storedSignature?.error_summary);

    const storedFinding = await loadFinding(db, question.id);
    check("db: one finding per question", Boolean(storedFinding), "missing");
    check("db: finding status is possible-inconsistency", storedFinding?.status === "possible-inconsistency", storedFinding?.status);

    const mappings = await loadMappings(db, question.id);
    check("db: source mappings written", mappings.length === 6, `${mappings.length}`);
    check("db: every mapping names a real concept", mappings.every((row) => Boolean(row.concept_id)));
    check("db: every mapping names a real material and location", mappings.every((row) => row.material_id && row.source_location?.startsWith("Section: ")));
    {
      const foreign = await db.query(
        `select count(*)::int as n
           from source_mapping m
           join concept c on c.id = m.concept_id
          where m.assessment_question_id = $1 and c.course_id <> $2`,
        [question.id, courseA],
      );
      check("db: no mapping points at another course's concept", foreign.rows[0].n === 0, `${foreign.rows[0].n}`);
    }

    // The seeded course-level narrative is superseded by real analysis.
    const courseLevel = await loadCourseLevelFindings(db, courseA);
    check("db: demo course-level finding superseded", courseLevel.length === 0, `${courseLevel.length}`);
    {
      const refreshed = await getCourse(learnerA, courseA);
      check("course view reflects the worst finding", refreshed?.consistency?.status === "possible-inconsistency", refreshed?.consistency?.status);
    }

    // --- 4. Cost control ---------------------------------------------------
    {
      const again = await analyseQuestion(learnerA, courseA, question.id);
      check("cost control: re-check is up-to-date, no model call", again.status === 200 && again.body.outcome === "up-to-date", `${again.status} ${again.body.outcome}`);
    }

    // --- 5. A consistent question is reported as consistent ----------------
    {
      const withSecond = await addQuestion(learnerA, courseA, CONSISTENT_QUESTION);
      const consistentQuestion = findQuestion(withSecond, CONSISTENT_QUESTION);
      const result = await analyseQuestion(learnerA, courseA, consistentQuestion.id);
      check("consistent: accepted", result.status === 200, `status ${result.status}`);
      const consistentSignature = findQuestion(result.body.course, CONSISTENT_QUESTION)?.signature;
      check("consistent: verdict is consistent", consistentSignature?.consistency === "consistent", consistentSignature?.consistency);
      check("consistent: state is ready", consistentSignature?.status === "ready", consistentSignature?.status);
      check("consistent: still names the concepts it tests", (consistentSignature?.concepts?.length ?? 0) > 0, `${consistentSignature?.concepts?.length}`);
    }

    // --- 6. Staleness ------------------------------------------------------
    {
      const second = await upload(learnerA, courseA, "trace-reminder.md", "## Trace\n\nTrace again: without a recorded location, a claim cannot be checked.");
      check("second material uploads", second.status === 201, `status ${second.status}`);
      cleanupMaterials.push({ session: learnerA, courseId: courseA, materialId: second.material?.id });

      const refreshed = await getCourse(learnerA, courseA);
      const stale = findQuestion(refreshed, FIVE_COMPONENT_QUESTION)?.signature;
      check("staleness: new material marks the question needs-reanalysis", stale?.status === "needs-reanalysis", stale?.status);

      const recheck = await analyseQuestion(learnerA, courseA, question.id);
      check("staleness: re-check is refused until the course is re-analysed (409)", recheck.status === 409, `status ${recheck.status}`);
      const reran = await analyseCourse(learnerA, courseA);
      check("staleness: course re-analysis succeeds", reran.status === 200 && reran.body.course?.intelligence?.status === "ready", `${reran.status}`);
      const after = await analyseQuestion(learnerA, courseA, question.id);
      check("staleness: question re-check succeeds", after.status === 200, `status ${after.status} ${JSON.stringify(after.body.error ?? "")}`);
      const refreshedSignature = findQuestion(after.body.course, FIVE_COMPONENT_QUESTION)?.signature;
      check("staleness: signature is fresh again", refreshedSignature?.status === "ready", refreshedSignature?.status);
    }

    // --- 7. Insufficient evidence is a valid outcome -----------------------
    {
      const thin = await createCourse(learnerA, "Thin course");
      const thinMaterial = await upload(learnerA, thin, "thin.md", "## Notes\n\nA short and unhelpful note.");
      cleanupMaterials.push({ session: learnerA, courseId: thin, materialId: thinMaterial.material?.id });
      const thinAnalysis = await analyseCourse(learnerA, thin, "insufficient");
      check("insufficient: course analysis records insufficient-evidence", thinAnalysis.body.course?.intelligence?.status === "insufficient-evidence", thinAnalysis.body.course?.intelligence?.status);
      const withQuestion = await addQuestion(learnerA, thin, "What is the point of this note?");
      const thinQuestion = findQuestion(withQuestion, "What is the point of this note?");
      const result = await analyseQuestion(learnerA, thin, thinQuestion.id);
      check("insufficient: question analysis is recorded without a model call", result.status === 200 && result.body.outcome === "insufficient-evidence", `${result.status} ${result.body.outcome}`);
      const recorded = findQuestion(result.body.course, "What is the point of this note?")?.signature;
      check("insufficient: signature state is insufficient-evidence", recorded?.status === "insufficient-evidence", recorded?.status);
      check("insufficient: no concepts were invented", (recorded?.concepts ?? []).length === 0, `${recorded?.concepts?.length}`);
      check("insufficient: no source mappings persisted", (await loadMappings(db, thinQuestion.id)).length === 0);
    }

    // --- 8. Unverifiable responses are rejected whole ----------------------
    const failureCases = [
      ["invalid-concept-id", "invalid concept id"],
      ["unjustified-inconsistency", "unjustified inconsistency"],
      ["malformed", "malformed structured output"],
      ["provider-failure", "provider failure"],
    ];
    for (const [scenario, label] of failureCases) {
      const course = await createCourse(learnerA, `Assessment failure (${scenario})`);
      const material = await upload(learnerA, course, "evidence.md", FATHOM_MARKDOWN);
      cleanupMaterials.push({ session: learnerA, courseId: course, materialId: material.material?.id });
      await analyseCourse(learnerA, course);
      const withQuestion = await addQuestion(learnerA, course, FIVE_COMPONENT_QUESTION);
      const target = findQuestion(withQuestion, FIVE_COMPONENT_QUESTION);
      const result = await analyseQuestion(learnerA, course, target.id, scenario);
      check(`${label}: rejected with 502`, result.status === 502, `status ${result.status} ${JSON.stringify(result.body)}`);
      check(`${label}: no source mappings persisted`, (await loadMappings(db, target.id)).length === 0, `${(await loadMappings(db, target.id)).length}`);
      const row = await loadSignature(db, target.id);
      check(`${label}: signature recorded as failed`, row?.status === "failed", row?.status);
      check(`${label}: safe error summary recorded`, Boolean(row?.error_summary) && !/concept-does-not-exist/.test(row?.error_summary ?? ""), row?.error_summary);
      check(`${label}: raw output never stored`, !(row?.error_summary ?? "").includes("not json at all"));
    }

    // --- 9. Ownership and isolation ---------------------------------------
    {
      const target = findQuestion(await getCourse(learnerA, courseA), FIVE_COMPONENT_QUESTION);
      const foreign = await analyseQuestion(learnerB, courseA, target.id);
      check("isolation: another learner cannot check a course (404)", foreign.status === 404, `status ${foreign.status}`);

      const unauth = await fetch(`${BASE_URL}/api/courses/${courseA}/assessments/${target.id}/analyse`, {
        method: "POST",
        headers: { origin: TRUSTED_ORIGIN },
        redirect: "manual",
      });
      check("isolation: unauthenticated check is refused (401)", unauth.status === 401, `status ${unauth.status}`);

      const ownCourse = await createCourse(learnerB, "Learner B course");
      const missing = await analyseQuestion(learnerB, ownCourse, target.id);
      check("isolation: a question id from another course is not found (404)", missing.status === 404, `status ${missing.status}`);
    }

    // --- 10. Demo workspaces stay demo ------------------------------------
    {
      const seededList = await learnerC.fetch("/api/courses");
      const courses = (await seededList.json()).courses ?? [];
      const seeded = courses.find((course) => (course.sources ?? []).length > 0);
      check("regression: seeded workspace has no real evidence", Boolean(seeded) && seeded.sources.every((source) => !source.storageReference));
      const demoQuestion = seeded?.assessments?.[0];
      check("regression: seeded workspace has demo questions", Boolean(demoQuestion), `${seeded?.assessments?.length}`);
      if (demoQuestion) {
        check("regression: seeded question starts unchecked", demoQuestion.signature?.status === "not-analyzed", demoQuestion.signature?.status);
        check("regression: seeded question claims no concepts", (demoQuestion.signature?.concepts ?? []).length === 0);
        const result = await analyseQuestion(learnerC, seeded.id, demoQuestion.id);
        check("regression: demo question is refused until the course is analysed (409)", result.status === 409, `status ${result.status}`);
      }
    }
  } finally {
    for (const entry of cleanupMaterials) {
      if (!entry.materialId) continue;
      try {
        await entry.session.fetch(`/api/courses/${entry.courseId}/materials/${entry.materialId}`, { method: "DELETE" });
      } catch {
        // Best effort.
      }
    }
    for (const email of [emailA, emailB, emailC]) {
      try {
        await db.query('delete from "user" where email = $1', [email]);
      } catch {
        // Best effort.
      }
    }
    await db.end();
  }

  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length > 0) {
    console.log("\nFailures:");
    for (const failure of failures) console.log(`  - ${failure}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
