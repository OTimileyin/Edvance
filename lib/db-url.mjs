// Postgres connection-string handling shared by the application and the
// migration runner (`scripts/migrate.mjs`).
//
// Why this exists: the parser inside `pg` (`pg-connection-string`) now treats
// the SSL modes `require`, `prefer` and `verify-ca` as aliases for
// `verify-full`. Vercel's build and function sandboxes terminate TLS with a
// certificate chain Node does not trust, so the Neon-backed `POSTGRES_URL`
// Vercel's Postgres integration injects fails the handshake with
// `SELF_SIGNED_CERT_IN_CHAIN`. The build stops at the migration step ("Command
// `node scripts/migrate.mjs && next build` exited with 1") and the deployed app
// cannot reach its database either.
//
// `uselibpqcompat=true` is the migration path `pg-connection-string` documents
// for exactly this change: it restores libpq's meaning of `sslmode=require` —
// encrypt the connection, but do not verify the CA chain. It is applied only to
// the modes the library now silently upgrades, and never to `verify-full` or
// `verify-ca`, which keep full certificate verification. A URL with no
// `sslmode` at all (the local development database) is returned untouched.
//
// The string is edited in place rather than round-tripped through `new URL()`
// so the credentials are never re-encoded.

/** SSL modes libpq defines as "encrypt, but do not verify the CA chain". */
const LIBPQ_COMPATIBLE_MODES = /[?&]sslmode=(require|prefer|allow)(?:&|$)/i;

/**
 * Returns `connectionString` with `uselibpqcompat=true` appended when it asks
 * for an SSL mode `pg-connection-string` would otherwise upgrade to full
 * verification; otherwise returns it unchanged.
 *
 * @param {string | null | undefined} connectionString
 * @returns {string | null | undefined}
 */
export function withLibpqSslCompat(connectionString) {
  if (!connectionString) return connectionString;
  // Already opted in (or explicitly set to something else) — respect it.
  if (/[?&]uselibpqcompat=/i.test(connectionString)) return connectionString;
  if (!LIBPQ_COMPATIBLE_MODES.test(connectionString)) return connectionString;
  const separator = connectionString.includes("?") ? "&" : "?";
  return `${connectionString}${separator}uselibpqcompat=true`;
}
