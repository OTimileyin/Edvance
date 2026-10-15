// SELECT-only audit. Connection-level read-only mode prevents accidental writes.
import { Client } from "pg";
import { databaseUrl } from "../lib/env.ts";
import { SEED_COURSES } from "../lib/data.ts";

const seeds = SEED_COURSES.map((seed) => ({
  title: seed.name,
  institution: seed.institution,
  lesson: seed.lesson,
  description: seed.summary,
  id_pattern: `^${seed.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}-[0-9a-f]{8}$`,
}));

export const SEED_COUNT_SELECT = `select seed.title,
       count(c.id)::int as candidates,
       count(c.id) filter (where c.title = seed.title)::int as matching_title,
       count(c.id) filter (where c.id ~ seed.id_pattern)::int as matching_seed_id_pattern,
       count(c.id) filter (where c.title = seed.title and c.institution = seed.institution
         and c.lesson = seed.lesson and c.description = seed.description)::int as matching_all_seed_metadata,
       count(c.id) filter (where c.id ~ seed.id_pattern and c.title <> seed.title)::int as renamed_seed_id_matches,
       count(c.id) filter (where c.id !~ seed.id_pattern and c.title = seed.title)::int as title_only_unproven,
       count(c.id) filter (where exists (
         select 1 from concept co where co.course_id = c.id and co.origin = 'seed'
       ))::int as candidates_with_seed_concepts
  from jsonb_to_recordset($1::jsonb) as seed(
    title text, institution text, lesson text, description text, id_pattern text
  )
  left join course c on c.title = seed.title or c.id ~ seed.id_pattern
 group by seed.title order by seed.title`;

const client = new Client({
  connectionString: databaseUrl(),
  options: "-c default_transaction_read_only=on -c statement_timeout=15000",
  connectionTimeoutMillis: 10000,
});
try {
  await client.connect();
  const metadata = await client.query(`select current_database() as database_name,
    current_schema() as schema_name,
    current_setting('default_transaction_read_only') as read_only,
    array(select column_name from information_schema.columns
      where table_schema = current_schema() and table_name = 'course'
      order by ordinal_position) as course_columns`);
  const counts = await client.query(SEED_COUNT_SELECT, [JSON.stringify(seeds)]);
  console.log(
    JSON.stringify(
      {
        ...metadata.rows[0],
        results: counts.rows,
        total_seed_id_pattern_matches: counts.rows.reduce(
          (sum, row) => sum + row.matching_seed_id_pattern,
          0,
        ),
        total_title_only_unproven: counts.rows.reduce(
          (sum, row) => sum + row.title_only_unproven,
          0,
        ),
        caveat:
          "No course demo flag or provenance record exists. ID pattern and metadata are evidence, not a definitive audit trail; renamed or manually edited IDs can escape detection.",
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(`SELECT-only audit failed (${error.code ?? error.name}); no data was modified.`);
  process.exitCode = 1;
} finally {
  await client.end();
}
