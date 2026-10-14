import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { registerAppImports } from "../lib/app-modules.mjs";

registerAppImports();
const { databaseUrl } = await import("../../lib/env.ts");

// Exercise real migrations and repository SQL in a disposable, isolated schema.
// Never migrate or modify the application's existing tables.
test("3 practice attempts survive adding a source and re-running analysis", async (t) => {
  const connectionString = databaseUrl();
  assert.ok(
    ["localhost", "127.0.0.1", "[::1]"].includes(new URL(connectionString).hostname),
    "This test must use a disposable local PostgreSQL instance; remote databases are refused.",
  );
  const schema = `reanalysis_${randomUUID().replaceAll("-", "")}`;
  const admin = new Pool({ connectionString });
  let pool;
  const previousMock = process.env.OYEVOLVE_AI_MOCK;
  const previousNodeEnv = process.env.NODE_ENV;
  try {
    await admin.query(`create schema "${schema}"`);
    pool = new Pool({ connectionString, options: `-c search_path=${schema}` });
    globalThis.oyevolvePool = pool;
    process.env.NODE_ENV = "test";
    process.env.OYEVOLVE_AI_MOCK = "simple";
    const migrationDir = new URL("../../db/migrations/", import.meta.url);
    for (const file of (await readdir(migrationDir))
      .filter((name) => name.endsWith(".sql"))
      .sort()) {
      await pool.query(await readFile(new URL(file, migrationDir), "utf8"));
    }
    const repo = await import("../../lib/repo/courses.ts");
    const { analyseCourseEvidence } = await import("../../lib/ai/course-intelligence.ts");
    const { buildCourseIntelligencePrompt } = await import("../../lib/ai/prompts.ts");
    await pool.query(
      `insert into "user" (id, name, email, "emailVerified") values ('learner', 'Learner', 'learner@test.invalid', false)`,
    );
    const course = await repo.createCourse("learner", {
      name: "Evidence",
      institution: "Test",
      lesson: "Frame",
    });
    async function addSource(id, heading, content) {
      await pool.query(
        `insert into learning_material (id, course_id, type, title, location) values ($1, $2, 'Notes', $3, $4)`,
        [id, course.id, heading, `Section: ${heading}`],
      );
      await repo.replaceMaterialChunks(id, [
        { content, sourceLocation: `Section: ${heading}`, metadata: {} },
      ]);
      const jobId = await repo.createIngestionJob(id);
      await repo.completeIngestion(jobId, { chunks: 1 });
    }
    async function analyse(mockScenario) {
      const current = await repo.getCourse("learner", course.id);
      const evidence = await repo.getCourseEvidence("learner", course.id);
      const existingConcepts = await repo.getExistingConcepts("learner", course.id);
      const result = await analyseCourseEvidence({
        courseName: course.name,
        lesson: course.lesson,
        evidence,
        existingConcepts,
        mockScenario,
      });
      await repo.saveCourseIntelligence(
        course.id,
        repo.evidenceFingerprint(current.sources),
        result,
        evidence,
      );
      return repo.getCourse("learner", course.id);
    }
    async function history() {
      return {
        mastery: (await pool.query("select * from mastery_state order by id")).rows,
        attempts: (await pool.query("select * from practice_attempt order by id")).rows,
      };
    }

    await addSource(
      "original",
      "Frame",
      "Frame the question before looking for evidence. State the exact question.",
    );
    const first = await analyse();
    assert.deepEqual(first.intelligence.provider.conceptIdentity, {
      modelIds: 0,
      nameFallbacks: 0,
      newConcepts: 1,
    });
    const conceptId = first.intelligence.concepts[0].id;
    for (let attempt = 0; attempt < 3; attempt++) {
      const recorded = await repo.recordPractice("learner", course.id, {
        conceptId,
        answer: "State the question",
        correct: true,
      });
      assert.equal(recorded.ok, true);
    }
    const before = await history();
    assert.equal(before.attempts.length, 3);
    assert.equal(before.mastery[0].status, "Mastered");
    assert.equal(before.mastery[0].score, 100);
    const masteryBefore = (await repo.getCourse("learner", course.id)).concepts[0];

    await addSource(
      "additional",
      "Trace",
      "Trace each claim to a source. Record the exact source location.",
    );
    assert.equal(
      (await repo.getCourse("learner", course.id)).intelligence.status,
      "needs-reanalysis",
    );
    const existingConcepts = await repo.getExistingConcepts("learner", course.id);
    const prompt = buildCourseIntelligencePrompt({
      courseName: course.name,
      lesson: course.lesson,
      evidence: [],
      existingConcepts,
    });
    assert.ok(prompt.includes(conceptId), "prompt includes existing concept ID");
    const second = await analyse();
    assert.deepEqual(
      await history(),
      before,
      "mastery and practice rows remain byte-for-byte equivalent",
    );
    assert.equal(
      second.intelligence.concepts.find((concept) => concept.name === "Frame").id,
      conceptId,
    );
    assert.deepEqual(
      second.concepts.find((concept) => concept.name === "Frame"),
      masteryBefore,
    );
    assert.deepEqual(
      await history(),
      before,
      "mastery and practice rows remain byte-for-byte equivalent",
    );
    assert.equal(second.intelligence.concepts.length, 2);

    // Omitting the practised concept archives it and hides it from active views.
    await pool.query("delete from learning_material where id = 'original'");
    const omitted = await analyse();
    assert.equal(
      omitted.concepts.some((concept) => concept.name === "Frame"),
      false,
    );
    assert.equal(
      omitted.intelligence.concepts.some((concept) => concept.id === conceptId),
      false,
    );
    assert.ok(
      (await pool.query("select archived_at from concept where id = $1", [conceptId])).rows[0]
        .archived_at,
    );
    assert.deepEqual(await history(), before, "archiving preserves mastery and attempts");

    // Archived IDs remain in subsequent prompts and are restored on return.
    assert.ok(
      (await repo.getExistingConcepts("learner", course.id)).some(
        (concept) => concept.id === conceptId,
      ),
    );
    await addSource(
      "returned",
      "Frame",
      "Frame the question before looking for evidence. State the exact question.",
    );
    const returned = await analyse();
    assert.equal(
      returned.intelligence.concepts.find((concept) => concept.name === "Frame").id,
      conceptId,
    );
    assert.deepEqual(
      returned.concepts.find((concept) => concept.name === "Frame"),
      masteryBefore,
    );
    assert.equal(
      (await pool.query("select archived_at from concept where id = $1", [conceptId])).rows[0]
        .archived_at,
      null,
    );
    assert.deepEqual(await history(), before);

    // Reusing an ID from another course must fail without altering any history.
    const other = await repo.createCourse("learner", {
      name: "Other",
      institution: "Test",
      lesson: "Other",
    });
    const evidence = await repo.getCourseEvidence("learner", course.id);
    const result = await analyseCourseEvidence({
      courseName: course.name,
      lesson: course.lesson,
      evidence,
      existingConcepts: await repo.getExistingConcepts("learner", course.id),
    });
    await assert.rejects(
      repo.saveCourseIntelligence(other.id, "invalid", result, evidence),
      /unknown or duplicate existing concept id/,
    );
    assert.deepEqual(await history(), before);
    await t.test(
      "null model IDs reuse active and archived normalized names without changing mastery",
      async (fallbackTest) => {
        const { normaliseConceptName } = await import("../../lib/ai/concept-identity.ts");
        const { generateStructured } = await import("../../lib/ai/gemini.ts");
        await addSource(
          "fallback",
          "Check Claim",
          "Check a claim against the original passage before trusting it.",
        );
        const initial = await analyse();
        const fallbackId = initial.intelligence.concepts.find(
          (concept) => concept.name === "Check Claim",
        ).id;
        for (let attempt = 0; attempt < 3; attempt++) {
          assert.equal(
            (
              await repo.recordPractice("learner", course.id, {
                conceptId: fallbackId,
                correct: true,
              })
            ).ok,
            true,
          );
        }
        const preserved = await history();
        const assessmentCourse = await repo.addAssessment(
          "learner",
          course.id,
          "Evidence",
          "How do you check a claim?",
        );
        const assessment = assessmentCourse.assessments.find(
          (question) => question.question === "How do you check a claim?",
        );
        const currentCourse = await repo.getCourse("learner", course.id);
        await repo.saveAssessmentIntelligence(
          course.id,
          assessment.id,
          repo.evidenceFingerprint(currentCourse.sources),
          {
            status: "ready",
            consistency: "CONSISTENT",
            reason: "Exercises checking claims.",
            nextAction: "Practise checking claims.",
            testedConceptIds: [fallbackId],
            usage: { model: "mock:simple" },
          },
          currentCourse.intelligence.concepts,
        );
        assert.equal(
          (await repo.getCourse("learner", course.id)).assessments.find(
            (question) => question.id === assessment.id,
          ).signature.concepts[0].id,
          fallbackId,
        );
        const conceptCount = (
          await pool.query("select count(*)::int as n from concept where course_id = $1", [
            course.id,
          ])
        ).rows[0].n;
        const evidence = await repo.getCourseEvidence("learner", course.id);
        const raw = await generateStructured({
          systemInstruction: "test",
          userPrompt: "test",
          jsonSchema: {},
          evidence,
          existingConcepts: await repo.getExistingConcepts("learner", course.id),
          mockScenario: "null-concept-ids",
        });
        const rawConcept = JSON.parse(raw.text).concepts.find(
          (concept) => normaliseConceptName(concept.name) === "check claim",
        );
        assert.equal(rawConcept.id, null, "test provider actually returns null, not the reused ID");
        assert.match(rawConcept.name, /\t/, "model output exercises collapsed whitespace");

        const active = await analyse("null-concept-ids");
        assert.deepEqual(active.intelligence.provider.conceptIdentity, {
          modelIds: 0,
          nameFallbacks: active.intelligence.concepts.length,
          newConcepts: 0,
        });
        assert.equal(
          active.intelligence.concepts.find(
            (concept) => normaliseConceptName(concept.name) === "check claim",
          ).id,
          fallbackId,
        );
        assert.deepEqual(await history(), preserved);
        assert.equal(
          (
            await pool.query("select count(*)::int as n from concept where course_id = $1", [
              course.id,
            ])
          ).rows[0].n,
          conceptCount,
        );

        // Simulate a valid model response omitting a concept while its source remains.
        const omittedResult = await analyseCourseEvidence({
          courseName: course.name,
          lesson: course.lesson,
          evidence,
          existingConcepts: await repo.getExistingConcepts("learner", course.id),
        });
        omittedResult.concepts = omittedResult.concepts.filter(
          (concept) => concept.id !== fallbackId,
        );
        await repo.saveCourseIntelligence(
          course.id,
          repo.evidenceFingerprint(active.sources),
          omittedResult,
          evidence,
        );
        assert.ok(
          (await pool.query("select archived_at from concept where id = $1", [fallbackId])).rows[0]
            .archived_at,
        );
        assert.deepEqual(
          await repo.getConceptEvidenceChunks("learner", course.id, [fallbackId]),
          [],
          "revision evidence excludes archived concepts even when evidence remains",
        );
        const archived = await repo.getCourse("learner", course.id);
        await fallbackTest.test(
          "assessment mappings survive archiving and require re-checking without blank concept objects",
          async () => {
            const signature = archived.assessments.find(
              (question) => question.id === assessment.id,
            ).signature;
            assert.equal(signature.status, "needs-reanalysis");
            assert.deepEqual(signature.concepts, []);
            assert.match(signature.nextAction, /Re-check this question/);
            assert.equal(
              (
                await pool.query(
                  "select concept_id from source_mapping where assessment_question_id = $1",
                  [assessment.id],
                )
              ).rows[0].concept_id,
              fallbackId,
            );
            assert.equal(
              (
                await repo.recordPractice("learner", course.id, {
                  assessmentId: assessment.id,
                  correct: true,
                })
              ).ok,
              false,
            );
            assert.deepEqual(await history(), preserved);
          },
        );
        assert.ok(
          archived.attempts.some(
            (attempt) =>
              attempt.conceptId === fallbackId &&
              normaliseConceptName(attempt.conceptName) === "check claim",
          ),
          "history still names the archived concept",
        );

        await fallbackTest.test(
          "active graph and revision queries exclude archived concepts",
          async () => {
            const activeId = omittedResult.concepts[0].id;
            const anotherId = omittedResult.concepts[1].id;
            await pool.query(
              `insert into concept_relationship (id, course_id, from_concept_id, to_concept_id, kind)
          values ('archived-from', $1, $2, $3, 'contrasts_with'), ('archived-to', $1, $3, $2, 'contrasts_with'), ('active-edge', $1, $3, $4, 'contrasts_with')`,
              [course.id, fallbackId, activeId, anotherId],
            );
            await pool.query(
              `insert into revision_plan (id, course_id, status, generated_for) values ('query-plan', $1, 'ready', 'test')`,
              [course.id],
            );
            await pool.query(
              `insert into practice_question (id, course_id, concept_id, question_text)
          values ('archived-question', $1, $2, 'Archived'), ('active-question', $1, $3, 'Active'), ('legacy-question', $1, null, 'Legacy')`,
              [course.id, fallbackId, activeId],
            );
            const current = await repo.getCourse("learner", course.id);
            assert.ok(
              !current.intelligence.relationships.some(
                (relationship) =>
                  relationship.fromConceptId === fallbackId ||
                  relationship.toConceptId === fallbackId,
              ),
            );
            assert.ok(
              current.intelligence.relationships.some(
                (relationship) => relationship.id === "active-edge",
              ),
            );
            assert.deepEqual(
              current.revision.practiceQuestions.map((question) => question.id).sort(),
              ["active-question", "legacy-question"],
            );
            assert.ok(
              (await pool.query("select id from practice_question where id = 'archived-question'"))
                .rows.length,
              "filtered question is preserved in storage",
            );
            assert.ok(
              (await repo.getConceptEvidenceChunks("learner", course.id, [activeId])).length > 0,
            );
          },
        );

        const restored = await analyse("null-concept-ids");
        assert.equal(
          restored.intelligence.concepts.find(
            (concept) => normaliseConceptName(concept.name) === "check claim",
          ).id,
          fallbackId,
        );
        assert.equal(
          (await pool.query("select archived_at from concept where id = $1", [fallbackId])).rows[0]
            .archived_at,
          null,
        );
        assert.deepEqual(await history(), preserved);
        assert.equal(
          (
            await pool.query("select count(*)::int as n from concept where course_id = $1", [
              course.id,
            ])
          ).rows[0].n,
          conceptCount,
        );

        // The repository repeats fallback resolution under its course lock, even for direct callers.
        const directResult = await analyseCourseEvidence({
          courseName: course.name,
          lesson: course.lesson,
          evidence,
          existingConcepts: await repo.getExistingConcepts("learner", course.id),
        });
        for (const concept of directResult.concepts) concept.id = null;
        await repo.saveCourseIntelligence(
          course.id,
          repo.evidenceFingerprint(restored.sources),
          directResult,
          evidence,
        );
        assert.deepEqual(await history(), preserved);
        assert.equal(
          (
            await pool.query("select count(*)::int as n from concept where course_id = $1", [
              course.id,
            ])
          ).rows[0].n,
          conceptCount,
        );
        await fallbackTest.test(
          "two archived concepts with the same normalized name reject the whole analysis",
          async () => {
            await pool.query("update concept set archived_at = now() where id = $1", [fallbackId]);
            await pool.query(
              `insert into concept (id, course_id, name, origin, archived_at) values ('ambiguous-archived', $1, '  CHECK   CLAIM  ', 'analysis', now())`,
              [course.id],
            );
            const conceptsBefore = (
              await pool.query("select * from concept where course_id = $1 order by id", [
                course.id,
              ])
            ).rows;
            await assert.rejects(
              analyse("null-concept-ids"),
              (error) => error.reason === "ambiguous-concept-name",
            );
            assert.deepEqual(
              (
                await pool.query("select * from concept where course_id = $1 order by id", [
                  course.id,
                ])
              ).rows,
              conceptsBefore,
            );
            assert.deepEqual(await history(), preserved);
          },
        );
      },
    );
  } finally {
    if (previousMock === undefined) delete process.env.OYEVOLVE_AI_MOCK;
    else process.env.OYEVOLVE_AI_MOCK = previousMock;
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    delete globalThis.oyevolvePool;
    if (pool) await pool.end();
    await admin.query(`drop schema if exists "${schema}" cascade`);
    await admin.end();
  }
});
