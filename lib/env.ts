/**
 * Environment access.
 *
 * Configuration lives in Infisical and is injected by `infisical run`, which
 * `npm run dev` and `npm run migrate` wrap. When a required variable is missing
 * the app stops at first use with a message naming the variable and how to fix
 * it, rather than failing later inside a driver with an opaque error.
 */

function missingEnvMessage(name: string): string {
  return (
    `Missing required environment variable ${name}. Edvance reads its ` +
    "configuration from Infisical — run `npm run dev` (which wraps " +
    "`infisical run --env=dev`), or provide the variable another way. " +
    "See README.md, \"Secrets (Infisical)\"."
  );
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
