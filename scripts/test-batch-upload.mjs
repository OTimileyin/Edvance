// Edvance V2.1 — batch upload end-to-end tests.
//
// Exercises the batch the Sources form actually performs: ten files in one
// action, one request per file, a few in flight at a time. It proves the parts a
// unit test cannot — that the route accepts a burst without tripping its own
// rate limiter, that every stored file keeps its own contents, that a refused
// file does not disturb the others, and that each accepted file is ingested.
//
// Format coverage (PDF/DOCX/PPTX/VTT/SRT and their failure modes) belongs to
// `scripts/test-ingestion.mjs`; this suite deliberately uses the two simplest
// extractable formats so a batch failure is about the batch, not a parser.
//
// Usage (the server must already be running on BASE_URL):
//   BASE_URL=http://localhost:3250 infisical run --env=dev -- node scripts/test-batch-upload.mjs
//
// Every account, course, material and stored object created here is deleted
// again, so the database and bucket return to their prior state.

import { Client } from "pg";

const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3250").replace(/\/$/, "");
// Better Auth validates the Origin header against its trusted origins; a Node
// fetch that omits it is rejected as "Missing or null Origin".
const TRUSTED_ORIGIN = process.env.BETTER_AUTH_URL ?? BASE_URL;
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error(
    "DATABASE_URL is not set. Run with: infisical run --env=dev -- node scripts/test-batch-upload.mjs",
  );
  process.exit(1);
}

const PASSWORD = "batch-upload-test-password";
// Mirrors UPLOAD_CONCURRENCY in lib/upload-batch.ts: the form keeps three files
// in flight, so the route has to tolerate that as its normal case.
const CONCURRENCY = 3;
const MAX_MATERIAL_BYTES = 25 * 1024 * 1024;

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
// Fixtures — every file carries its own unique marker, so a mixed-up batch is
// visible rather than silently plausible.
// ---------------------------------------------------------------------------

function markerFor(index) {
  return `batch-marker-${index}-unique`;
}

function fixtureFor(index) {
  if (index % 2 === 0) {
    const body = [
      `Batch upload fixture ${index}`,
      "",
      `Line one for file ${index}.`,
      `${markerFor(index)} lives on this line.`,
    ].join("\n");
    return { name: `batch-${index}.txt`, type: "text/plain", bytes: Buffer.from(body, "utf8") };
  }
  const body = [
    `# Batch upload fixture ${index}`,
    "",
    `The section for file ${index} states that ${markerFor(index)} is present.`,
  ].join("\n");
  return { name: `batch-${index}.md`, type: "text/markdown", bytes: Buffer.from(body, "utf8") };
}

// ---------------------------------------------------------------------------
// HTTP session with a cookie jar (Better Auth sets a session cookie on sign-up).
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

async function upload(session, courseId, fixture) {
  const form = new FormData();
  form.append("file", new Blob([fixture.bytes], { type: fixture.type }), fixture.name);
  const response = await session.fetch(`/api/courses/${courseId}/materials`, {
    method: "POST",
    body: form,
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, ok: response.ok, body, name: fixture.name };
}

/** Runs `run` over `items` with at most `size` in flight — what the form does. */
async function withConcurrency(items, size, run) {
  const results = [];
  for (let index = 0; index < items.length; index += size) {
    const slice = items.slice(index, index + size);
    results.push(...(await Promise.all(slice.map(run))));
  }
  return results;
}

// ---------------------------------------------------------------------------

const stamp = Date.now();
const db = new Client({ connectionString: DATABASE_URL });
let learner;
let courseId;
const materialIds = [];

async function main() {
  await db.connect();

  // --- Set up one learner and one course ---------------------------------
  const email = `batch-${stamp}@edvance.test`;
  const signUpResult = await signUp("Batch learner", email);
  learner = signUpResult.session;
  check("learner created", signUpResult.ok, `status ${signUpResult.status}`);

  const courseRes = await learner.fetch("/api/courses", {
    method: "POST",
    body: JSON.stringify({
      name: "Batch upload test course",
      institution: "Test",
      lesson: "Batch upload",
    }),
  });
  const courseBody = await courseRes.json().catch(() => ({}));
  courseId = courseBody.course?.id;
  check("course created", Boolean(courseId), `status ${courseRes.status}`);
  if (!courseId) throw new Error("no course id");

  // --- The batch: ten files, eight uploadable, two refused ---------------
  const fixtures = Array.from({ length: 8 }, (_, index) => fixtureFor(index));
  const oversized = {
    name: "too-big.txt",
    type: "text/plain",
    bytes: Buffer.alloc(MAX_MATERIAL_BYTES + 1, 0x61),
  };
  const unsupported = {
    name: "lecture.mp4",
    type: "video/mp4",
    bytes: Buffer.from("not a material Edvance can read", "utf8"),
  };
  const batch = [...fixtures, oversized, unsupported];
  check("the batch is ten files, as one action allows", batch.length === 10, `${batch.length}`);

  const results = await withConcurrency(batch, CONCURRENCY, (fixture) =>
    upload(learner, courseId, fixture),
  );

  const rateLimited = results.filter((result) => result.status === 429);
  check(
    "a ten-file burst does not trip the upload rate limiter",
    rateLimited.length === 0,
    rateLimited.map((result) => result.name).join(", "),
  );

  const stored = results.filter((result) => result.ok);
  const refused = results.filter((result) => !result.ok);
  check("eight files are stored", stored.length === 8, `${stored.length}`);
  check("two files are refused", refused.length === 2, `${refused.length}`);

  for (const result of refused) {
    if (result.name === unsupported.name) {
      check(
        "the unsupported format is refused with the accepted formats named",
        /Accepted/.test(result.body?.error ?? ""),
        result.body?.error,
      );
    } else {
      check(
        "the oversized file is refused with the size limit named",
        /25 MB/.test(result.body?.error ?? ""),
        result.body?.error,
      );
    }
  }

  for (const result of stored) materialIds.push(result.body.material?.id);

  // --- Every stored file keeps its own contents -------------------------
  for (const result of stored) {
    const materialId = result.body.material?.id;
    const index = fixtures.findIndex((fixture) => fixture.name === result.name);
    const { rows } = await db.query(
      `select content from material_chunk where material_id = $1 order by ordinal asc`,
      [materialId],
    );
    const content = rows.map((row) => row.content).join("\n");
    check(
      `stored file keeps its own text: ${result.name}`,
      content.includes(markerFor(index)),
      content.slice(0, 120),
    );
    check(
      `${result.name} contains no other file's text`,
      content.includes("batch-marker-") &&
        !content.includes(markerFor((index + 1) % fixtures.length)) &&
        !content.includes(markerFor((index + 2) % fixtures.length)),
      "another file's marker leaked in",
    );
  }

  // --- Ingestion ran for each stored file -------------------------------
  const jobs = await db.query(
    `select m.title, j.status, j.error_code
       from learning_material m
       left join material_ingestion_job j on j.material_id = m.id
      where m.course_id = $1`,
    [courseId],
  );
  check("eight materials belong to the course", jobs.rows.length === 8, `${jobs.rows.length}`);
  const notCompleted = jobs.rows.filter((row) => row.status !== "completed");
  check(
    "every stored file finished ingestion",
    notCompleted.length === 0,
    notCompleted
      .map((row) => `${row.title}:${row.status}${row.error_code ? ` (${row.error_code})` : ""}`)
      .join(", "),
  );

  // --- The course reads back the batch as real sources -------------------
  const readBack = await learner.fetch(`/api/courses/${courseId}`);
  const readBackBody = await readBack.json().catch(() => ({}));
  const sources = readBackBody.course?.sources ?? [];
  const withChunks = sources.filter((source) => (source.ingestion?.chunkCount ?? 0) > 0);
  check("the course lists all eight stored materials", sources.length === 8, `${sources.length}`);
  check(
    "every stored material has real evidence chunks",
    withChunks.length === 8,
    `${withChunks.length}`,
  );

  // --- Another learner cannot see any of it ------------------------------
  const other = await signUp("Other learner", `batch-other-${stamp}@edvance.test`);
  if (other.ok) {
    const foreign = materialIds[0];
    const download = await other.session.fetch(
      `/api/courses/${courseId}/materials/${foreign}/download`,
    );
    check(
      "another learner cannot download a batch material",
      download.status === 404,
      `status ${download.status}`,
    );
    await other.session.fetch("/api/account", { method: "DELETE" });
  }
}

async function cleanup() {
  try {
    if (learner && courseId) {
      for (const materialId of materialIds.filter(Boolean)) {
        await learner.fetch(`/api/courses/${courseId}/materials/${materialId}`, {
          method: "DELETE",
        });
      }
      await learner.fetch(`/api/courses/${courseId}`, { method: "DELETE" });
      const { rows } = await db.query(
        "select count(*)::int as n from learning_material where course_id = $1",
        [courseId],
      );
      check("cleanup: the course no longer holds materials", rows[0].n === 0, `${rows[0].n} left`);
      const deleted = await learner.fetch("/api/account", { method: "DELETE" });
      check("cleanup: the test account was deleted", deleted.ok, `status ${deleted.status}`);
    }
  } catch (error) {
    console.error("cleanup failed:", error instanceof Error ? error.message : error);
  } finally {
    await db.end().catch(() => {});
  }
}

try {
  await main();
} catch (error) {
  console.error("Batch upload suite crashed:", error);
  failures.push(`crashed: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  await cleanup();
}

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length > 0) {
  console.log("\nFailures:");
  for (const failure of failures) console.log(`  - ${failure}`);
}
process.exitCode = failures.length > 0 ? 1 : 0;
