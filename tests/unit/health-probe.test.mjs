import { test } from "node:test";
import assert from "node:assert/strict";

import { classifyProbe } from "../../scripts/lib/health-probe.mjs";

const OK = { status: "ok", database: "ok" };

test("ready when 200 and the app reports itself ok", () => {
  assert.equal(classifyProbe(200, OK), "ready");
});

test("degraded when 200 but not fully ok", () => {
  assert.equal(classifyProbe(200, { status: "degraded", database: "error" }), "degraded");
  assert.equal(classifyProbe(200, { status: "ok" }), "degraded"); // no database field
  assert.equal(classifyProbe(200, null), "degraded");
});

test("degraded on a 5xx — reachable but unhealthy", () => {
  assert.equal(classifyProbe(503, { status: "degraded", database: "error" }), "degraded");
  assert.equal(classifyProbe(500, null), "degraded");
});

test("pending when nothing is serving yet", () => {
  assert.equal(classifyProbe(404, null), "pending"); // Vercel: DEPLOYMENT_NOT_FOUND
  assert.equal(classifyProbe(null, null), "pending"); // no response / no DNS
  assert.equal(classifyProbe(401, null), "pending");
});
