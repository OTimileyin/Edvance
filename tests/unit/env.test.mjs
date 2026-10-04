import { test } from "node:test";
import assert from "node:assert/strict";

import { databaseUrl } from "../../lib/env.ts";

const NAMES = ["DATABASE_URL", "POSTGRES_URL", "POSTGRES_PRISMA_URL"];

/** Run `fn` with exactly `values` set for the database variable names. */
function withEnv(values, fn) {
  const saved = new Map(NAMES.map((name) => [name, process.env[name]]));
  for (const name of NAMES) delete process.env[name];
  Object.assign(process.env, values);
  try {
    return fn();
  } finally {
    for (const name of NAMES) {
      const previous = saved.get(name);
      if (previous === undefined) delete process.env[name];
      else process.env[name] = previous;
    }
  }
}

test("prefers the documented DATABASE_URL", () => {
  withEnv({ DATABASE_URL: "postgres://primary", POSTGRES_URL: "postgres://fallback" }, () => {
    assert.equal(databaseUrl(), "postgres://primary");
  });
});

test("falls back to the POSTGRES_URL Vercel injects", () => {
  withEnv({ POSTGRES_URL: "postgres://vercel" }, () => {
    assert.equal(databaseUrl(), "postgres://vercel");
  });
});

test("accepts the Prisma alias Vercel also injects", () => {
  withEnv({ POSTGRES_PRISMA_URL: "postgres://prisma" }, () => {
    assert.equal(databaseUrl(), "postgres://prisma");
  });
});

test("ignores blank values and trims the one it uses", () => {
  withEnv({ DATABASE_URL: "   ", POSTGRES_URL: "  postgres://vercel  " }, () => {
    assert.equal(databaseUrl(), "postgres://vercel");
  });
});

test("names every accepted variable when none is set", () => {
  withEnv({}, () => {
    assert.throws(
      () => databaseUrl(),
      (error) => {
        for (const name of NAMES) assert.match(error.message, new RegExp(name));
        return true;
      },
    );
  });
});
