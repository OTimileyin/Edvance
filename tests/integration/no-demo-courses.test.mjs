import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { registerHooks } from "node:module";
import { createServer } from "node:http";
import { once } from "node:events";
import { Pool } from "pg";
import { registerAppImports } from "../lib/app-modules.mjs";

registerAppImports();
const { databaseUrl } = await import("../../lib/env.ts");
// Only Next's request context is adapted; authentication, routes and SQL are real.
const headerModule =
  "data:text/javascript," +
  encodeURIComponent(`
  export async function headers() { return globalThis.noDemoHeaders ?? new Headers(); }
  export async function cookies() { return { set() {} }; }
`);
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/headers" || specifier === "next/headers.js")
      return { url: headerModule, shortCircuit: true };
    if (specifier === "next/server") return nextResolve("next/server.js", context);
    return nextResolve(specifier, context);
  },
});

test("new signup + courses GET inserts zero course, concept, mastery_state and learning_material rows", async (t) => {
  const connectionString = databaseUrl();
  assert.ok(
    ["localhost", "127.0.0.1", "[::1]"].includes(new URL(connectionString).hostname),
    "Remote databases are refused; use disposable local PostgreSQL.",
  );
  const schema = `no_demo_${randomUUID().replaceAll("-", "")}`;
  const admin = new Pool({ connectionString });
  const previousEnv = Object.fromEntries(
    ["DATABASE_URL", "BETTER_AUTH_SECRET", "BETTER_AUTH_URL", "NODE_ENV"].map((key) => [
      key,
      process.env[key],
    ]),
  );
  let pool, authPool, server, auth, listRoute, detailRoute;
  try {
    await admin.query(`create schema "${schema}"`);
    const isolatedUrl = new URL(connectionString);
    isolatedUrl.searchParams.set("options", `-c search_path=${schema}`);
    process.env.DATABASE_URL = isolatedUrl.href;
    process.env.BETTER_AUTH_SECRET = "local-regression-secret-for-no-demo-courses-only";
    process.env.NODE_ENV = "test";
    pool = new Pool({ connectionString: isolatedUrl.href });
    globalThis.oyevolvePool = pool;
    const migrations = new URL("../../db/migrations/", import.meta.url);
    for (const name of (await readdir(migrations)).filter((file) => file.endsWith(".sql")).sort()) {
      await pool.query(await readFile(new URL(name, migrations), "utf8"));
    }
    server = createServer(async (request, response) => {
      try {
        const url = new URL(request.url, process.env.BETTER_AUTH_URL);
        const headers = new Headers();
        for (const [name, value] of Object.entries(request.headers))
          if (value) headers.set(name, Array.isArray(value) ? value.join(", ") : value);
        globalThis.noDemoHeaders = headers;
        let result;
        if (url.pathname === "/api/courses") result = await listRoute.GET();
        else if (url.pathname === "/api/courses/missing")
          result = await detailRoute.GET(new Request(url, { headers }), {
            params: Promise.resolve({ courseId: "missing" }),
          });
        else {
          const chunks = [];
          for await (const chunk of request) chunks.push(chunk);
          result = await auth.handler(
            new Request(url, {
              method: request.method,
              headers,
              ...(request.method === "GET" ? {} : { body: Buffer.concat(chunks) }),
            }),
          );
        }
        response.statusCode = result.status;
        for (const [name, value] of result.headers)
          if (name !== "set-cookie") response.setHeader(name, value);
        response.setHeader("set-cookie", result.headers.getSetCookie());
        response.end(await result.text());
      } catch (error) {
        response.statusCode = 500;
        response.end(error.message);
      }
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const origin = `http://127.0.0.1:${server.address().port}`;
    process.env.BETTER_AUTH_URL = origin;
    ({ auth } = await import("../../lib/auth.ts"));
    authPool = (await auth.$context).options.database;
    listRoute = await import("../../app/api/courses/route.ts");
    detailRoute = await import("../../app/api/courses/[courseId]/route.ts");

    const signup = await fetch(`${origin}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify({
        name: "New learner",
        email: "new-learner@test.invalid",
        password: "local-test-password",
      }),
    });
    assert.equal(signup.status, 200, await signup.clone().text());
    const user = (await signup.json()).user;
    assert.ok(user.id);
    const cookie = signup.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; ");
    assert.ok(cookie);
    async function counts() {
      return (
        await pool.query(`select
        (select count(*)::int from course) as course,
        (select count(*)::int from concept) as concept,
        (select count(*)::int from mastery_state) as mastery_state,
        (select count(*)::int from learning_material) as learning_material`)
      ).rows[0];
    }
    const zero = { course: 0, concept: 0, mastery_state: 0, learning_material: 0 };
    assert.deepEqual(await counts(), zero, "signup itself must not seed");
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await fetch(`${origin}/api/courses`, { headers: { cookie } });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { courses: [] });
      assert.deepEqual(await counts(), zero);
    }
    const missing = await fetch(`${origin}/api/courses/missing`, { headers: { cookie } });
    assert.equal(missing.status, 404);
    assert.deepEqual(await counts(), zero, "single-course GET must not seed either");
    console.log("New-user SELECT counts:", JSON.stringify(await counts()));

    await t.test("GET session checks neither refresh nor delete database sessions", async () => {
      await pool.query(
        `update session set "updatedAt" = now() - interval '6 days', "expiresAt" = now() + interval '1 day' where "userId" = $1`,
        [user.id],
      );
      const before = (await pool.query(`select * from session where "userId" = $1`, [user.id]))
        .rows;
      const session = await fetch(`${origin}/api/auth/get-session`, { headers: { cookie } });
      assert.equal(session.status, 200);
      assert.equal((await session.json()).needsRefresh, true);
      assert.deepEqual(
        (await pool.query(`select * from session where "userId" = $1`, [user.id])).rows,
        before,
      );
      await pool.query(
        `update session set "expiresAt" = now() - interval '1 day' where "userId" = $1`,
        [user.id],
      );
      const expiredBefore = (
        await pool.query(`select * from session where "userId" = $1`, [user.id])
      ).rows;
      const expired = await fetch(`${origin}/api/auth/get-session`, { headers: { cookie } });
      assert.equal(await expired.json(), null);
      assert.deepEqual(
        (await pool.query(`select * from session where "userId" = $1`, [user.id])).rows,
        expiredBefore,
      );
      assert.deepEqual(await counts(), zero);
    });
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (authPool) await authPool.end();
    if (pool) await pool.end();
    delete globalThis.oyevolvePool;
    delete globalThis.noDemoHeaders;
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await admin.query(`drop schema if exists "${schema}" cascade`);
    await admin.end();
  }
});
