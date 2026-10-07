// Edvance migration runner.
//
// Applies every file in db/migrations/*.sql, in filename order, exactly once.
// Each migration runs inside its own transaction; a migration that throws is
// rolled back and never recorded, so re-running is always safe.
//
// Usage: npm run migrate        (DATABASE_URL is injected by Infisical;
//                                the production pre-deploy step supplies it directly)
//
// On Vercel the Postgres integration does not always inject `DATABASE_URL`; it
// may expose the connection only as `POSTGRES_URL` (or Prisma's alias). For
// schema migrations a direct (non-pooled) connection is safest, so the
// non-pooling names are tried first, then the pooled ones. The Specific/Infisical
// deployment sets only `DATABASE_URL`, so its behaviour is unchanged.

import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, "..", "db", "migrations");

const DATABASE_URL_NAMES = [
  "DATABASE_URL_UNPOOLED", // Vercel/Neon: direct, non-pooled connection
  "POSTGRES_URL_NON_POOLING", // Vercel Postgres: direct, non-pooled connection
  "DATABASE_URL", // Edvance's documented name (Infisical, Specific)
  "POSTGRES_URL", // Vercel Postgres: pooled connection
  "POSTGRES_PRISMA_URL", // Vercel Postgres: pooled (Prisma alias)
];

const connectionString = DATABASE_URL_NAMES.map((name) => process.env[name]?.trim()).find(Boolean);
if (!connectionString) {
  console.error(
    `No database connection string is set. Set one of: ${DATABASE_URL_NAMES.join(", ")}.`,
  );
  console.error(
    "Locally: npm run migrate (this expects Infisical: infisical run --env=dev -- node scripts/migrate.mjs)",
  );
  console.error("On Vercel: the Postgres integration injects POSTGRES_URL automatically.");
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

  console.log(count === 0 ? "Database already up to date." : `Applied ${count} migration(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => client.end());
