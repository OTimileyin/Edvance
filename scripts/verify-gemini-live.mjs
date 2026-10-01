// Edvance — live Google Gemini acceptance check for course intelligence.
//
// The suite in scripts/test-course-intelligence.mjs uses the deterministic
// provider (EDVANCE_AI_MOCK) so every branch, including failure injection, is
// reproducible offline. This script is its real-provider counterpart: it calls
// the actual Gemini API through the running dev server and checks the one thing
// a mock cannot prove — that real model output survives Edvance's strict
// validation, that every citation resolves to real stored evidence, and that no
// evidence is fabricated.
//
// It needs a running server WITHOUT the mock and WITH a real key:
//
//   infisical run --env=dev -- npx next dev -p 3260      # no EDVANCE_AI_MOCK
//   infisical run --env=dev -- node scripts/verify-gemini-live.mjs
//
// Because it is network- and model-dependent it is not part of the offline test
// gate; it is the acceptance evidence that the live provider works. Everything
// it creates is deleted again, so the database returns to its prior state.

import { Client } from "pg";

const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3260").replace(/\/$/, "");
const TRUSTED_ORIGIN = process.env.BETTER_AUTH_URL ?? BASE_URL;
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set. Run with: infisical run --env=dev -- node scripts/verify-gemini-live.mjs");
  process.exit(1);
}

const PASSWORD = "gemini-live-password";
const RELATIONSHIP_KINDS = ["prerequisite", "part_of", "related_to", "contrasts_with"];

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

const normalise = (text) => text.replace(/\s+/g, " ").trim().toLowerCase();

// The same golden fixture the offline suite uses: the fictional six-part FATHOM
// framework, one component per section, so a correct analysis extracts all six.
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
const FATHOM_NORMALISED = normalise(FATHOM_MARKDOWN);

const TRACE_REMINDER = "## Trace\n\nTrace again: without a recorded location, a claim cannot be checked.";

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

async function main() {
  const stamp = Date.now();
  const db = new Client({ connectionString: DATABASE_URL });
  await db.connect();

  const email = `gemini-live-${stamp}@edvance.test`;
  const session = new Session();

  try {
    const signUp = await session.fetch("/api/auth/sign-up/email", {
      method: "POST",
      body: JSON.stringify({ email, password: PASSWORD, name: "Gemini Live Learner" }),
    });
    check("sign-up", signUp.ok, `status ${signUp.status}`);

    const created = await session.fetch("/api/courses", {
      method: "POST",
      body: JSON.stringify({ name: "Evidence-first method (FATHOM)", institution: "Test University", lesson: "Evidence" }),
    });
    const courseId = (await created.json().catch(() => ({}))).course?.id;
    check("course created", Boolean(courseId), `status ${created.status}`);

    // Upload the fixture and let the ingestion pipeline turn it into evidence.
    const form = new FormData();
    form.append("file", new Blob([Buffer.from(FATHOM_MARKDOWN, "utf8")], { type: "text/markdown" }), "fathom-framework.md");
    const uploaded = await session.fetch(`/api/courses/${courseId}/materials`, { method: "POST", body: form });
    const uploadedBody = await uploaded.json().catch(() => ({}));
    const materialId = uploadedBody.material?.id;
    check(
      "fixture uploads and extracts",
      uploaded.status === 201 && uploadedBody.material?.ingestion?.status === "completed",
      `status ${uploaded.status} ${uploadedBody.material?.ingestion?.status}`,
    );

    // --- The live call -----------------------------------------------------
    // A shared free-tier model can answer 503/429 for a short window. That is
    // an external capacity limit, not an Edvance defect: the endpoint already
    // reports it honestly as a retryable 502. Ride it out here so the check
    // measures the pipeline, not Google's queue.
    console.log("\n— calling Google Gemini (real provider) —");
    let analysed;
    let body;
    let elapsed = "0.0";
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const started = Date.now();
      analysed = await session.fetch(`/api/courses/${courseId}/analyse`, { method: "POST" });
      body = await analysed.json().catch(() => ({}));
      elapsed = ((Date.now() - started) / 1000).toFixed(1);
      if (analysed.status !== 502) break;
      console.log(`  attempt ${attempt}: provider unavailable (${body.error ?? "502"}); waiting…`);
      await new Promise((resolve) => setTimeout(resolve, 15000));
    }
    check("analyse accepted (200)", analysed.status === 200, `status ${analysed.status} ${JSON.stringify(body.error ?? "")}`);
    check("outcome is analysed", body.outcome === "analysed", body.outcome);

    const intelligence = body.course?.intelligence;
    check("analysis state is ready", intelligence?.status === "ready", intelligence?.status);
    check(
      "a real model answered (not the mock)",
      Boolean(intelligence?.provider?.model) && !String(intelligence.provider.model).startsWith("mock"),
      JSON.stringify(intelligence?.provider),
    );

    const concepts = intelligence?.concepts ?? [];
    const relationships = intelligence?.relationships ?? [];
    const names = concepts.map((concept) => normalise(concept.name ?? ""));
    const normalisedNames = names.map((name) => name.replace(/[^a-z ]/g, "").trim());

    console.log(`\nModel: ${intelligence?.provider?.model} in ${elapsed}s`);
    console.log(`Tokens: input ${intelligence?.provider?.inputTokens ?? "?"}, output ${intelligence?.provider?.outputTokens ?? "?"}`);
    console.log(`Concepts: ${concepts.length}, relationships: ${relationships.length}\n`);

    for (const concept of concepts) {
      console.log(`• ${concept.name}  [${concept.evidenceStatus}]  confidence ${concept.confidence}`);
      if (concept.instructorTerm && concept.instructorTerm !== concept.name) {
        console.log(`    instructor term: ${concept.instructorTerm}`);
      }
      if (concept.definition) console.log(`    “${concept.definition}”`);
      for (const ref of concept.evidence ?? []) {
        console.log(`    ↳ ${ref.materialTitle} — ${ref.sourceLocation}`);
      }
    }
    for (const relationship of relationships) {
      console.log(`  ${relationship.fromConcept} --${relationship.kind}--> ${relationship.toConcept}`);
    }

    // --- Honesty of the extraction ----------------------------------------
    check("at least six concepts extracted", concepts.length >= 6, `${concepts.length}`);
    check(
      "all six FATHOM components present",
      FATHOM_FRAMEWORK.every((component) => normalisedNames.includes(component.name.toLowerCase())),
      normalisedNames.join(", "),
    );
    check(
      "concepts are unique (de-duplicated)",
      new Set(normalisedNames).size === concepts.length,
      normalisedNames.join(", "),
    );

    // Terminology: each framework component keeps the course's own word.
    for (const component of FATHOM_FRAMEWORK) {
      const concept = concepts.find((entry) => normalise(entry.instructorTerm ?? "") === component.name.toLowerCase());
      check(`instructor terminology preserved: ${component.name}`, Boolean(concept), "term not found verbatim");
    }

    // Evidence status must agree with whether evidence was cited.
    check(
      "cited evidence matches the evidence status",
      concepts.every((concept) =>
        concept.evidenceStatus === "INSUFFICIENT_EVIDENCE"
          ? (concept.evidence ?? []).length === 0
          : (concept.evidence ?? []).length > 0,
      ),
      JSON.stringify(concepts.map((concept) => [concept.name, concept.evidenceStatus, (concept.evidence ?? []).length])),
    );

    // Every citation resolves to a real stored chunk with a real location.
    const allEvidence = concepts.flatMap((concept) => concept.evidence ?? []);
    check("every concept that is not insufficient has evidence", allEvidence.length > 0, `${allEvidence.length}`);
    check(
      "every citation has a material, location and excerpt",
      allEvidence.every((ref) => ref.materialTitle && ref.sourceLocation && ref.excerpt),
      JSON.stringify(allEvidence.find((ref) => !ref.excerpt) ?? "none"),
    );
    check(
      "every citation points into a real section",
      allEvidence.every((ref) => ref.sourceLocation.startsWith("Section: ")),
      JSON.stringify([...new Set(allEvidence.map((ref) => ref.sourceLocation))]),
    );
    check(
      "no citation resolves outside the uploaded material",
      allEvidence.every((ref) => FATHOM_NORMALISED.includes(normalise(ref.excerpt ?? ""))),
      allEvidence.map((ref) => ref.excerpt).find((excerpt) => excerpt && !FATHOM_NORMALISED.includes(normalise(excerpt))) ?? "",
    );

    // Relationships must connect real concepts and use the allowed vocabulary.
    check(
      "relationships use the allowed vocabulary",
      relationships.every((relationship) => RELATIONSHIP_KINDS.includes(relationship.kind)),
      JSON.stringify(relationships.map((relationship) => relationship.kind)),
    );
    check(
      "relationships connect concepts the course actually has",
      relationships.every(
        (relationship) =>
          normalisedNames.includes(normalise(relationship.fromConcept ?? "")) &&
          normalisedNames.includes(normalise(relationship.toConcept ?? "")),
      ),
      JSON.stringify(relationships.map((relationship) => [relationship.fromConcept, relationship.toConcept])),
    );

    // --- Cost control: a second analyse must not spend another call --------
    {
      const again = await session.fetch(`/api/courses/${courseId}/analyse`, { method: "POST" });
      const againBody = await again.json().catch(() => ({}));
      check(
        "cost control: re-analyse is up-to-date with no model call",
        again.status === 200 && againBody.outcome === "up-to-date",
        `${again.status} ${againBody.outcome}`,
      );
    }

    // --- Staleness: new material invalidates the stored intelligence ------
    {
      const second = new FormData();
      second.append("file", new Blob([Buffer.from(TRACE_REMINDER, "utf8")], { type: "text/markdown" }), "trace-reminder.md");
      const secondUpload = await session.fetch(`/api/courses/${courseId}/materials`, { method: "POST", body: second });
      const secondBody = await secondUpload.json().catch(() => ({}));
      check("second material uploads", secondUpload.status === 201, `status ${secondUpload.status}`);

      const refreshed = await session.fetch(`/api/courses/${courseId}`);
      const refreshedBody = await refreshed.json().catch(() => ({}));
      check(
        "staleness: new material marks intelligence needs-reanalysis",
        refreshedBody.course?.intelligence?.status === "needs-reanalysis",
        refreshedBody.course?.intelligence?.status,
      );

      // Clean up both materials.
      for (const id of [materialId, secondBody.material?.id]) {
        if (id) await session.fetch(`/api/courses/${courseId}/materials/${id}`, { method: "DELETE" }).catch(() => {});
      }
    }
  } finally {
    try {
      await db.query('delete from "user" where email = $1', [email]);
    } catch {
      // Best effort.
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
