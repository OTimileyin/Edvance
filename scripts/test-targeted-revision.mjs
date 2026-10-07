// Edvance Phase 9 — Targeted Revision end-to-end tests.
//
// Exercises the real revision pipeline against a running dev server started with
// the deterministic test provider enabled:
//
//   EDVANCE_AI_MOCK=simple infisical run --env=dev -- npx next dev -p 3260
//
// The recommendation is derived deterministically from mastery and evidence, so
// it appears with no model call. Generating practice is the only model call, and
// it is only ever written for the learner's weak areas, grounded in the evidence
// that teaches them.
//
// The golden fixture is the fictional six-part FATHOM framework used by the
// earlier suites.
//
// Usage:
//   BASE_URL=http://localhost:3260 npm run test:revision
//
// Everything created is deleted again, so the bucket and database return to
// their prior state.

import { Client } from "pg";

const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3260").replace(/\/$/, "");
const TRUSTED_ORIGIN = process.env.BETTER_AUTH_URL ?? BASE_URL;
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error(
    "DATABASE_URL is not set. Run with: infisical run --env=dev -- node scripts/test-targeted-revision.mjs",
  );
  process.exit(1);
}

const PASSWORD = "revision-test-password";
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
  {
    name: "Frame",
    body: "Frame the question before looking for evidence. Write down the exact question the material must answer.",
  },
  {
    name: "Assemble",
    body: "Assemble every source that could answer the question. Gather the materials that bear on it.",
  },
  {
    name: "Trace",
    body: "Trace each claim back to the exact place it appears, and record the page, slide or timestamp.",
  },
  {
    name: "Hold",
    body: "Hold uncertainty. When the evidence is thin, report that instead of guessing an answer.",
  },
  { name: "Order", body: "Order the findings by how strongly the evidence supports them." },
  { name: "Move", body: "Move to the next action the evidence actually justifies." },
];

const FATHOM_MARKDOWN = FATHOM_FRAMEWORK.map(
  (component) => `## ${component.name}\n\n${component.body}`,
).join("\n\n");

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
    body: JSON.stringify({ email, password: PASSWORD, name: "Revision Learner" }),
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
  const response = await session.fetch(`/api/courses/${courseId}/materials`, {
    method: "POST",
    body: form,
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, material: body.material };
}

async function getCourse(session, courseId) {
  const response = await session.fetch(`/api/courses/${courseId}`);
  const body = await response.json().catch(() => ({}));
  return body.course;
}

async function analyseCourse(session, courseId, scenario) {
  const headers = scenario ? { "x-edvance-mock-scenario": scenario } : {};
  const response = await session.fetch(`/api/courses/${courseId}/analyse`, {
    method: "POST",
    headers,
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

async function generateRevision(session, courseId, scenario) {
  const headers = scenario ? { "x-edvance-mock-scenario": scenario } : {};
  const response = await session.fetch(`/api/courses/${courseId}/revision`, {
    method: "POST",
    headers,
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

async function practise(session, courseId, payload) {
  const response = await session.fetch(`/api/courses/${courseId}/practice`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

function conceptNamed(course, name) {
  return course?.concepts?.find((concept) => concept.name === name);
}

function conceptIdNamed(course, name) {
  return course?.intelligence?.concepts?.find((concept) => concept.name === name)?.id;
}

async function countQuestions(db, courseId) {
  const { rows } = await db.query(
    "select count(*)::int as n from practice_question where course_id = $1",
    [courseId],
  );
  return rows[0].n;
}

async function loadPlan(db, courseId) {
  const { rows } = await db.query(
    `select status, error_code, error_summary, generated_for, question_count, provider_metadata
       from revision_plan where course_id = $1`,
    [courseId],
  );
  return rows[0];
}

async function prepareCourse(session, name) {
  const courseId = await createCourse(session, name);
  const material = await upload(session, courseId, "fathom-framework.md", FATHOM_MARKDOWN);
  await analyseCourse(session, courseId);
  return { courseId, materialId: material.material?.id };
}

async function masterConcept(session, courseId, conceptId, times) {
  for (let i = 0; i < times; i += 1) {
    await practise(session, courseId, { conceptId, correct: true });
  }
}

async function main() {
  const stamp = Date.now();
  const db = new Client({ connectionString: DATABASE_URL });
  await db.connect();

  const emailA = `revision-a-${stamp}@edvance.test`;
  const emailB = `revision-b-${stamp}@edvance.test`;
  const emailC = `revision-c-${stamp}@edvance.test`;
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

    // --- 1. The recommendation is deterministic, with no generation --------
    const prepared = await prepareCourse(learnerA, "Evidence-first method (FATHOM)");
    const courseA = prepared.courseId;
    cleanupMaterials.push({
      session: learnerA,
      courseId: courseA,
      materialId: prepared.materialId,
    });
    check(
      "course analysed with six concepts",
      conceptIdNamed(await getCourse(learnerA, courseA), "Frame") !== undefined,
    );

    {
      const course = await getCourse(learnerA, courseA);
      const revision = course.revision;
      check(
        "recommendation: state starts not-analyzed",
        revision.status === "not-analyzed",
        revision.status,
      );
      check(
        "recommendation: every untested concept is in focus",
        revision.focus.length === 6,
        `${revision.focus.length}`,
      );
      check(
        "recommendation: focus concepts are all Untested",
        revision.focus.every(
          (entry) => entry.status === "Untested" && entry.priority === "untested",
        ),
        JSON.stringify(revision.focus.map((f) => `${f.name}:${f.status}`)),
      );
      check(
        "recommendation: names the smallest next action",
        /^Practise “.+ next —/.test(revision.nextAction),
        revision.nextAction,
      );
      check(
        "recommendation: the action points at real evidence",
        /\(Section: .+\)/.test(revision.nextAction),
        revision.nextAction,
      );
      check("recommendation: no practice exists yet", revision.practiceQuestions.length === 0);
      check(
        "recommendation: no attempt was made on the model",
        (await loadPlan(db, courseA))?.provider_metadata == null,
        JSON.stringify(await loadPlan(db, courseA)),
      );
    }

    // --- 2. A course must be analysed before practice is generated ---------
    {
      const thin = await createCourse(learnerA, "Unanalysed course");
      const material = await upload(learnerA, thin, "notes.md", "## Notes\n\nA short note.");
      cleanupMaterials.push({
        session: learnerA,
        courseId: thin,
        materialId: material.material?.id,
      });
      const result = await generateRevision(learnerA, thin);
      check(
        "gate: generation before analysis is refused (409)",
        result.status === 409,
        `status ${result.status}`,
      );
      check(
        "gate: the message tells the learner to analyse the course",
        /analyse the course/i.test(result.body.error ?? ""),
        result.body.error,
      );
    }

    // --- 3. Targeted generation, grounded in evidence ---------------------
    {
      const first = await generateRevision(learnerA, courseA);
      check(
        "generation: accepted (200)",
        first.status === 200,
        `status ${first.status} ${JSON.stringify(first.body.error ?? "")}`,
      );
      check(
        "generation: outcome is generated",
        first.body.outcome === "generated",
        first.body.outcome,
      );
      const revision = first.body.course.revision;
      check("generation: state is ready", revision.status === "ready", revision.status);
      check(
        "generation: one question per weak concept",
        revision.practiceQuestions.length === 6,
        `${revision.practiceQuestions.length}`,
      );

      const focusIds = new Set(revision.focus.map((entry) => entry.conceptId));
      check(
        "generation: every question targets a real weak concept",
        revision.practiceQuestions.every((question) => focusIds.has(question.conceptId)),
        JSON.stringify(revision.practiceQuestions.map((q) => q.conceptId)),
      );
      check(
        "generation: every question has text",
        revision.practiceQuestions.every((question) => Boolean(question.question)),
      );
      check(
        "generation: every question cites a real location",
        revision.practiceQuestions.every((question) =>
          question.sourceLocation?.startsWith("Section: "),
        ),
        JSON.stringify(revision.practiceQuestions.map((q) => q.sourceLocation)),
      );
      check(
        "generation: every question names a concept",
        revision.practiceQuestions.every((question) => Boolean(question.conceptName)),
      );

      check(
        "db: questions persisted",
        (await countQuestions(db, courseA)) === 6,
        `${await countQuestions(db, courseA)}`,
      );
      const plan = await loadPlan(db, courseA);
      check(
        "db: plan is ready with a question count",
        plan?.status === "ready" && plan?.question_count === 6,
        `${plan?.status}/${plan?.question_count}`,
      );
      check(
        "db: safe provider metadata stored",
        Boolean(plan?.provider_metadata?.model),
        JSON.stringify(plan?.provider_metadata),
      );
      check(
        "db: the plan records the weak-area fingerprint",
        Boolean(plan?.generated_for?.startsWith("v1:")),
        plan?.generated_for,
      );

      const foreign = await db.query(
        `select count(*)::int as n
           from practice_question q
           join concept c on c.id = q.concept_id
          where q.course_id = $1 and c.course_id <> $1`,
        [courseA],
      );
      check(
        "db: no question points at another course's concept",
        foreign.rows[0].n === 0,
        `${foreign.rows[0].n}`,
      );
    }

    // --- 4. Cost control ---------------------------------------------------
    {
      const again = await generateRevision(learnerA, courseA);
      check(
        "cost control: a second generation is up-to-date",
        again.status === 200 && again.body.outcome === "up-to-date",
        `${again.status} ${again.body.outcome}`,
      );
      check(
        "cost control: questions were not duplicated",
        (await countQuestions(db, courseA)) === 6,
        `${await countQuestions(db, courseA)}`,
      );
    }

    // --- 5. Mastery re-targets the recommendation --------------------------
    {
      const frameId = conceptIdNamed(await getCourse(learnerA, courseA), "Frame");
      await masterConcept(learnerA, courseA, frameId, 3);
      const wrong = await practise(learnerA, courseA, {
        conceptId: conceptIdNamed(await getCourse(learnerA, courseA), "Assemble"),
        correct: false,
      });
      check(
        "practice: a wrong attempt is recorded",
        wrong.status === 201,
        `status ${wrong.status}`,
      );

      const course = await getCourse(learnerA, courseA);
      const revision = course.revision;
      check(
        "re-target: mastery moved (Frame Mastered, Assemble Weak)",
        conceptNamed(course, "Frame")?.status === "Mastered" &&
          conceptNamed(course, "Assemble")?.status === "Weak",
        `${conceptNamed(course, "Frame")?.status}/${conceptNamed(course, "Assemble")?.status}`,
      );
      check(
        "re-target: the stored plan is now stale",
        revision.status === "needs-reanalysis",
        revision.status,
      );
      check(
        "re-target: a Mastered concept leaves the focus",
        !revision.focus.some((entry) => entry.name === "Frame"),
        JSON.stringify(revision.focus.map((f) => f.name)),
      );
      check(
        "re-target: the weakest concept is recommended first",
        revision.focus[0]?.name === "Assemble" && revision.focus[0]?.priority === "weak",
        JSON.stringify(revision.focus[0]),
      );
      check(
        "re-target: the next action names the weak concept",
        /Assemble/.test(revision.nextAction),
        revision.nextAction,
      );

      const regenerated = await generateRevision(learnerA, courseA);
      check(
        "re-target: regeneration accepted",
        regenerated.status === 200 && regenerated.body.outcome === "generated",
        `${regenerated.status} ${regenerated.body.outcome}`,
      );
      const after = regenerated.body.course.revision;
      check(
        "re-target: practice now targets only the weak areas",
        after.practiceQuestions.length === 5,
        `${after.practiceQuestions.length}`,
      );
      check(
        "re-target: no practice for the Mastered concept",
        after.practiceQuestions.every((question) => question.conceptName !== "Frame"),
        JSON.stringify(after.practiceQuestions.map((q) => q.conceptName)),
      );
      check(
        "re-target: stored questions were replaced",
        (await countQuestions(db, courseA)) === 5,
        `${await countQuestions(db, courseA)}`,
      );
    }

    // --- 6. Nothing left to revise ----------------------------------------
    {
      const course = await getCourse(learnerA, courseA);
      const byName = new Map(
        course.intelligence.concepts.map((concept) => [concept.name, concept.id]),
      );
      // Bring every remaining concept to Mastered.
      await masterConcept(learnerA, courseA, byName.get("Assemble"), 4);
      for (const name of ["Trace", "Hold", "Order", "Move"]) {
        await masterConcept(learnerA, courseA, byName.get(name), 3);
      }

      const refreshed = await getCourse(learnerA, courseA);
      check(
        "all mastered: no concept needs revision",
        refreshed.revision.focus.length === 0,
        JSON.stringify(refreshed.revision.focus.map((f) => f.name)),
      );
      check(
        "all mastered: the recommendation says so",
        /Every concept is Mastered/.test(refreshed.revision.nextAction),
        refreshed.revision.nextAction,
      );

      const result = await generateRevision(learnerA, courseA);
      check(
        "all mastered: generation records nothing-to-revise",
        result.status === 200 && result.body.outcome === "nothing-to-revise",
        `${result.status} ${result.body.outcome}`,
      );
      check(
        "all mastered: no questions were written",
        (await countQuestions(db, courseA)) === 0,
        `${await countQuestions(db, courseA)}`,
      );
    }

    // --- 7. Unverifiable output is rejected whole --------------------------
    const failureCases = [
      ["invalid-concept-id", "invalid concept id"],
      ["invalid-chunk-id", "invalid chunk id"],
      ["malformed", "malformed structured output"],
      ["provider-failure", "provider failure"],
    ];
    for (const [scenario, label] of failureCases) {
      const course = await prepareCourse(learnerA, `Revision failure (${scenario})`);
      cleanupMaterials.push({
        session: learnerA,
        courseId: course.courseId,
        materialId: course.materialId,
      });
      const result = await generateRevision(learnerA, course.courseId, scenario);
      check(
        `${label}: rejected with 502`,
        result.status === 502,
        `status ${result.status} ${JSON.stringify(result.body)}`,
      );
      check(
        `${label}: no practice persisted`,
        (await countQuestions(db, course.courseId)) === 0,
        `${await countQuestions(db, course.courseId)}`,
      );
      const plan = await loadPlan(db, course.courseId);
      check(`${label}: plan recorded as failed`, plan?.status === "failed", plan?.status);
      check(
        `${label}: safe error summary recorded`,
        Boolean(plan?.error_summary) &&
          !/chunk-does-not-exist|concept-does-not-exist/.test(plan?.error_summary ?? ""),
        plan?.error_summary,
      );
      check(
        `${label}: raw output never stored`,
        !(plan?.error_summary ?? "").includes("not json at all"),
      );
    }

    // --- 8. Insufficient evidence is a valid outcome -----------------------
    {
      const course = await prepareCourse(learnerA, "Revision insufficient");
      cleanupMaterials.push({
        session: learnerA,
        courseId: course.courseId,
        materialId: course.materialId,
      });
      const result = await generateRevision(learnerA, course.courseId, "insufficient");
      check("insufficient: accepted (200)", result.status === 200, `status ${result.status}`);
      check(
        "insufficient: outcome is insufficient-evidence",
        result.body.outcome === "insufficient-evidence",
        result.body.outcome,
      );
      check(
        "insufficient: state is insufficient-evidence",
        result.body.course.revision.status === "insufficient-evidence",
        result.body.course.revision.status,
      );
      check(
        "insufficient: no questions were invented",
        (await countQuestions(db, course.courseId)) === 0,
      );
    }

    // --- 9. Ownership and isolation ---------------------------------------
    {
      const foreign = await generateRevision(learnerB, courseA);
      check(
        "isolation: another learner cannot generate for a course (404)",
        foreign.status === 404,
        `status ${foreign.status}`,
      );

      const unauth = await fetch(`${BASE_URL}/api/courses/${courseA}/revision`, {
        method: "POST",
        headers: { origin: TRUSTED_ORIGIN },
        redirect: "manual",
      });
      check(
        "isolation: unauthenticated generation is refused (401)",
        unauth.status === 401,
        `status ${unauth.status}`,
      );
    }

    // --- 10. Demo workspaces stay demo ------------------------------------
    {
      const seededList = await learnerC.fetch("/api/courses");
      const courses = (await seededList.json()).courses ?? [];
      const seeded = courses.find((course) => (course.sources ?? []).length > 0);
      check(
        "regression: seeded workspace has no recommendation",
        Boolean(seeded) &&
          seeded.revision.focus.length === 0 &&
          seeded.revision.practiceQuestions.length === 0,
      );
      check(
        "regression: seeded recommendation tells the learner what to do",
        Boolean(seeded) && /analyse the course/i.test(seeded.revision.nextAction),
        seeded?.revision?.nextAction,
      );
      if (seeded) {
        const result = await generateRevision(learnerC, seeded.id);
        check(
          "regression: a demo course refuses generation until analysed (409)",
          result.status === 409,
          `status ${result.status}`,
        );
        check(
          "regression: no practice was written for the demo learner",
          (await countQuestions(db, seeded.id)) === 0,
        );
      }
    }
  } finally {
    for (const entry of cleanupMaterials) {
      if (!entry.materialId) continue;
      try {
        await entry.session.fetch(`/api/courses/${entry.courseId}/materials/${entry.materialId}`, {
          method: "DELETE",
        });
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
