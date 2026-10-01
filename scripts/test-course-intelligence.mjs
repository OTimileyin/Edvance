// Edvance Phase 6 — Course Intelligence end-to-end tests.
//
// Exercises the real analysis pipeline against a running dev server started
// with the deterministic test provider enabled:
//
//   EDVANCE_AI_MOCK=simple infisical run --env=dev -- npx next dev -p 3260
//
// The deterministic provider is env-gated and refused in production; a per-test
// header selects a scenario so one server can exercise every path. It derives
// its concepts from the actual evidence it is given, so every citation it makes
// is real — which is exactly what the pipeline's validators then check.
//
// Usage:
//   infisical run --env=dev -- node scripts/test-course-intelligence.mjs
//   BASE_URL=http://localhost:3260 infisical run --env=dev -- node scripts/test-course-intelligence.mjs
//
// Everything created is deleted again, so the bucket and database return to
// their prior state.

import { Client } from "pg";

const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3260").replace(/\/$/, "");
const TRUSTED_ORIGIN = process.env.BETTER_AUTH_URL ?? BASE_URL;
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set. Run with: infisical run --env=dev -- node scripts/test-course-intelligence.mjs");
  process.exit(1);
}

const PASSWORD = "intelligence-test-password";
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

// ---------------------------------------------------------------------------
// The original golden fixture: the FATHOM framework, a fictional six-part
// method for evidence-first work invented for this project. It is taught across
// six sections so a correct analysis extracts all six components, each grounded
// in its own section. Phase 7 reuses it for the six-versus-five inconsistency.
// ---------------------------------------------------------------------------
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

/** A second material that re-teaches one component, for the multi-source case. */
const TRACE_REMINDER = "## Trace\n\nTrace again: without a recorded location, a claim cannot be checked.";

// ---------------------------------------------------------------------------
// HTTP session with a cookie jar.
// ---------------------------------------------------------------------------

class Session {
  constructor(label) {
    this.label = label;
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
    if (this.cookies.size > 0) headers.set("cookie", this.cookieHeader());
    headers.set("origin", TRUSTED_ORIGIN);
    if (init.body && !(init.body instanceof FormData) && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
    const response = await fetch(`${BASE_URL}${path}`, { ...init, headers, redirect: "manual" });
    this.update(response);
    return response;
  }

  cookieHeader() {
    return [...this.cookies].map(([name, value]) => `${name}=${value}`).join("; ");
  }
}

async function signUp(label, email) {
  const session = new Session(label);
  const response = await session.fetch("/api/auth/sign-up/email", {
    method: "POST",
    body: JSON.stringify({ email, password: PASSWORD, name: label }),
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
  return { status: response.status, material: body.material, error: body.error };
}

async function analyse(session, courseId, scenario) {
  const headers = scenario ? { "x-edvance-mock-scenario": scenario } : {};
  const response = await session.fetch(`/api/courses/${courseId}/analyse`, { method: "POST", headers });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

// ---------------------------------------------------------------------------
// Database helpers.
// ---------------------------------------------------------------------------

async function loadConcepts(db, courseId) {
  const { rows } = await db.query(
    `select c.id, c.name, c.instructor_term, c.definition, c.evidence_status, c.confidence, c.origin
       from concept c where c.course_id = $1 order by c.ordinal asc`,
    [courseId],
  );
  return rows;
}

async function loadEvidence(db, conceptId) {
  const { rows } = await db.query(
    `select e.source_location, e.excerpt, m.title as material_title
       from concept_evidence e
       join learning_material m on m.id = e.material_id
      where e.concept_id = $1`,
    [conceptId],
  );
  return rows;
}

async function loadAnalysis(db, courseId) {
  const { rows } = await db.query(
    `select status, error_code, error_summary, concept_count, relationship_count, evidence_fingerprint
       from course_analysis where course_id = $1`,
    [courseId],
  );
  return rows[0];
}

async function main() {
  const stamp = Date.now();
  const db = new Client({ connectionString: DATABASE_URL });
  await db.connect();

  const emailA = `intel-a-${stamp}@edvance.test`;
  const emailB = `intel-b-${stamp}@edvance.test`;
  const cleanupMaterials = []; // { session, courseId, materialId }

  try {
    const a = await signUp("Intelligence Learner A", emailA);
    const b = await signUp("Intelligence Learner B", emailB);
    check("sign-up: learner A", a.ok, `status ${a.status}`);
    check("sign-up: learner B", b.ok, `status ${b.status}`);
    const learnerA = a.session;
    const learnerB = b.session;

    // --- 1. Golden fixture: a simple six-part course -----------------------
    const courseA = await createCourse(learnerA, "Evidence-first method (FATHOM)");
    check("course A created", Boolean(courseA), courseA);

    const golden = await upload(learnerA, courseA, "fathom-framework.md", FATHOM_MARKDOWN);
    check("golden fixture uploads and extracts", golden.status === 201 && golden.material?.ingestion?.status === "completed", `status ${golden.status} ${golden.material?.ingestion?.status}`);
    cleanupMaterials.push({ session: learnerA, courseId: courseA, materialId: golden.material?.id });

    // The legacy formats are rejected on a real course.
    {
      for (const [name, type] of [["legacy.doc", "application/msword"], ["legacy.ppt", "application/vnd.ms-powerpoint"]]) {
        const form = new FormData();
        form.append("file", new Blob([Buffer.from("legacy", "utf8")], { type }), name);
        const response = await learnerA.fetch(`/api/courses/${courseA}/materials`, { method: "POST", body: form });
        check(`${name} upload rejected (415)`, response.status === 415, `status ${response.status}`);
      }
    }

    // The golden fixture also carries the Phase 7 inconsistency: an assessment
    // that asks for five components while the material teaches six.
    const question = await learnerA.fetch(`/api/courses/${courseA}/assessments`, {
      method: "POST",
      body: JSON.stringify({ lesson: "Evidence", question: "What are the five components of the FATHOM framework?" }),
    });
    check("golden fixture assessment created", question.ok, `status ${question.status}`);

    const first = await analyse(learnerA, courseA);
    check("analyse: accepted (200)", first.status === 200, `status ${first.status} ${JSON.stringify(first.body.error ?? "")}`);
    check("analyse: outcome is analysed", first.body.outcome === "analysed", first.body.outcome);
    check("analyse: course state is ready", first.body.course?.intelligence?.status === "ready", first.body.course?.intelligence?.status);

    const status = first.body.course.intelligence;
    check("golden: six concepts extracted", status.concepts.length === 6, `${status.concepts.length}`);
    const names = status.concepts.map((concept) => concept.name);
    check(
      "golden: all six framework components present",
      FATHOM_FRAMEWORK.every((component) => names.includes(component.name)),
      names.join(", "),
    );
    check(
      "golden: instructor terminology preserved",
      status.concepts.every((concept) => concept.instructorTerm === concept.name),
      JSON.stringify(status.concepts.map((concept) => concept.instructorTerm)),
    );
    check(
      "golden: every concept has resolvable evidence",
      status.concepts.every((concept) => concept.evidence.length > 0 && concept.evidence.every((ref) => ref.sourceLocation && ref.materialTitle)),
    );
    check(
      "golden: evidence locations are human-readable",
      status.concepts.every((concept) => concept.evidence.every((ref) => ref.sourceLocation.startsWith("Section: "))),
      JSON.stringify(status.concepts[0]?.evidence),
    );
    check(
      "golden: relationships persisted",
      status.relationships.length >= 1 && status.relationships[0].kind === "related_to",
      JSON.stringify(status.relationships),
    );

    // Persisted rows match the API view.
    const storedConcepts = await loadConcepts(db, courseA);
    check("db: six concept rows stored", storedConcepts.length === 6, `${storedConcepts.length}`);
    check("db: concepts are real analysis output, not seed", storedConcepts.every((row) => row.origin === "analysis"));
    check("db: evidence status stored", storedConcepts.every((row) => row.evidence_status === "SUPPORTED"));
    const traceConcept = storedConcepts.find((row) => row.name === "Trace");
    const traceEvidence = traceConcept ? await loadEvidence(db, traceConcept.id) : [];
    check("db: Trace concept has stored evidence", traceEvidence.length === 1, `${traceEvidence.length}`);
    check("db: stored excerpt is real material text", (traceEvidence[0]?.excerpt ?? "").includes("Trace each claim"), traceEvidence[0]?.excerpt);
    const analysisRow = await loadAnalysis(db, courseA);
    check("db: analysis row is ready", analysisRow?.status === "ready", analysisRow?.status);
    check("db: analysis counts recorded", analysisRow?.concept_count === 6, String(analysisRow?.concept_count));
    check("db: no failure recorded on success", !analysisRow?.error_code && !analysisRow?.error_summary);

    // --- 2. Cost control: a second analyse is a no-op ----------------------
    {
      const again = await analyse(learnerA, courseA);
      check("cost control: re-analyse is up-to-date, no model call", again.status === 200 && again.body.outcome === "up-to-date", `${again.status} ${again.body.outcome}`);
    }

    // --- 3. Staleness after new material ----------------------------------
    {
      const second = await upload(learnerA, courseA, "trace-reminder.md", TRACE_REMINDER);
      check("multi-source material uploads", second.status === 201, `status ${second.status}`);
      cleanupMaterials.push({ session: learnerA, courseId: courseA, materialId: second.material?.id });

      const refreshed = await learnerA.fetch(`/api/courses/${courseA}`);
      const body = await refreshed.json();
      check("staleness: new material marks intelligence needs-reanalysis", body.course?.intelligence?.status === "needs-reanalysis", body.course?.intelligence?.status);

      // --- 4. Multi-source concept ----------------------------------------
      const rerun = await analyse(learnerA, courseA);
      check("multi-source: re-analysis succeeds", rerun.status === 200 && rerun.body.course?.intelligence?.status === "ready", `${rerun.status} ${rerun.body.course?.intelligence?.status}`);
      const trace = rerun.body.course.intelligence.concepts.find((concept) => concept.name === "Trace");
      const distinctMaterials = new Set((trace?.evidence ?? []).map((ref) => ref.materialId));
      check("multi-source: one concept cites two materials", distinctMaterials.size === 2, JSON.stringify([...(trace?.evidence ?? [])]));
    }

    // --- 5. Insufficient evidence is a valid success ----------------------
    {
      const empty = await createCourse(learnerA, "Empty course");
      const result = await analyse(learnerA, empty);
      check("insufficient: empty course returns 200", result.status === 200, `status ${result.status}`);
      check("insufficient: recorded honestly", result.body.course?.intelligence?.status === "insufficient-evidence", result.body.course?.intelligence?.status);
      const row = await loadAnalysis(db, empty);
      check("insufficient: no concepts were invented", (await loadConcepts(db, empty)).length === 0);
      check("insufficient: analysis row recorded", row?.status === "insufficient-evidence", row?.status);
    }

    // --- 6. Model returns INSUFFICIENT_EVIDENCE ---------------------------
    {
      const dull = await createCourse(learnerA, "Thin course");
      const dullMaterial = await upload(learnerA, dull, "thin.md", "## Notes\n\nA short and unhelpful note.");
      cleanupMaterials.push({ session: learnerA, courseId: dull, materialId: dullMaterial.material?.id });
      const result = await analyse(learnerA, dull, "insufficient");
      check("model insufficient: accepted", result.status === 200, `status ${result.status}`);
      check("model insufficient: state is insufficient-evidence", result.body.course?.intelligence?.status === "insufficient-evidence", result.body.course?.intelligence?.status);
    }

    // --- 7. Duplicate concepts are merged ---------------------------------
    {
      const dup = await createCourse(learnerA, "Duplicate course");
      const dupMaterial = await upload(learnerA, dup, "dup.md", FATHOM_MARKDOWN);
      cleanupMaterials.push({ session: learnerA, courseId: dup, materialId: dupMaterial.material?.id });
      const result = await analyse(learnerA, dup, "duplicate");
      check("duplicate: accepted", result.status === 200, `status ${result.status}`);
      check("duplicate: merged into one concept", result.body.course?.intelligence?.concepts?.length === 1, `${result.body.course?.intelligence?.concepts?.length}`);
      check("duplicate: merged concept keeps its evidence", (result.body.course?.intelligence?.concepts?.[0]?.evidence?.length ?? 0) >= 1);
    }

    // --- 8. Unverifiable / failed responses are rejected whole ------------
    const failureCases = [
      ["invalid-chunk-id", "invalid chunk id"],
      ["malformed", "malformed structured output"],
      ["provider-failure", "provider failure"],
    ];
    for (const [scenario, label] of failureCases) {
      const course = await createCourse(learnerA, `Failure course (${scenario})`);
      const material = await upload(learnerA, course, "evidence.md", FATHOM_MARKDOWN);
      cleanupMaterials.push({ session: learnerA, courseId: course, materialId: material.material?.id });
      const result = await analyse(learnerA, course, scenario);
      check(`${label}: rejected with 502`, result.status === 502, `status ${result.status} ${JSON.stringify(result.body)}`);
      check(`${label}: no concepts persisted`, (await loadConcepts(db, course)).length === 0, `${(await loadConcepts(db, course)).length}`);
      const row = await loadAnalysis(db, course);
      check(`${label}: analysis recorded as failed`, row?.status === "failed", row?.status);
      check(`${label}: safe error summary recorded`, Boolean(row?.error_summary) && !/chunk-does-not-exist/.test(row?.error_summary ?? ""));
      check(`${label}: raw output never stored`, !(row?.error_summary ?? "").includes("not json at all"));
    }

    // --- 9. Ownership isolation ------------------------------------------
    {
      const foreign = await analyse(learnerB, courseA);
      check("isolation: another learner cannot analyse a course (404)", foreign.status === 404, `status ${foreign.status}`);
      const unauth = await fetch(`${BASE_URL}/api/courses/${courseA}/analyse`, { method: "POST", headers: { origin: TRUSTED_ORIGIN }, redirect: "manual" });
      check("isolation: unauthenticated analyse is refused (401)", unauth.status === 401, `status ${unauth.status}`);
      const stray = await db.query(
        `select count(*)::int as n from concept_evidence e
           join concept c on c.id = e.concept_id
           join course co on co.id = c.course_id
          where co.user_id = (select id from "user" where email = $1)`,
        [emailB],
      );
      check("isolation: learner B has no evidence of their own", stray.rows[0].n === 0, `${stray.rows[0].n}`);
    }

    // --- 10. Phase 5.6 regression: no analysis without evidence ----------
    {
      const seeded = await learnerB.fetch("/api/courses");
      const seededBody = await seeded.json();
      const demo = seededBody.courses?.[0];
      check("regression: seeded workspace has no real evidence", Array.isArray(seededBody.courses) && (demo?.sources ?? []).every((source) => !source.storageReference));
      if (demo) {
        const result = await analyse(learnerB, demo.id);
        check("regression: demo-only course is insufficient-evidence, not analysed", result.body.course?.intelligence?.status === "insufficient-evidence", result.body.course?.intelligence?.status);
        check("regression: demo concepts were not fabricated into intelligence", (result.body.course?.intelligence?.concepts ?? []).length === 0);
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
    for (const email of [emailA, emailB]) {
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
