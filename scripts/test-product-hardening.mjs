// Edvance Phase 10 — Product Completion & Hardening end-to-end tests.
//
// Exercises the completed product against a running dev server (the deterministic
// provider is fine; nothing here needs a model):
//
//   EDVANCE_AI_MOCK=simple infisical run --env=dev -- npx next dev -p 3260
//
// Covers the health probe and security headers, the error/not-found pages, course
// and question edit/delete, and the account lifecycle (including storage cleanup).
//
// Usage:
//   BASE_URL=http://localhost:3260 npm run test:hardening
//
// Everything created is deleted again, so the bucket and database return to
// their prior state.

import { Client } from "pg";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3260").replace(/\/$/, "");
const TRUSTED_ORIGIN = process.env.BETTER_AUTH_URL ?? BASE_URL;
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error(
    "DATABASE_URL is not set. Run with: infisical run --env=dev -- node scripts/test-product-hardening.mjs",
  );
  process.exit(1);
}

const PASSWORD = "hardening-test-password";
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

const NOTE_MARKDOWN = "## Trace\n\nTrace each claim back to the exact place it appears.";

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
    body: JSON.stringify({ email, password: PASSWORD, name: "Hardening Learner" }),
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
  return { status: response.status, course: body.course };
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
  return session.fetch(`/api/courses/${courseId}/analyse`, { method: "POST" });
}

async function analyseQuestion(session, courseId, questionId) {
  return session.fetch(`/api/courses/${courseId}/assessments/${questionId}/analyse`, {
    method: "POST",
  });
}

function findQuestion(course, text) {
  return course?.assessments?.find((item) => item.question === text);
}

/** Counts stored objects by walking the bucket, since `list` returns folders too. */
async function bucketCount() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false },
  });
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  let total = 0;
  async function walk(prefix) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });
    if (error || !data) return;
    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      // Folders come back without metadata; files carry it.
      if (entry.metadata) total += 1;
      else await walk(path);
    }
  }
  await walk("");
  return total;
}

async function main() {
  const stamp = Date.now();
  const db = new Client({ connectionString: DATABASE_URL });
  await db.connect();

  const emailA = `hardening-a-${stamp}@edvance.test`;
  const emailDelete = `hardening-del-${stamp}@edvance.test`;
  const cleanupMaterials = [];

  try {
    // --- 1. Health probe ---------------------------------------------------
    {
      const response = await fetch(`${BASE_URL}/api/health`);
      const body = await response.json().catch(() => ({}));
      check("health: responds 200", response.status === 200, `status ${response.status}`);
      check("health: reports ok", body.status === "ok", body.status);
      check("health: database is up", body.database === "ok", body.database);
      check(
        "health: reports integration state",
        Boolean(body.integrations) && "ai" in body.integrations,
        JSON.stringify(body.integrations),
      );
      check(
        "health: never leaks secrets",
        !JSON.stringify(body).match(/key|secret|password/i),
        JSON.stringify(body),
      );
    }

    // --- 2. Security headers ----------------------------------------------
    {
      const response = await fetch(`${BASE_URL}/`);
      const csp = response.headers.get("content-security-policy") ?? "";
      check(
        "headers: CSP present and locked down",
        /default-src 'self'/.test(csp) && /frame-ancestors 'none'/.test(csp),
        csp,
      );
      check(
        "headers: frame options deny",
        response.headers.get("x-frame-options") === "DENY",
        response.headers.get("x-frame-options"),
      );
      check("headers: nosniff", response.headers.get("x-content-type-options") === "nosniff");
      check(
        "headers: referrer policy set",
        response.headers.get("referrer-policy") === "strict-origin-when-cross-origin",
        response.headers.get("referrer-policy"),
      );
      check("headers: permissions policy set", Boolean(response.headers.get("permissions-policy")));
      check(
        "headers: framework is not advertised",
        !response.headers.get("x-powered-by"),
        response.headers.get("x-powered-by"),
      );
    }

    // --- 3. Not-found page -------------------------------------------------
    {
      const response = await fetch(`${BASE_URL}/this-page-does-not-exist`);
      const text = await response.text();
      check(
        "not-found: unknown route returns 404",
        response.status === 404,
        `status ${response.status}`,
      );
      check("not-found: page explains the 404", /could not find/i.test(text), text.slice(0, 80));
    }

    // --- 4. Course edit and delete ----------------------------------------
    const a = await signUp(emailA);
    check("sign-up: learner A", a.ok, `status ${a.status}`);
    const learnerA = a.session;

    const courseId = await createCourse(learnerA, "Original course name");
    check("course created", Boolean(courseId));

    {
      const rename = await learnerA.fetch(`/api/courses/${courseId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: "Renamed course", lesson: "Lesson two" }),
      });
      const body = await rename.json().catch(() => ({}));
      check("course edit: accepted", rename.status === 200, `status ${rename.status}`);
      check(
        "course edit: name and lesson updated",
        body.course?.name === "Renamed course" && body.course?.lesson === "Lesson two",
        `${body.course?.name}/${body.course?.lesson}`,
      );

      const empty = await learnerA.fetch(`/api/courses/${courseId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: "   " }),
      });
      check(
        "course edit: an empty name is refused (400)",
        empty.status === 400,
        `status ${empty.status}`,
      );

      const mismatch = await learnerA.fetch(`/api/courses/nonexistent-course`, {
        method: "PATCH",
        body: JSON.stringify({ name: "Nope" }),
      });
      check(
        "course edit: an unknown course is not found (404)",
        mismatch.status === 404,
        `status ${mismatch.status}`,
      );
    }

    // --- 5. Assessment edit invalidates the check -------------------------
    {
      const material = await upload(learnerA, courseId, "trace.md", NOTE_MARKDOWN);
      cleanupMaterials.push({ session: learnerA, courseId, materialId: material.material?.id });
      await analyseCourse(learnerA, courseId);
      const withQuestion = await addQuestion(
        learnerA,
        courseId,
        "Why record where a claim appears?",
      );
      const question = findQuestion(withQuestion, "Why record where a claim appears?");
      await analyseQuestion(learnerA, courseId, question.id);
      const checked = await getCourse(learnerA, courseId);
      check(
        "question edit: starts checked",
        findQuestion(checked.course, "Why record where a claim appears?")?.signature?.status ===
          "ready",
        findQuestion(checked.course, "Why record where a claim appears?")?.signature?.status,
      );

      const edit = await learnerA.fetch(`/api/courses/${courseId}/assessments/${question.id}`, {
        method: "PATCH",
        body: JSON.stringify({ question: "Why must a claim be traced to a location?" }),
      });
      const body = await edit.json().catch(() => ({}));
      check("question edit: accepted", edit.status === 200, `status ${edit.status}`);
      const edited = findQuestion(body.course, "Why must a claim be traced to a location?");
      check("question edit: wording updated", Boolean(edited), "not found");
      check(
        "question edit: the stale check was discarded",
        edited?.signature?.status === "not-analyzed",
        edited?.signature?.status,
      );
      const mappings = await db.query(
        "select count(*)::int as n from source_mapping where assessment_question_id = $1",
        [question.id],
      );
      check(
        "question edit: source mappings were cleared",
        mappings.rows[0].n === 0,
        `${mappings.rows[0].n}`,
      );

      const emptyEdit = await learnerA.fetch(
        `/api/courses/${courseId}/assessments/${question.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ question: "" }),
        },
      );
      check(
        "question edit: an empty question is refused (400)",
        emptyEdit.status === 400,
        `status ${emptyEdit.status}`,
      );

      // --- 6. Assessment delete ------------------------------------------
      const remove = await learnerA.fetch(`/api/courses/${courseId}/assessments/${question.id}`, {
        method: "DELETE",
      });
      const removeBody = await remove.json().catch(() => ({}));
      check("question delete: accepted", remove.status === 200, `status ${remove.status}`);
      check(
        "question delete: the question is gone",
        removeBody.course?.assessments?.length === 0,
        `${removeBody.course?.assessments?.length}`,
      );
      const orphan = await db.query(
        "select count(*)::int as n from assessment_question where id = $1",
        [question.id],
      );
      check("question delete: the row is removed", orphan.rows[0].n === 0, `${orphan.rows[0].n}`);
    }

    // --- 7. Course delete removes storage ---------------------------------
    {
      const before = await bucketCount();
      const doomed = await createCourse(learnerA, "Doomed course");
      const material = await upload(learnerA, doomed, "doomed.md", NOTE_MARKDOWN);
      check(
        "course delete: material uploaded",
        material.status === 201,
        `status ${material.status}`,
      );
      cleanupMaterials.push({
        session: learnerA,
        courseId: doomed,
        materialId: material.material?.id,
      });
      check(
        "course delete: an object now exists",
        (await bucketCount()) === before + 1,
        `${before} -> ${await bucketCount()}`,
      );

      const remove = await learnerA.fetch(`/api/courses/${doomed}`, { method: "DELETE" });
      const body = await remove.json().catch(() => ({}));
      check(
        "course delete: accepted",
        remove.status === 200 && body.deleted === true,
        `${remove.status} ${JSON.stringify(body)}`,
      );
      const gone = await getCourse(learnerA, doomed);
      check(
        "course delete: the course is gone (404)",
        gone.status === 404,
        `status ${gone.status}`,
      );
      check(
        "course delete: the stored object was removed",
        (await bucketCount()) === before,
        `${await bucketCount()} vs ${before}`,
      );
      const rows = await db.query("select count(*)::int as n from course where id = $1", [doomed]);
      check("course delete: the row is removed", rows.rows[0].n === 0, `${rows.rows[0].n}`);
    }

    // --- 8. Account lifecycle ---------------------------------------------
    {
      const unauth = await fetch(`${BASE_URL}/api/account`, {
        method: "DELETE",
        redirect: "manual",
      });
      check(
        "account delete: unauthenticated is refused (401)",
        unauth.status === 401,
        `status ${unauth.status}`,
      );

      const d = await signUp(emailDelete);
      check("account delete: learner signed up", d.ok, `status ${d.status}`);
      const before = await bucketCount();
      const doomedCourse = await createCourse(d.session, "Account course");
      const material = await upload(d.session, doomedCourse, "account.md", NOTE_MARKDOWN);
      check(
        "account delete: course and material created",
        material.status === 201,
        `status ${material.status}`,
      );

      const remove = await d.session.fetch("/api/account", { method: "DELETE" });
      const body = await remove.json().catch(() => ({}));
      check(
        "account delete: accepted",
        remove.status === 200 && body.deleted === true,
        `${remove.status} ${JSON.stringify(body)}`,
      );
      check(
        "account delete: honest about email when unconfigured",
        body.emailSent === false,
        `${body.emailSent}`,
      );

      const after = await d.session.fetch("/api/courses");
      check(
        "account delete: the session is dead (401)",
        after.status === 401,
        `status ${after.status}`,
      );

      const users = await db.query('select count(*)::int as n from "user" where email = $1', [
        emailDelete,
      ]);
      check("account delete: the account row is gone", users.rows[0].n === 0, `${users.rows[0].n}`);
      const courses = await db.query("select count(*)::int as n from course where id = $1", [
        doomedCourse,
      ]);
      check(
        "account delete: owned courses cascade away",
        courses.rows[0].n === 0,
        `${courses.rows[0].n}`,
      );
      check(
        "account delete: stored objects were removed",
        (await bucketCount()) === before,
        `${await bucketCount()} vs ${before}`,
      );
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
    for (const email of [emailA, emailDelete]) {
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
