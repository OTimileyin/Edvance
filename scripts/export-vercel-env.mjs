// Exports the environment variables a Vercel deployment needs, into a local,
// gitignored file (`.env.vercel.local`) that can be pasted into the Vercel
// project's Environment Variables settings.
//
// The values come from the same Infisical `dev` environment the Specific
// deployment uses, so the two deployments share one set of integration keys.
// Secrets are read from the process environment and written straight to disk:
// they are never printed, so they cannot leak into a terminal log.
//
// Usage: infisical run --env=dev -- node scripts/export-vercel-env.mjs

import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const target = join(here, "..", ".env.vercel.local");

// Everything except the database connection string, which the Vercel Postgres
// integration injects into the project itself (as DATABASE_URL or POSTGRES_URL —
// the app accepts either). BETTER_AUTH_URL is filled in once Vercel has told us
// the deployment's URL.
const SHARED = ["GEMINI_API_KEY", "SUPABASE_URL", "SUPABASE_SECRET_KEY", "SUPABASE_STORAGE_BUCKET"];

const lines = [
  "# Vercel deployment — Environment Variables",
  "#",
  "# Copy each line into: Vercel → Project → Settings → Environment Variables.",
  "# Set every value for Production, Preview and Development.",
  "#",
  "# This file is gitignored (.env.* is ignored except .env.example). Do not commit it.",
  "",
];

const missing = [];
for (const name of SHARED) {
  const value = process.env[name]?.trim();
  if (!value) {
    missing.push(name);
    continue;
  }
  lines.push(`${name}=${value}`);
}

// Pinned explicitly, matching specific.hcl, so both deployments serve the same
// model and a rollout is reproducible.
lines.push(`GEMINI_MODEL=${process.env.GEMINI_MODEL?.trim() || "gemini-3-flash-preview"}`);

// A fresh signing secret for the Vercel deployment. Deliberately NOT reused from
// the Specific environment: sessions are per-deployment, and rotating one must
// not invalidate the other.
lines.push(`BETTER_AUTH_SECRET=${randomBytes(32).toString("base64url")}`);

lines.push("");
lines.push("# Set this to the deployed URL Vercel gives you, e.g. https://edvance.vercel.app");
lines.push("BETTER_AUTH_URL=");
lines.push("");
lines.push("# The database connection string is provided automatically by the Vercel");
lines.push("# Postgres integration (as DATABASE_URL or POSTGRES_URL). Do not set it by hand.");
lines.push("");

if (missing.length > 0) {
  console.error(`Not set in this environment, so omitted: ${missing.join(", ")}`);
}

await writeFile(target, lines.join("\n"), "utf8");
console.log(`Wrote ${target} (values not printed).`);
if (missing.length > 0) process.exitCode = 1;
