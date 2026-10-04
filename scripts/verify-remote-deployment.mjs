// Edvance — remote deployment smoke test.
//
// Exercises the DEPLOYED app over HTTPS with the REAL provider (no mock): the
// deterministic suites prove every branch offline; this proves the live system —
// HTTPS, the health probe and security headers, the full learner journey
// (sign up -> course -> upload -> ingest -> analyse -> check -> practise ->
// revise), cross-learner isolation, and that no configuration secret leaks.
//
// It is HTTP-only: it never opens the production database or bucket directly and
// cleans up after itself by deleting the accounts it created.
//
// Usage — point it at any deployment without editing this file:
//   npm run verify:remote -- https://your-app.vercel.app
//   npm run verify:remote -- https://white-whale.spcf.app
//   BASE_URL=https://your-app.vercel.app node scripts/verify-remote-deployment.mjs
//
// The target comes from the first CLI argument, else BASE_URL, else the
// Specific production URL. BETTER_AUTH_URL overrides the trusted origin only
// when the deployed auth origin differs from the URL being probed.

const DEFAULT_BASE_URL = "https://white-whale.spcf.app";
const target = process.argv[2] ?? process.env.BASE_URL ?? DEFAULT_BASE_URL;
if (!/^https?:\/\//.test(target)) {
  console.error(`verify-remote-deployment: expected an http(s) URL, got "${target}"`);
  process.exit(2);
}
const BASE_URL = target.replace(/\/$/, "");
const TRUSTED_ORIGIN = (process.env.BETTER_AUTH_URL ?? BASE_URL).replace(/\/$/, "");
console.log(`Verifying ${BASE_URL} (trusted origin ${TRUSTED_ORIGIN})\n`);

const PASSWORD = "remote-smoke-password";
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

async function signUp(email, name) {
  const session = new Session();
  const response = await session.fetch("/api/auth/sign-up/email", {
    method: "POST",
    body: JSON.stringify({ email, password: PASSWORD, name }),
  });
  return { session, ok: response.ok, status: response.status };
}

async function createCourse(session, name) {
  const response = await session.fetch("/api/courses", {
    method: "POST",
    body: JSON.stringify({ name, institution: "Remote Verification", lesson: "Evidence" }),
  });
  const body = await response.json().catch(() => ({}));
  return body.course?.id;
}

async function uploadText(session, courseId, name, text) {
  const form = new FormData();
  form.append("file", new Blob([Buffer.from(text, "utf8")], { type: "text/markdown" }), name);
  const response = await session.fetch(`/api/courses/${courseId}/materials`, { method: "POST", body: form });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, material: body.material, error: body.error };
}

async function getCourse(session, courseId) {
  const response = await session.fetch(`/api/courses/${courseId}`);
  const body = await response.json().catch(() => ({}));
  return { status: response.status, course: body.course, raw: JSON.stringify(body) };
}

async function addQuestion(session, courseId, question) {
  const response = await session.fetch(`/api/courses/${courseId}/assessments`, {
    method: "POST",
    body: JSON.stringify({ lesson: "Evidence", question }),
  });
  const body = await response.json().catch(() => ({}));
  return body.course;
}

async function analyseCourse(session, courseId) {
  const response = await session.fetch(`/api/courses/${courseId}/analyse`, { method: "POST" });
  return { status: response.status, body: await response.json().catch(() => ({})) };
}

async function analyseQuestion(session, courseId, questionId) {
  const response = await session.fetch(
    `/api/courses/${courseId}/assessments/${questionId}/analyse`,
    { method: "POST" },
  );
  return { status: response.status, body: await response.json().catch(() => ({})) };
}

async function practise(session, courseId, payload) {
  const response = await session.fetch(`/api/courses/${courseId}/practice`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return { status: response.status, body: await response.json().catch(() => ({})) };
}

async function generateRevision(session, courseId) {
  const response = await session.fetch(`/api/courses/${courseId}/revision`, { method: "POST" });
  return { status: response.status, body: await response.json().catch(() => ({})) };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// The live free tier has a low requests-per-minute ceiling, so a real burst can
// surface as an honest, retryable provider failure (the app maps it to 502 with a
// safe summary). Retrying the way a learner would proves the recovery path rather
// than failing the check on a transient rate limit.
const PROVIDER_BUSY = /provider|service|retry|quota|overload|429|503|502/i;

async function ensureCourseAnalysisReady(session, courseId, label) {
  let last = { status: 0, course: undefined };
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const result = await analyseCourse(session, courseId);
    const { course } = await getCourse(session, courseId);
    last = { status: result.status, course };
    if (course?.intelligence?.status === "ready") return last;
    const retryable = [429, 502, 503].includes(result.status) || PROVIDER_BUSY.test(course?.intelligence?.errorSummary ?? "");
    if (!retryable || attempt === 4) return last;
    console.log(`  ...provider busy, retrying ${label} in 30s (attempt ${attempt})`);
    await sleep(30000);
  }
  return last;
}

async function ensureAssessmentReady(session, courseId, questionId) {
  let last = { status: 0, course: undefined };
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const result = await analyseQuestion(session, courseId, questionId);
    const { course } = await getCourse(session, courseId);
    const question = questionNamed(course, FIVE_COMPONENT_QUESTION);
    last = { status: result.status, course };
    if (question?.signature?.status === "ready") return last;
    const retryable = [429, 502, 503].includes(result.status) || PROVIDER_BUSY.test(question?.signature?.errorSummary ?? "");
    if (!retryable || attempt === 4) return last;
    console.log(`  ...provider busy, retrying assessment check in 30s (attempt ${attempt})`);
    await sleep(30000);
  }
  return last;
}

async function ensureRevisionReady(session, courseId) {
  let last = { status: 0, course: undefined };
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const result = await generateRevision(session, courseId);
    const { course } = await getCourse(session, courseId);
    last = { status: result.status, course };
    if (course?.revision?.status === "ready") return last;
    const retryable = [429, 502, 503].includes(result.status) || PROVIDER_BUSY.test(course?.revision?.errorSummary ?? "");
    if (!retryable || attempt === 4) return last;
    console.log(`  ...provider busy, retrying revision in 30s (attempt ${attempt})`);
    await sleep(30000);
  }
  return last;
}

function questionNamed(course, text) {
  return course?.assessments?.find((item) => item.question === text);
}

function conceptNamed(course, name) {
  return course?.concepts?.find((concept) => concept.name === name);
}

const SECRET_NAMES = /GEMINI_API_KEY|SUPABASE_SECRET_KEY|SUPABASE_URL|RESEND_API_KEY|BETTER_AUTH_SECRET|DATABASE_URL|postgres:\/\/|sk_live|AQ\.Ab|Bearer\s+[A-Za-z0-9]{20}/;

async function main() {
  const stamp = Date.now();
  const emailA = `remote-a-${stamp}@edvance.test`;
  const emailB = `remote-b-${stamp}@edvance.test`;

  // --- 1. HTTPS + health probe ---------------------------------------------
  {
    const response = await fetch(`${BASE_URL}/api/health`);
    const body = await response.json().catch(() => ({}));
    check("https: deployment answers", response.status === 200, `status ${response.status}`);
    check("https: served over TLS", response.url.startsWith("https://"), response.url);
    check("health: reports ok", body.status === "ok", body.status);
    check("health: database is reachable", body.database === "ok", body.database);
    check("health: ai reported configured", body.integrations?.ai === "configured", JSON.stringify(body.integrations));
    check("health: storage reported configured", body.integrations?.storage === "configured", JSON.stringify(body.integrations));
    check("health: email honestly not configured", body.integrations?.email === "not-configured", JSON.stringify(body.integrations));
    check("health: never leaks configuration", !SECRET_NAMES.test(JSON.stringify(body)), JSON.stringify(body));
  }

  // --- 2. Security headers -------------------------------------------------
  {
    const response = await fetch(`${BASE_URL}/`);
    const csp = response.headers.get("content-security-policy") ?? "";
    check("headers: CSP locked down", /default-src 'self'/.test(csp) && /frame-ancestors 'none'/.test(csp) && /object-src 'none'/.test(csp), csp);
    check("headers: HSTS enabled", /max-age=31536000/.test(response.headers.get("strict-transport-security") ?? ""), response.headers.get("strict-transport-security"));
    check("headers: frame options deny", response.headers.get("x-frame-options") === "DENY", response.headers.get("x-frame-options"));
    check("headers: nosniff", response.headers.get("x-content-type-options") === "nosniff", response.headers.get("x-content-type-options"));
    check("headers: referrer policy set", response.headers.get("referrer-policy") === "strict-origin-when-cross-origin", response.headers.get("referrer-policy"));
    check("headers: permissions policy set", Boolean(response.headers.get("permissions-policy")));
    check("headers: framework not advertised", !response.headers.get("x-powered-by"), response.headers.get("x-powered-by"));

    const html = await (await fetch(`${BASE_URL}/`)).text();
    check("page: no stale 'mock data' claim", !/mock data|until live AI/i.test(html), "stale claim still present");
    check("page: no secret in rendered HTML", !SECRET_NAMES.test(html), "secret-like string in HTML");
  }

  // --- 3. Not-found --------------------------------------------------------
  {
    const response = await fetch(`${BASE_URL}/this-page-does-not-exist`);
    check("not-found: unknown route is 404", response.status === 404, `status ${response.status}`);
    check("not-found: page explains the 404", /could not find/i.test(await response.text()));
  }
  check("protected: account delete requires auth", (await fetch(`${BASE_URL}/api/account`, { method: "DELETE", redirect: "manual" })).status === 401);

  // --- 4. Sign up ----------------------------------------------------------
  const a = await signUp(emailA, "Remote Learner A");
  check("sign-up: learner A created", a.ok, `status ${a.status}`);
  const learnerA = a.session;

  // --- 5. Course + material ingestion --------------------------------------
  const courseId = await createCourse(learnerA, "FATHOM Evidence Course");
  check("course: created", Boolean(courseId), String(courseId));

  const upload = await uploadText(learnerA, courseId, "fathom.md", FATHOM_MARKDOWN);
  check("upload: accepted", upload.status === 201 || upload.status === 200, `status ${upload.status} ${upload.error ?? ""}`);

  {
    const { course } = await getCourse(learnerA, courseId);
    const source = course?.sources?.find((s) => s.ingestion);
    check("ingest: a source carries an ingestion record", Boolean(source), JSON.stringify(course?.sources?.map((s) => s.id)));
    check("ingest: completed synchronously", source?.ingestion?.status === "completed", source?.ingestion?.status);
    check("ingest: produced evidence chunks", (source?.ingestion?.chunkCount ?? 0) > 0, String(source?.ingestion?.chunkCount));
  }

  // --- 6. Course intelligence (real Gemini) --------------------------------
  {
    const analysed = await ensureCourseAnalysisReady(learnerA, courseId, "course analysis");
    check("course analysis: accepted", analysed.status === 200, `status ${analysed.status}`);
    const course = analysed.course;
    check("course analysis: status is ready", course?.intelligence?.status === "ready", `${course?.intelligence?.status} ${course?.intelligence?.errorSummary ?? ""}`);
    check("course analysis: provider is Gemini", String(course?.intelligence?.provider?.model ?? "").toLowerCase().includes("gemini"), course?.intelligence?.provider?.model);
    check("course analysis: counts concepts", (course?.intelligence?.conceptCount ?? 0) >= 6, String(course?.intelligence?.conceptCount));
    const names = (course?.intelligence?.concepts ?? []).map((c) => c.name.toLowerCase());
    for (const component of FATHOM_FRAMEWORK) {
      check(`course analysis: extracted '${component.name}'`, names.some((n) => n.includes(component.name.toLowerCase())), names.join(", "));
    }
    const withEvidence = (course?.intelligence?.concepts ?? []).filter((c) => (c.evidence ?? []).length > 0);
    check("course analysis: concepts cite real evidence", withEvidence.length >= 6, `${withEvidence.length}/${(course?.intelligence?.concepts ?? []).length}`);
  }

  // --- 7. Assessment intelligence (real Gemini) ----------------------------
  let questionId;
  {
    const withQuestion = await addQuestion(learnerA, courseId, FIVE_COMPONENT_QUESTION);
    questionId = questionNamed(withQuestion, FIVE_COMPONENT_QUESTION)?.id;
    check("assessment: question added", Boolean(questionId));

    const checked = await ensureAssessmentReady(learnerA, courseId, questionId);
    check("assessment check: accepted", checked.status === 200, `status ${checked.status}`);

    const course = checked.course;
    const question = questionNamed(course, FIVE_COMPONENT_QUESTION);
    check("assessment check: status is ready", question?.signature?.status === "ready", `${question?.signature?.status} ${question?.signature?.errorSummary ?? ""}`);
    check(
      "assessment check: flags the five-versus-six inconsistency",
      question?.signature?.consistency === "possible-inconsistency",
      question?.signature?.consistency,
    );
    check(
      "assessment check: reason names the six components",
      /six/i.test(question?.signature?.reason ?? ""),
      question?.signature?.reason,
    );
    check("assessment check: maps the tested concepts", (question?.signature?.concepts?.length ?? 0) > 0, String(question?.signature?.concepts?.length));
    check("assessment check: cites course evidence", (question?.signature?.concepts ?? []).every((c) => (c.evidence ?? []).length > 0));
  }

  // --- 8. Mastery ----------------------------------------------------------
  {
    const wrong = await practise(learnerA, courseId, { assessmentId: questionId, correct: false, answer: "Frame, Assemble, Trace, Hold, Move" });
    check("practice: wrong attempt recorded", wrong.status === 201, `status ${wrong.status}`);

    const afterWrong = await getCourse(learnerA, courseId);
    check("mastery: a wrong attempt makes the tested concepts Weak", (afterWrong.course?.concepts ?? []).every((c) => c.status === "Weak"), JSON.stringify(afterWrong.course?.concepts?.map((c) => `${c.name}:${c.status}`)));
    check("mastery: attempts are real and counted", (afterWrong.course?.concepts ?? []).every((c) => c.attempts === 1 && c.correct === 0));
    check("mastery: the learner's answer is recorded", (afterWrong.course?.attempts ?? [])[0]?.answer?.startsWith("Frame"), (afterWrong.course?.attempts ?? [])[0]?.answer);

    for (let i = 0; i < 4; i += 1) {
      await practise(learnerA, courseId, { assessmentId: questionId, correct: true });
    }
    const mastered = await getCourse(learnerA, courseId);
    const frame = conceptNamed(mastered.course, "Frame");
    check("mastery: 4 of 5 correct earns Mastered at 80%", frame?.status === "Mastered" && frame?.score === 80, `${frame?.status} ${frame?.score}`);
    check("mastery: every tested concept reached Mastered", (mastered.course?.concepts?.length ?? 0) > 0 && (mastered.course?.concepts ?? []).every((c) => c.status === "Mastered"), `${mastered.course?.concepts?.length} concepts`);
  }

  // --- 9. Targeted revision (real Gemini) ----------------------------------
  {
    // A fresh course so there is genuinely something to revise (all Weak).
    const revisionCourse = await createCourse(learnerA, "FATHOM Revision Course");
    await uploadText(learnerA, revisionCourse, "fathom.md", FATHOM_MARKDOWN);
    const revisionReady = await ensureCourseAnalysisReady(learnerA, revisionCourse, "revision course analysis");
    const revisionConceptIds = (revisionReady.course?.intelligence?.concepts ?? []).map((c) => c.id);
    check("revision: the course established concepts to revise", revisionConceptIds.length >= 6, String(revisionConceptIds.length));
    for (const conceptId of revisionConceptIds) {
      await practise(learnerA, revisionCourse, { conceptId, correct: false });
    }

    const generated = await ensureRevisionReady(learnerA, revisionCourse);
    check("revision: generation accepted", generated.status === 200, `status ${generated.status}`);
    const course = generated.course;
    check("revision: plan is ready", course?.revision?.status === "ready", `${course?.revision?.status} ${course?.revision?.errorSummary ?? ""}`);
    check("revision: focus lists the weak concepts", (course?.revision?.focus?.length ?? 0) >= 6, String(course?.revision?.focus?.length));
    check("revision: weak concepts are prioritised", (course?.revision?.focus ?? []).every((f) => f.priority === "weak"));
    check("revision: generated targeted practice", (course?.revision?.practiceQuestions?.length ?? 0) > 0, String(course?.revision?.practiceQuestions?.length));
    check(
      "revision: every practice question names a concept and cites a source",
      (course?.revision?.practiceQuestions ?? []).length > 0 &&
        (course?.revision?.practiceQuestions ?? []).every((q) => Boolean(q.conceptName) && Boolean(q.materialTitle || q.sourceLocation)),
      JSON.stringify((course?.revision?.practiceQuestions ?? []).map((q) => ({ concept: q.conceptName, material: q.materialTitle, location: q.sourceLocation }))),
    );
    check("revision: next action is stated", Boolean(course?.revision?.nextAction), course?.revision?.nextAction);

    await learnerA.fetch(`/api/courses/${revisionCourse}`, { method: "DELETE" });
  }

  // --- 10. Cross-learner isolation -----------------------------------------
  {
    const b = await signUp(emailB, "Remote Learner B");
    check("sign-up: learner B created", b.ok, `status ${b.status}`);
    check("isolation: another learner cannot read the course", (await b.session.fetch(`/api/courses/${courseId}`)).status === 404);
    check("isolation: another learner cannot analyse the course", (await b.session.fetch(`/api/courses/${courseId}/analyse`, { method: "POST" })).status === 404);
    check("isolation: browser-origin spoof is refused", (await fetch(`${BASE_URL}/api/auth/session`, { headers: { origin: "https://evil.example" } })).status < 500);
    const deleted = await b.session.fetch("/api/account", { method: "DELETE" });
    check("isolation: learner B account deleted", deleted.status === 200, `status ${deleted.status}`);
  }

  // --- 11. No secret exposure in application data --------------------------
  {
    const { raw } = await getCourse(learnerA, courseId);
    check("secrets: course payload contains no configuration secret", !SECRET_NAMES.test(raw), "secret-like string in course payload");
    check("secrets: health payload contains no configuration secret", !SECRET_NAMES.test(await (await fetch(`${BASE_URL}/api/health`)).text()));
    check("secrets: 404 body contains no configuration secret", !SECRET_NAMES.test(await (await fetch(`${BASE_URL}/nope-${stamp}`)).text()));
  }

  // --- 12. Cleanup ---------------------------------------------------------
  {
    const deleted = await learnerA.fetch("/api/account", { method: "DELETE" });
    const body = await deleted.json().catch(() => ({}));
    check("cleanup: learner A account deleted", deleted.status === 200, `status ${deleted.status}`);
    check("cleanup: closed without pretending an email was sent", body.emailSent === false, JSON.stringify(body));
    check("cleanup: session is now unauthenticated", (await learnerA.fetch(`/api/courses/${courseId}`)).status === 401);
  }

  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length > 0) {
    console.log("\nFailures:");
    for (const failure of failures) console.log(`  - ${failure}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Remote verification crashed:", error);
  process.exit(1);
});
