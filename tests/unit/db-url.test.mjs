import { test } from "node:test";
import assert from "node:assert/strict";

import { withLibpqSslCompat } from "../../lib/db-url.mjs";

/**
 * `pg-connection-string` treats `sslmode=require` as `verify-full`, which fails
 * against Vercel's certificate chain. These tests pin the narrow normalisation
 * that restores libpq semantics — and, just as importantly, pin that it does
 * nothing else.
 */

test("sslmode=require gains libpq compatibility", () => {
  assert.equal(
    withLibpqSslCompat("postgresql://u:p@host.neon.tech/edvance?sslmode=require"),
    "postgresql://u:p@host.neon.tech/edvance?sslmode=require&uselibpqcompat=true",
  );
});

test("sslmode=prefer gains libpq compatibility, and a second parameter is still appended", () => {
  assert.equal(
    withLibpqSslCompat("postgresql://u:p@host:5432/edvance?sslmode=prefer&connect_timeout=10"),
    "postgresql://u:p@host:5432/edvance?sslmode=prefer&connect_timeout=10&uselibpqcompat=true",
  );
});

test("a URL with no query string uses ? as the separator", () => {
  assert.equal(
    withLibpqSslCompat("postgresql://u:p@host/edvance"),
    "postgresql://u:p@host/edvance",
    "no sslmode means no SSL upgrade, so nothing may be appended",
  );
});

test("verify-full and verify-ca keep full certificate verification", () => {
  for (const mode of ["verify-full", "verify-ca"]) {
    const url = `postgresql://u:p@host/edvance?sslmode=${mode}`;
    assert.equal(withLibpqSslCompat(url), url, `${mode} must not be downgraded`);
  }
});

test("an explicit uselibpqcompat choice is respected", () => {
  const explicitOff = "postgresql://u:p@host/edvance?sslmode=require&uselibpqcompat=false";
  assert.equal(withLibpqSslCompat(explicitOff), explicitOff);
});

test("unset values pass through unchanged", () => {
  assert.equal(withLibpqSslCompat(undefined), undefined);
  assert.equal(withLibpqSslCompat(null), null);
  assert.equal(withLibpqSslCompat(""), "");
});

test("the credential is never rewritten", () => {
  // A percent-encoded password must survive byte-for-byte: this is why the
  // helper appends to the string instead of round-tripping through `new URL()`.
  const url = "postgresql://user%40example:p%2Fss%3Dword@host/edvance?sslmode=require";
  assert.equal(withLibpqSslCompat(url), `${url}&uselibpqcompat=true`);
});
