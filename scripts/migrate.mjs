// Edvance migration runner.
//
// Applies every file in db/migrations/*.sql, in filename order, exactly once.
// Each migration runs inside its own transaction; a migration that throws is
// rolled back and never recorded, so re-running is always safe.
//
// Usage: npm run migrate        (DATABASE_URL is injected by Infisical;
//                                the production pre-deploy step supplies it directly)

import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, "..", "db", "migrations");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. Run with: npm run migrate");
  console.error("(this expects Infisical: infisical run --env=dev -- node scripts/migrate.mjs)");
  process.exit(1);
}

const client = new pg.Client({ connectionString });

async function main() {
  await client.connect();

  await client.query(`
    create table if not exists schema_migrations (
      version    text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const applied = new Set(
    (await client.query("select version from schema_migrations")).rows.map((row) => row.version),
  );

  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`skip  ${file} (already applied)`);
      continue;
    }
    const sql = await readFile(join(migrationsDir, file), "utf8");
    process.stdout.write(`apply ${file} … `);
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into schema_migrations (version) values ($1)", [file]);
      await client.query("commit");
      console.log("ok");
      count += 1;
    } catch (error) {
      await client.query("rollback");
      console.error("failed");
      throw error;
    }
  }

  console.log(
    count === 0 ? "Database already up to date." : `Applied ${count} migration(s).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => client.end());
