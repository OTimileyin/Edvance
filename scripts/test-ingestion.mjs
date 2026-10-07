// Edvance Phase 5.6 — end-to-end ingestion tests.
//
// Exercises the real pipeline against a running dev server: sign up two
// learners, create a course, upload one fixture per supported format, then
// verify against PostgreSQL that ingestion jobs and ordered, location-tagged
// chunks were produced — and that another learner cannot reach them.
//
// Usage (the server must already be running on BASE_URL):
//   infisical run --env=dev -- node scripts/test-ingestion.mjs
//   BASE_URL=http://localhost:3250 infisical run --env=dev -- node scripts/test-ingestion.mjs
//
// Fixtures are generated in memory (no copyrighted material is used) and every
// object created is deleted again, so the bucket and database return to their
// prior state.

import { Client } from "pg";
import JSZip from "jszip";

const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3250").replace(/\/$/, "");
// Better Auth validates the Origin header against its trusted origins; a Node
// fetch that omits it is rejected as "Missing or null Origin". Use the same
// URL Better Auth is configured with.
const TRUSTED_ORIGIN = process.env.BETTER_AUTH_URL ?? BASE_URL;
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error(
    "DATABASE_URL is not set. Run with: infisical run --env=dev -- node scripts/test-ingestion.mjs",
  );
  process.exit(1);
}

const PASSWORD = "ingestion-test-password";
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
// Fixtures — every one contains unique, known text so extraction is verifiable.
// ---------------------------------------------------------------------------

/** A minimal multi-page PDF with the given text on each page. */
function makePdf(pages) {
  const objects = [];
  const add = (body) => {
    objects.push(body);
    return objects.length;
  };
  add("<< /Type /Catalog /Pages 2 0 R >>");
  add("PLACEHOLDER");
  const contentIds = pages.map((text) => {
    const stream = `BT /F1 24 Tf 72 700 Td (${text}) Tj ET`;
    return add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });
  const fontId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pageIds = contentIds.map((contentId) =>
    add(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`,
    ),
  );
  objects[1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
  let out = "%PDF-1.4\n";
  const offsets = [];
  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) out += `${String(offset).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

/** A minimal .docx package with heading and body paragraphs. */
async function makeDocx(paragraphs) {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
  );
  zip
    .folder("_rels")
    .file(
      ".rels",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    );
  const body = paragraphs
    .map((p) =>
      p.heading
        ? `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t xml:space="preserve">${p.text}</w:t></w:r></w:p>`
        : `<w:p><w:r><w:t xml:space="preserve">${p.text}</w:t></w:r></w:p>`,
    )
    .join("");
  zip
    .folder("word")
    .file(
      "document.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr/></w:body></w:document>`,
    );
  return zip.generateAsync({ type: "nodebuffer" });
}

/** A minimal .pptx package with one text placeholder per slide. */
async function makePptx(slides) {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>${slides
      .map(
        (_, i) =>
          `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`,
      )
      .join("")}</Types>`,
  );
  zip
    .folder("_rels")
    .file(
      ".rels",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>`,
    );
  zip
    .folder("ppt")
    .file(
      "presentation.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldIdLst>${slides
        .map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 1}"/>`)
        .join("")}</p:sldIdLst></p:presentation>`,
    );
  const folder = zip.folder("ppt").folder("slides");
  slides.forEach((lines, i) => {
    const paras = lines.map((line) => `<a:p><a:r><a:t>${line}</a:t></a:r></a:p>`).join("");
    folder.file(
      `slide${i + 1}.xml`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><p:spTree><p:sp><p:txBody>${paras}</p:txBody></p:sp></p:spTree></p:cSld></p:sld>`,
    );
  });
  return zip.generateAsync({ type: "nodebuffer" });
}

const TEXT_FIXTURE = `Alpha line one about purpose.
Alpha line two about role.

Beta paragraph starts here.
Beta paragraph continues.
`;

const MARKDOWN_FIXTURE = `# Introduction to PROMPT
The PROMPT framework has six components.

## Parameters
Constrain parameters when precision matters.
`;

const VTT_FIXTURE = `WEBVTT

00:00:01.000 --> 00:00:04.000
Welcome to the PROMPT framework.

00:00:05.000 --> 00:00:08.000
Purpose and Role come first.
`;

const SRT_FIXTURE = `1
00:00:01,000 --> 00:00:04,000
The first subtitle block.

2
00:00:05,000 --> 00:00:09,000
The second subtitle block.
`;

async function buildFixtures() {
  return {
    pdf: {
      name: "two-page.pdf",
      type: "application/pdf",
      bytes: makePdf(["Alpha page one has unique text", "Beta page two has different text"]),
    },
    txt: { name: "notes.txt", type: "text/plain", bytes: Buffer.from(TEXT_FIXTURE, "utf8") },
    md: { name: "notes.md", type: "text/markdown", bytes: Buffer.from(MARKDOWN_FIXTURE, "utf8") },
    docx: {
      name: "notes.docx",
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      bytes: await makeDocx([
        { text: "Introduction to PROMPT", heading: true },
        { text: "The framework has six components." },
        { text: "Parameters", heading: true },
        { text: "Constrain parameters when precision matters." },
      ]),
    },
    pptx: {
      name: "deck.pptx",
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      bytes: await makePptx([
        ["Slide one title", "Slide one bullet about Purpose"],
        ["Slide two title", "Slide two bullet about Parameters"],
      ]),
    },
    vtt: { name: "captions.vtt", type: "text/vtt", bytes: Buffer.from(VTT_FIXTURE, "utf8") },
    srt: {
      name: "captions.srt",
      type: "application/x-subrip",
      bytes: Buffer.from(SRT_FIXTURE, "utf8"),
    },
    corruptPdf: {
      name: "broken.pdf",
      type: "application/pdf",
      bytes: Buffer.from("not a pdf at all", "utf8"),
    },
    malformedVtt: {
      name: "broken.vtt",
      type: "text/vtt",
      bytes: Buffer.from("this is not webvtt content", "utf8"),
    },
    blankTxt: { name: "blank.txt", type: "text/plain", bytes: Buffer.from("   \n\n   \n", "utf8") },
  };
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
    const response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers,
      redirect: "manual",
    });
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
  return { status: response.status, body };
}

// ---------------------------------------------------------------------------
// Database assertions.
// ---------------------------------------------------------------------------

async function loadChunks(db, materialId) {
  const { rows } = await db.query(
    `select ordinal, content, source_location, metadata
       from material_chunk where material_id = $1 order by ordinal asc`,
    [materialId],
  );
  return rows;
}

async function loadJob(db, materialId) {
  const { rows } = await db.query(
    `select status, error_code, error_summary, metadata
       from material_ingestion_job where material_id = $1 order by created_at desc limit 1`,
    [materialId],
  );
  return rows[0];
}

const EXPECTED = {
  pdf: {
    locationIncludes: ["Page 1", "Page 2"],
    contentIncludes: ["Alpha page one has unique text", "Beta page two has different text"],
    unit: "page",
    count: 2,
  },
  txt: {
    locationIncludes: ["Lines 1–2", "Lines 4–5"],
    contentIncludes: ["Alpha line one about purpose", "Beta paragraph starts here"],
    unit: "line",
  },
  md: {
    locationIncludes: ["Section: Introduction to PROMPT", "Section: Parameters"],
    contentIncludes: [
      "The PROMPT framework has six components",
      "Constrain parameters when precision matters",
    ],
    unit: "section",
  },
  docx: {
    locationIncludes: ["Section: Introduction to PROMPT", "Section: Parameters"],
    contentIncludes: [
      "The framework has six components",
      "Constrain parameters when precision matters",
    ],
    unit: "section",
  },
  pptx: {
    locationIncludes: ["Slide 1", "Slide 2"],
    contentIncludes: ["Slide one bullet about Purpose", "Slide two bullet about Parameters"],
    unit: "slide",
    count: 2,
  },
  vtt: {
    locationIncludes: ["00:00:01–00:00:04", "00:00:05–00:00:08"],
    contentIncludes: ["Welcome to the PROMPT framework", "Purpose and Role come first"],
    unit: "cue",
    count: 2,
  },
  srt: {
    locationIncludes: ["00:00:01–00:00:04", "00:00:05–00:00:09"],
    contentIncludes: ["The first subtitle block", "The second subtitle block"],
    unit: "cue",
    count: 2,
  },
};

async function main() {
  const stamp = Date.now();
  const db = new Client({ connectionString: DATABASE_URL });
  await db.connect();

  const fixtures = await buildFixtures();
  const uploads = []; // { materialId, session, courseId } for cleanup
  let learnerA;
  let learnerB;

  try {
    // Two learners so ownership isolation can be proved.
    const emailA = `ingest-a-${stamp}@edvance.test`;
    const emailB = `ingest-b-${stamp}@edvance.test`;
    const a = await signUp("Test Learner A", emailA);
    const b = await signUp("Test Learner B", emailB);
    check("sign-up: learner A", a.ok, `status ${a.status}`);
    check("sign-up: learner B", b.ok, `status ${b.status}`);
    learnerA = a.session;
    learnerB = b.session;

    const courseRes = await learnerA.fetch("/api/courses", {
      method: "POST",
      body: JSON.stringify({
        name: "Ingestion test course",
        institution: "Test",
        lesson: "Extraction",
      }),
    });
    const courseId = (await courseRes.json()).course?.id;
    check("course created", Boolean(courseId), `status ${courseRes.status}`);
    if (!courseId) throw new Error("no course id");

    const courseB = await learnerB.fetch("/api/courses", {
      method: "POST",
      body: JSON.stringify({
        name: "Ingestion test course B",
        institution: "Test",
        lesson: "Extraction",
      }),
    });
    const courseIdB = (await courseB.json()).course?.id;
    check("course B created", Boolean(courseIdB), `status ${courseB.status}`);

    // --- Per-format happy path -------------------------------------------
    for (const format of ["pdf", "txt", "md", "docx", "pptx", "vtt", "srt"]) {
      const fixture = fixtures[format];
      const { status, body } = await upload(learnerA, courseId, fixture);
      const material = body.material;
      check(
        `${format}: upload accepted (201)`,
        status === 201,
        `status ${status} ${JSON.stringify(body.error ?? "")}`,
      );
      if (!material) continue;
      uploads.push({ materialId: material.id, session: learnerA, courseId });
      check(
        `${format}: upload reports completed ingestion`,
        material.ingestion?.status === "completed",
        `status ${material.ingestion?.status} ${material.ingestion?.errorSummary ?? ""}`,
      );

      const job = await loadJob(db, material.id);
      check(
        `${format}: ingestion job completed`,
        job?.status === "completed",
        `job ${job?.status}`,
      );

      const chunks = await loadChunks(db, material.id);
      const expected = EXPECTED[format];
      check(`${format}: chunks stored`, chunks.length > 0, `${chunks.length} chunks`);
      check(
        `${format}: chunk ordinals are 0..n-1 and ordered`,
        chunks.every((chunk, index) => chunk.ordinal === index),
        chunks.map((c) => c.ordinal).join(","),
      );
      const locations = chunks.map((chunk) => chunk.source_location);
      check(
        `${format}: source locations correct`,
        expected.locationIncludes.every((needle) => locations.some((loc) => loc.includes(needle))),
        locations.join(" | "),
      );
      const allContent = chunks.map((chunk) => chunk.content).join("\n");
      check(
        `${format}: extracted text correct`,
        expected.contentIncludes.every((needle) => allContent.includes(needle)),
        allContent.slice(0, 200),
      );
      if (expected.unit) {
        check(
          `${format}: metadata unit recorded`,
          job?.metadata?.unit === expected.unit,
          JSON.stringify(job?.metadata),
        );
      }
      if (expected.count !== undefined) {
        check(
          `${format}: metadata count recorded`,
          job?.metadata?.count === expected.count,
          JSON.stringify(job?.metadata),
        );
      }
      check(`${format}: chunks belong to the correct material`, chunks.length > 0);
    }

    // --- Re-ingestion replaces chunks deterministically -------------------
    {
      const { body } = await upload(learnerA, courseId, fixtures.txt);
      const materialId = body.material.id;
      uploads.push({ materialId, session: learnerA, courseId });
      const before = await loadChunks(db, materialId);
      const retry = await learnerA.fetch(
        `/api/courses/${courseId}/materials/${materialId}/ingest`,
        { method: "POST" },
      );
      check("retry: accepted on a completed material", retry.ok, `status ${retry.status}`);
      const after = await loadChunks(db, materialId);
      check(
        "retry: chunk set is replaced, not duplicated",
        after.length === before.length && after.every((chunk, index) => chunk.ordinal === index),
        `before ${before.length} after ${after.length}`,
      );
      const { rows } = await db.query(
        "select count(*)::int as n from material_ingestion_job where material_id = $1",
        [materialId],
      );
      check("retry: a new ingestion job was recorded", rows[0].n >= 2, `${rows[0].n} jobs`);
    }

    // --- Ownership isolation ---------------------------------------------
    {
      const foreign = uploads[0];
      const download = await learnerB.fetch(
        `/api/courses/${courseId}/materials/${foreign.materialId}/download`,
      );
      check(
        "isolation: another learner cannot download",
        download.status === 404,
        `status ${download.status}`,
      );
      const retry = await learnerB.fetch(
        `/api/courses/${courseId}/materials/${foreign.materialId}/ingest`,
        { method: "POST" },
      );
      check(
        "isolation: another learner cannot trigger ingestion",
        retry.status === 404,
        `status ${retry.status}`,
      );
      const { rows } = await db.query(
        `select count(*)::int as n from material_chunk ch
           join learning_material m on m.id = ch.material_id
           join course c on c.id = m.course_id
          where c.user_id = (select id from "user" where email = $1)`,
        [`ingest-b-${stamp}@edvance.test`],
      );
      check("isolation: learner B owns no chunks", rows[0].n === 0, `${rows[0].n} chunks`);
    }

    // --- Failure handling -------------------------------------------------
    {
      const { status, body } = await upload(learnerA, courseId, fixtures.corruptPdf);
      check("corrupt PDF: upload still accepted (file kept)", status === 201, `status ${status}`);
      const materialId = body.material?.id;
      if (materialId) {
        uploads.push({ materialId, session: learnerA, courseId });
        check(
          "corrupt PDF: upload reports failed ingestion",
          body.material.ingestion?.status === "failed",
        );
        const job = await loadJob(db, materialId);
        check("corrupt PDF: job marked failed", job?.status === "failed", job?.status);
        check(
          "corrupt PDF: safe error code stored",
          job?.error_code === "corrupt-file",
          job?.error_code,
        );
        const chunks = await loadChunks(db, materialId);
        check("corrupt PDF: no chunks stored", chunks.length === 0, `${chunks.length}`);
      }
    }
    {
      const { body } = await upload(learnerA, courseId, fixtures.malformedVtt);
      const materialId = body.material?.id;
      if (materialId) {
        uploads.push({ materialId, session: learnerA, courseId });
        const job = await loadJob(db, materialId);
        check("malformed VTT: job failed", job?.status === "failed", job?.status);
        check(
          "malformed VTT: safe error code stored",
          job?.error_code === "malformed-transcript",
          job?.error_code,
        );
      }
    }
    {
      const { status, body } = await upload(learnerA, courseId, fixtures.blankTxt);
      check("blank txt: upload accepted (file kept)", status === 201, `status ${status}`);
      const materialId = body.material?.id;
      if (materialId) {
        uploads.push({ materialId, session: learnerA, courseId });
        const job = await loadJob(db, materialId);
        check("blank txt: job failed", job?.status === "failed", job?.status);
        check(
          "blank txt: safe error code stored",
          job?.error_code === "empty-content",
          job?.error_code,
        );
      }
    }
    {
      const form = new FormData();
      form.append(
        "file",
        new Blob([Buffer.from("binary", "utf8")], { type: "application/octet-stream" }),
        "thing.xyz",
      );
      const response = await learnerA.fetch(`/api/courses/${courseId}/materials`, {
        method: "POST",
        body: form,
      });
      check("unsupported file: rejected", response.status === 415, `status ${response.status}`);
    }

    // --- Delete cascades chunks and jobs ---------------------------------
    {
      const { body } = await upload(learnerA, courseId, fixtures.srt);
      const materialId = body.material.id;
      uploads.push({ materialId, session: learnerA, courseId });
      const remove = await learnerA.fetch(`/api/courses/${courseId}/materials/${materialId}`, {
        method: "DELETE",
      });
      check("delete: material removed", remove.ok, `status ${remove.status}`);
      const chunks = await db.query(
        "select count(*)::int as n from material_chunk where material_id = $1",
        [materialId],
      );
      const jobs = await db.query(
        "select count(*)::int as n from material_ingestion_job where material_id = $1",
        [materialId],
      );
      check("delete: chunks cascade away", chunks.rows[0].n === 0, `${chunks.rows[0].n}`);
      check("delete: jobs cascade away", jobs.rows[0].n === 0, `${jobs.rows[0].n}`);
      const index = uploads.findIndex((entry) => entry.materialId === materialId);
      if (index >= 0) uploads.splice(index, 1); // already deleted
    }
  } finally {
    // Clean up: remove stored objects through the API, then the learners.
    for (const entry of uploads) {
      try {
        await entry.session.fetch(`/api/courses/${entry.courseId}/materials/${entry.materialId}`, {
          method: "DELETE",
        });
      } catch {
        // Best effort.
      }
    }
    for (const email of [`ingest-a-${stamp}@edvance.test`, `ingest-b-${stamp}@edvance.test`]) {
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
