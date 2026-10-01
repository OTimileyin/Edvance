// Edvance Phase 8 — Mastery Intelligence end-to-end tests.
//
// Exercises the real practice pipeline against a running dev server started with
// the deterministic test provider enabled:
//
//   EDVANCE_AI_MOCK=simple infisical run --env=dev -- npx next dev -p 3260
//
// Mastery is never set by a model: it is derived from the learner's recorded
// practice attempts by one deterministic rule. These tests record attempts
// through the API and assert that the derived profile changes exactly as the
// attempts justify — and never changes on its own.
//
// The golden fixture is the fictional six-part FATHOM framework used by the
// course- and assessment-intelligence suites; the seeded question asks for
// *five* components while the material teaches *six*.
//
// Usage:
//   BASE_URL=http://localhost:3260 npm run test:mastery
//
// Everything created is deleted again, so the bucket and database return to
// their prior state.

import { Client } from "pg";

const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3260").replace(/\/$/, "");
const TRUSTED_ORIGIN = process.env.BETTER_AUTH_URL ?? BASE_URL;
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set. Run with: infisical run --env=dev -- node scripts/test-mastery-intelligence.mjs");
  process.exit(1);
}

const PASSWORD = "mastery-test-password";
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
const UNCHECKED_QUESTION = "Which component orders the findings?";

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
    body: JSON.stringify({ email, password: PASSWORD, name: "Mastery Learner" }),
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

async function analyseCourse(session, courseId) {
  const response = await session.fetch(`/api/courses/${courseId}/analyse`, { method: "POST" });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

async function analyseQuestion(session, courseId, questionId) {
  const response = await session.fetch(
    `/api/courses/${courseId}/assessments/${questionId}/analyse`,
    { method: "POST" },
  );
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

function findQuestion(course, text) {
  return course?.assessments?.find((item) => item.question === text);
}

function conceptNamed(course, name) {
  return course?.concepts?.find((concept) => concept.name === name);
}

async function countAttempts(db, courseId) {
  const { rows } = await db.query(
    "select count(*)::int as n from practice_attempt where course_id = $1",
    [courseId],
  );
  return rows[0].n;
}

async function loadMastery(db, email, conceptName) {
  const { rows } = await db.query(
    `select m.status, m.score, m.attempt_count, m.correct_count, m.last_attempt_at
       from mastery_state m
       join "user" u on u.id = m.user_id
       join concept c on c.id = m.concept_id
      where u.email = $1 and c.name = $2`,
    [email, conceptName],
  );
  return rows[0];
}

async function main() {
  const stamp = Date.now();
  const db = new Client({ connectionString: DATABASE_URL });
  await db.connect();

  const emailA = `mastery-a-${stamp}@edvance.test`;
  const emailB = `mastery-b-${stamp}@edvance.test`;
  const emailC = `mastery-c-${stamp}@edvance.test`;
  const cleanupMaterials = [];
  let courseA = null;

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
    courseA = await createCourse(learnerA, "Evidence-first method (FATHOM)");
    check("course A created", Boolean(courseA), courseA);
    const golden = await upload(learnerA, courseA, "fathom-framework.md", FATHOM_MARKDOWN);
    cleanupMaterials.push({ session: learnerA, courseId: courseA, materialId: golden.material?.id });
    check(
      "golden fixture uploads and extracts",
      golden.status === 201 && golden.material?.ingestion?.status === "completed",
      `status ${golden.status} ${golden.material?.ingestion?.status}`,
    );

    const analysed = await analyseCourse(learnerA, courseA);
    check(
      "course analysis succeeds with six concepts",
      analysed.status === 200 && analysed.body.course?.intelligence?.concepts?.length === 6,
      `${analysed.status} ${analysed.body.course?.intelligence?.concepts?.length}`,
    );

    const withQuestion = await addQuestion(learnerA, courseA, FIVE_COMPONENT_QUESTION);
    const question = findQuestion(withQuestion, FIVE_COMPONENT_QUESTION);
    await addQuestion(learnerA, courseA, UNCHECKED_QUESTION);
    const checked = await analyseQuestion(learnerA, courseA, question.id);
    const checkedOff = findQuestion(checked.body.course, FIVE_COMPONENT_QUESTION)?.signature;
    check("question is checked against six concepts", checkedOff?.concepts?.length === 6, `${checkedOff?.concepts?.length}`);

    // --- 2. No attempts means Untested, and nothing is invented -------------
    {
      const fresh = await getCourse(learnerA, courseA);
      check("no practice: every concept is Untested", fresh.concepts.every((concept) => concept.status === "Untested"), JSON.stringify(fresh.concepts.map((c) => `${c.name}:${c.status}`)));
      check("no practice: no attempts recorded", (fresh.attempts ?? []).length === 0, `${fresh.attempts?.length}`);
      check("no practice: no attempt rows in the database", (await countAttempts(db, courseA)) === 0);
      check("no practice: concept practice counts are absent", fresh.concepts.every((concept) => !concept.attempts), JSON.stringify(fresh.concepts.map((c) => c.attempts)));
    }

    // --- 3. A single wrong attempt makes the concepts Weak ------------------
    {
      const first = await practise(learnerA, courseA, {
        assessmentId: question.id,
        answer: "Purpose, Role, Objective, Method, Parameters.",
        correct: false,
      });
      check("practice: wrong attempt recorded (201)", first.status === 201, `status ${first.status} ${JSON.stringify(first.body.error ?? "")}`);
      const course = first.body.course;
      check("practice: wrong attempt makes every tested concept Weak", course.concepts.every((concept) => concept.status === "Weak"), JSON.stringify(course.concepts.map((c) => `${c.name}:${c.status}`)));
      check("practice: wrong attempt scores zero", course.concepts.every((concept) => concept.score === 0));
      check("practice: one attempt counted per concept", course.concepts.every((concept) => concept.attempts === 1 && concept.correct === 0), JSON.stringify(course.concepts.map((c) => `${c.attempts}/${c.correct}`)));
      check("practice: the attempt is attributed to all six concepts", (await countAttempts(db, courseA)) === 6, `${await countAttempts(db, courseA)}`);
      check("practice: the answer is stored with the attempt", course.attempts[0]?.answer?.startsWith("Purpose, Role"), course.attempts[0]?.answer);
      check("practice: the attempt names the question", course.attempts[0]?.question === FIVE_COMPONENT_QUESTION, course.attempts[0]?.question);

      const stored = await loadMastery(db, emailA, "Frame");
      check("db: mastery row is Weak", stored?.status === "Weak", stored?.status);
      check("db: mastery row records the attempt count", stored?.attempt_count === 1 && stored?.correct_count === 0, `${stored?.attempt_count}/${stored?.correct_count}`);
      check("db: mastery row records when it was practised", Boolean(stored?.last_attempt_at), String(stored?.last_attempt_at));
    }

    // --- 4. The status only moves as the attempts justify -------------------
    {
      const after = async (correct) =>
        (await practise(learnerA, courseA, { assessmentId: question.id, correct })).body.course;

      const two = await after(true);
      check("ladder: 1 of 2 correct is Developing at 50%", conceptNamed(two, "Frame")?.status === "Developing" && conceptNamed(two, "Frame")?.score === 50, `${conceptNamed(two, "Frame")?.status} ${conceptNamed(two, "Frame")?.score}`);

      const three = await after(true);
      check("ladder: 2 of 3 correct is Developing", conceptNamed(three, "Frame")?.status === "Developing" && conceptNamed(three, "Frame")?.score === 67, `${conceptNamed(three, "Frame")?.status} ${conceptNamed(three, "Frame")?.score}`);

      const four = await after(true);
      check("ladder: 3 of 4 correct is still Developing", conceptNamed(four, "Frame")?.status === "Developing" && conceptNamed(four, "Frame")?.score === 75, `${conceptNamed(four, "Frame")?.status} ${conceptNamed(four, "Frame")?.score}`);

      const five = await after(true);
      check("ladder: 4 of 5 correct earns Mastered at 80%", conceptNamed(five, "Frame")?.status === "Mastered" && conceptNamed(five, "Frame")?.score === 80, `${conceptNamed(five, "Frame")?.status} ${conceptNamed(five, "Frame")?.score}`);
      check("ladder: every concept moved together", five.concepts.every((concept) => concept.status === "Mastered"), JSON.stringify(five.concepts.map((c) => c.status)));
      check("ladder: each concept saw five attempts", five.concepts.every((concept) => concept.attempts === 5 && concept.correct === 4), JSON.stringify(five.concepts.map((c) => `${c.attempts}/${c.correct}`)));
    }

    // --- 5. Practice is attributable and reproducible -----------------------
    {
      const course = await getCourse(learnerA, courseA);
      const frame = conceptNamed(course, "Frame");
      const derived = await db.query(
        `select count(*)::int as total, count(*) filter (where is_correct)::int as correct
           from practice_attempt a
           join concept c on c.id = a.concept_id
          where c.name = 'Frame' and a.course_id = $1`,
        [courseA],
      );
      const { total, correct } = derived.rows[0];
      check(
        "reproducible: stored score equals the attempts that produced it",
        frame.score === Math.round((correct / total) * 100),
        `${frame.score} vs ${correct}/${total}`,
      );
    }

    // --- 6. Practising a single concept leaves the others alone -------------
    {
      const course = await getCourse(learnerA, courseA);
      const frameId = course.intelligence.concepts.find((concept) => concept.name === "Frame")?.id;
      const single = await practise(learnerA, courseA, { conceptId: frameId, correct: false });
      check("concept practice: accepted (201)", single.status === 201, `status ${single.status}`);
      const after = single.body.course;
      check("concept practice: only the practised concept changes", conceptNamed(after, "Frame")?.status === "Developing", conceptNamed(after, "Frame")?.status);
      check("concept practice: the others stay Mastered", after.concepts.filter((concept) => concept.name !== "Frame").every((concept) => concept.status === "Mastered"), JSON.stringify(after.concepts.map((c) => `${c.name}:${c.status}`)));
      check("concept practice: only one new attempt row", (await countAttempts(db, courseA)) === 31, `${await countAttempts(db, courseA)}`);
    }

    // --- 7. A question must be checked before it can be practised -----------
    {
      const course = await getCourse(learnerA, courseA);
      const unchecked = findQuestion(course, UNCHECKED_QUESTION);
      const result = await practise(learnerA, courseA, { assessmentId: unchecked.id, correct: true });
      check("gate: practising an unchecked question is refused (409)", result.status === 409, `status ${result.status}`);
      check("gate: the message points at the Assessments tab", /assessments/i.test(result.body.error ?? ""), result.body.error);
    }

    // --- 8. Input validation ------------------------------------------------
    {
      const noTarget = await practise(learnerA, courseA, { correct: true });
      check("validation: a missing target is refused (400)", noTarget.status === 400, `status ${noTarget.status}`);

      const both = await practise(learnerA, courseA, { assessmentId: question.id, conceptId: question.id, correct: true });
      check("validation: two targets at once are refused (400)", both.status === 400, `status ${both.status}`);

      const notBoolean = await practise(learnerA, courseA, { assessmentId: question.id, correct: "yes" });
      check("validation: a non-boolean verdict is refused (400)", notBoolean.status === 400, `status ${notBoolean.status}`);

      const longAnswer = await practise(learnerA, courseA, { assessmentId: question.id, correct: true, answer: "x".repeat(2001) });
      check("validation: an over-long answer is refused (400)", longAnswer.status === 400, `status ${longAnswer.status}`);

      const unknown = await practise(learnerA, courseA, { conceptId: "concept-does-not-exist", correct: true });
      check("validation: an unknown concept is refused (400)", unknown.status === 400, `status ${unknown.status}`);

      const notJson = await learnerA.fetch(`/api/courses/${courseA}/practice`, { method: "POST", body: "not json" });
      check("validation: a non-JSON body is refused (400)", notJson.status === 400, `status ${notJson.status}`);
    }

    // --- 9. Ownership and isolation ----------------------------------------
    {
      const foreign = await practise(learnerB, courseA, { assessmentId: question.id, correct: true });
      check("isolation: another learner cannot practise a course (404)", foreign.status === 404, `status ${foreign.status}`);

      const unauth = await fetch(`${BASE_URL}/api/courses/${courseA}/practice`, {
        method: "POST",
        headers: { origin: TRUSTED_ORIGIN, "content-type": "application/json" },
        body: JSON.stringify({ assessmentId: question.id, correct: true }),
        redirect: "manual",
      });
      check("isolation: unauthenticated practice is refused (401)", unauth.status === 401, `status ${unauth.status}`);

      const ownCourse = await createCourse(learnerB, "Learner B course");
      const missingQuestion = await practise(learnerB, ownCourse, { assessmentId: question.id, correct: true });
      check("isolation: a question id from another course is not found (404)", missingQuestion.status === 404, `status ${missingQuestion.status}`);

      const ownConcept = await getCourse(learnerA, courseA).then((course) => course.intelligence.concepts[0].id);
      const foreignConcept = await practise(learnerB, ownCourse, { conceptId: ownConcept, correct: true });
      check("isolation: another course's concept is refused (400)", foreignConcept.status === 400, `status ${foreignConcept.status}`);
    }

    // --- 10. Demo workspaces stay demo -------------------------------------
    {
      const seededList = await learnerC.fetch("/api/courses");
      const courses = (await seededList.json()).courses ?? [];
      const seeded = courses.find((course) => (course.sources ?? []).length > 0);
      check("regression: seeded workspace still renders demo mastery", Boolean(seeded) && seeded.concepts.some((concept) => concept.status !== "Untested"), JSON.stringify(seeded?.concepts?.map((c) => c.status)));
      check("regression: seeded workspace has no real attempts", Boolean(seeded) && (seeded.attempts ?? []).length === 0);
      if (seeded) {
        const demoQuestion = seeded.assessments?.[0];
        const result = await practise(learnerC, seeded.id, { assessmentId: demoQuestion?.id, correct: true });
        check("regression: a demo question cannot be practised before the course is analysed (409)", result.status === 409, `status ${result.status}`);
        check("regression: no attempt was written for the demo learner", (await countAttempts(db, seeded.id)) === 0);
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
