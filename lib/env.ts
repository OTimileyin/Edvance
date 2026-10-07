/**
 * Environment access.
 *
 * Configuration lives in Infisical and is injected by `infisical run`, which
 * `npm run dev` and `npm run migrate` wrap. When a required variable is missing
 * the app stops at first use with a message naming the variable and how to fix
 * it, rather than failing later inside a driver with an opaque error.
 */

/**
 * Names that may hold the pooled application database URL. `DATABASE_URL` is
 * Edvance's documented name (Specific/Infisical); Vercel's Postgres integration
 * does not always inject it and may expose the connection only as
 * `POSTGRES_URL` (or Prisma's `POSTGRES_PRISMA_URL`), so both are accepted.
 */
const POOLED_DATABASE_URL_NAMES = ["DATABASE_URL", "POSTGRES_URL", "POSTGRES_PRISMA_URL"] as const;

function missingEnvMessage(name: string): string {
  return (
    `Missing required environment variable ${name}. Edvance reads its ` +
    "configuration from Infisical — run `npm run dev` (which wraps " +
    "`infisical run --env=dev`), or provide the variable another way. " +
    'See README.md, "Secrets (Infisical)".'
  );
}

function missingAnyEnvMessage(names: readonly string[]): string {
  return (
    `Missing a database connection string. Set one of ${names.join(", ")}. ` +
    "Edvance reads its configuration from Infisical — run `npm run dev` " +
    "(which wraps `infisical run --env=dev`) — or, on Vercel, let the Postgres " +
    'integration inject it. See README.md, "Secrets (Infisical)".'
  );
}

/** First non-blank value among the names, or null when none is set. */
function firstSet(names: readonly string[]): string | null {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return null;
}

/** Reads a required variable, or throws a message that says how to fix it. */
export function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(missingEnvMessage(name));
  return value;
}

/** The trimmed value, or null when unset/blank — for genuinely optional settings. */
export function optionalEnv(name: string): string | null {
  return process.env[name]?.trim() || null;
}

/** Checks several required variables at once and throws on the first missing one. */
export function assertEnv(names: readonly string[]): void {
  for (const name of names) {
    if (!process.env[name]?.trim()) throw new Error(missingEnvMessage(name));
  }
}

/**
 * The application's pooled database URL, tolerating the variable names Vercel's
 * Postgres integration may use. Throws a readable error (naming every accepted
 * variable) when none is set.
 */
export function databaseUrl(): string {
  const value = firstSet(POOLED_DATABASE_URL_NAMES);
  if (!value) throw new Error(missingAnyEnvMessage(POOLED_DATABASE_URL_NAMES));
  return value;
}
