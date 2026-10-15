// Inspect existing data using SELECTs only. Never deletes or migrates anything.
import { Client } from "pg";
import { createHash } from "node:crypto";
import { registerAppImports } from "../tests/lib/app-modules.mjs";
registerAppImports();
const { databaseUrl } = await import("../lib/env.ts");
const { SEED_COURSES, seedExtractionMetadata } = await import("../lib/data.ts");
const { chunkBlocks } = await import("../lib/extraction/chunk.ts");
const connectionString = databaseUrl();
const url = new URL(connectionString);
const client = new Client({
  connectionString,
  options: "-c default_transaction_read_only=on -c statement_timeout=20000",
  connectionTimeoutMillis: 10000,
});
const canonical = (value) =>
  JSON.stringify(value, (key, item) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
      : item,
  );
const equal = (a, b) => canonical(a) === canonical(b);
const slug = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
try {
  await client.connect();
  const metadata = (
    await client.query(`select current_database() as database_name, current_schema() as schema_name,
    current_setting('default_transaction_read_only') as read_only, inet_server_addr()::text as server_address,
    inet_server_port() as server_port, to_regclass('work_job')::text as work_jobs_table,
    to_regclass('schema_migrations')::text as migrations_table`)
  ).rows[0];
  const courses = (
    await client.query(
      `select * from course where title = any($1::text[]) or id ~ any($2::text[]) order by user_id, title, id`,
      [
        SEED_COURSES.map((seed) => seed.name),
        SEED_COURSES.map((seed) => `^${slug(seed.name)}-[0-9a-f]{8}$`),
      ],
    )
  ).rows;
  const results = [];
  for (const course of courses) {
    const seed =
      SEED_COURSES.find((item) => new RegExp(`^${slug(item.name)}-[0-9a-f]{8}$`).test(course.id)) ??
      SEED_COURSES.find((item) => item.name === course.title);
    const sources = (
      await client.query(
        "select * from learning_material where course_id = $1 order by title, id",
        [course.id],
      )
    ).rows;
    const concepts = (
      await client.query("select * from concept where course_id = $1 order by ordinal, id", [
        course.id,
      ])
    ).rows;
    const questions = (
      await client.query("select * from assessment_question where course_id = $1 order by id", [
        course.id,
      ])
    ).rows;
    const mastery = (
      await client.query(
        "select m.* from mastery_state m join concept c on c.id = m.concept_id where c.course_id = $1",
        [course.id],
      )
    ).rows;
    const counts = (
      await client.query(
        `select
      (select count(*)::int from practice_attempt where course_id = $1) as practice_attempts,
      (select count(*)::int from course_analysis where course_id = $1) as course_analyses,
      (select count(*)::int from assessment_analysis a join assessment_question q on q.id = a.assessment_question_id where q.course_id = $1) as assessment_analyses,
      (select count(*)::int from source_mapping m join assessment_question q on q.id = m.assessment_question_id where q.course_id = $1) as source_mappings,
      (select count(*)::int from concept_evidence e join concept c on c.id = e.concept_id where c.course_id = $1) as concept_evidence,
      (select count(*)::int from concept_relationship where course_id = $1) as relationships,
      (select count(*)::int from practice_question where course_id = $1) as generated_questions,
      (select count(*)::int from revision_plan where course_id = $1) as revision_plans`,
        [course.id],
      )
    ).rows[0];
    counts.work_jobs = metadata.work_jobs_table
      ? (
          await client.query("select count(*)::int as n from work_job where course_id = $1", [
            course.id,
          ])
        ).rows[0].n
      : 0;
    let changedSources = 0,
      legacySources = 0;
    for (const source of sources) {
      const expected = seed.sources.find((item) => item.title === source.title);
      if (!expected) continue;
      const chunks = (
        await client.query(
          "select ordinal, content, source_location, metadata from material_chunk where material_id = $1 order by ordinal",
          [source.id],
        )
      ).rows;
      const jobs = (
        await client.query("select * from material_ingestion_job where material_id = $1", [
          source.id,
        ])
      ).rows;
      const expectedChunks = chunkBlocks(expected.blocks).map((chunk, ordinal) => ({
        ordinal,
        content: chunk.content,
        source_location: chunk.location.label,
        metadata: chunk.metadata,
      }));
      const jobUnchanged =
        jobs.length === 1 &&
        jobs[0].status === "completed" &&
        !jobs[0].error_code &&
        !jobs[0].error_summary &&
        equal(jobs[0].metadata, {
          ...seedExtractionMetadata(expected),
          chunks: expectedChunks.length,
        });
      const legacyUnchanged = chunks.length === 0 && jobs.length === 0;
      if (legacyUnchanged) legacySources++;
      if (
        source.type !== expected.type ||
        source.location !== expected.location ||
        source.storage_reference ||
        source.mime_type ||
        source.size_bytes != null ||
        (!legacyUnchanged && (!equal(chunks, expectedChunks) || !jobUnchanged))
      )
        changedSources++;
    }
    const extraSources = sources.filter(
      (source) => !seed.sources.some((expected) => expected.title === source.title),
    ).length;
    const missingSources = seed.sources.filter(
      (expected) => sources.filter((source) => source.title === expected.title).length !== 1,
    ).length;
    const expectedQuestions = seed.assessments.map((question) => ({
      lesson: question.lesson,
      question_text: question.question,
    }));
    const extraQuestions = questions.filter(
      (question) =>
        !expectedQuestions.some(
          (expected) =>
            question.lesson === expected.lesson &&
            question.question_text === expected.question_text,
        ),
    ).length;
    const questionsUnchanged =
      questions.length === expectedQuestions.length &&
      expectedQuestions.every(
        (expected) =>
          questions.filter(
            (question) =>
              question.lesson === expected.lesson &&
              question.question_text === expected.question_text,
          ).length === 1,
      );
    const conceptsUnchanged =
      concepts.length === seed.concepts.length &&
      seed.concepts.every(
        (expected, ordinal) =>
          concepts.filter(
            (concept) =>
              concept.name === expected.name &&
              concept.ordinal === ordinal &&
              concept.origin === "seed" &&
              !concept.archived_at &&
              !concept.definition &&
              !concept.instructor_term &&
              !concept.source_reference &&
              !concept.evidence_status &&
              concept.confidence == null,
          ).length === 1,
      );
    const masteryUnchanged =
      mastery.length === seed.concepts.length &&
      concepts.every((concept) => {
        const expected = seed.concepts.find((item) => item.name === concept.name);
        const rows = mastery.filter((row) => row.concept_id === concept.id);
        return (
          expected &&
          rows.length === 1 &&
          rows[0].user_id === course.user_id &&
          rows[0].status === expected.status &&
          Number(rows[0].score) === expected.score &&
          Number(rows[0].attempt_count ?? 0) === 0 &&
          Number(rows[0].correct_count ?? 0) === 0 &&
          !rows[0].last_attempt_at
        );
      });
    const findings = (
      await client.query("select * from consistency_finding where course_id = $1", [course.id])
    ).rows;
    const findingsUnchanged =
      findings.length === 1 &&
      findings[0].assessment_question_id === null &&
      findings[0].status === seed.consistency.status &&
      findings[0].description === seed.consistency.reason &&
      findings[0].next_action === seed.consistency.nextAction &&
      !findings[0].source_a &&
      !findings[0].source_b;
    const metadataUnchanged =
      course.title === seed.name &&
      course.institution === seed.institution &&
      course.lesson === seed.lesson &&
      course.description === seed.summary;
    results.push({
      course_id: course.id,
      owner: createHash("sha256").update(course.user_id).digest("hex").slice(0, 12),
      title: course.title,
      created_at: course.created_at,
      sources: sources.length,
      expected_seed_sources: seed.sources.length,
      extra_sources: extraSources,
      changed_seed_sources: changedSources,
      legacy_sources_without_evidence: legacySources,
      missing_or_duplicate_seed_sources: missingSources,
      assessments: questions.length,
      expected_seed_assessments: seed.assessments.length,
      extra_or_edited_assessments: extraQuestions,
      assessments_unchanged: questionsUnchanged,
      concepts_unchanged: conceptsUnchanged,
      mastery_unchanged: masteryUnchanged,
      findings_unchanged: findingsUnchanged,
      ...counts,
      unchanged_from_seed:
        metadataUnchanged &&
        !extraSources &&
        !changedSources &&
        !missingSources &&
        questionsUnchanged &&
        conceptsUnchanged &&
        masteryUnchanged &&
        findingsUnchanged &&
        Object.values(counts).every((n) => n === 0),
    });
  }
  const owners = [...new Set(results.map((row) => row.owner))];
  console.log(
    JSON.stringify(
      {
        connection_host: url.hostname,
        connection_port: url.port || "5432",
        ...metadata,
        accounts: owners.length,
        account_groups: owners.map((owner) => ({
          owner,
          courses: results.filter((row) => row.owner === owner).map((row) => row.title),
        })),
        repeated_seed_per_account: owners.some((owner) =>
          SEED_COURSES.some(
            (seed) =>
              results.filter((row) => row.owner === owner && row.title === seed.name).length > 1,
          ),
        ),
        courses: results,
        unchanged_course_ids: results
          .filter((row) => row.unchanged_from_seed)
          .map((row) => row.course_id),
        migrations: metadata.migrations_table
          ? (await client.query("select version from schema_migrations order by version")).rows.map(
              (row) => row.version,
            )
          : null,
      },
      null,
      2,
    ),
  );
} finally {
  await client.end();
}
