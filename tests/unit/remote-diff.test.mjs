import { test } from "node:test";
import assert from "node:assert/strict";

import { compareRuns } from "../../scripts/lib/remote-diff.mjs";

/** Build a run from a list of [name, ok, detail?] tuples. */
function run(entries, crashed = null) {
  const order = [];
  const results = new Map();
  let passed = 0;
  const failures = [];
  for (const [name, ok, detail = ""] of entries) {
    order.push(name);
    results.set(name, { ok, detail });
    if (ok) passed += 1;
    else failures.push(`${name} — ${detail}`);
  }
  return { passed, failures, order, results, crashed };
}

test("identical runs have no differences", () => {
  const a = run([["one", true], ["two", false]]);
  const b = run([["one", true], ["two", false]]);
  const { names, differing } = compareRuns(a, b);
  assert.equal(names.length, 2);
  assert.equal(differing.length, 0);
});

test("both failing the same check is not a difference", () => {
  const a = run([["health", false, "503"]]);
  const b = run([["health", false, "500"]]);
  assert.equal(compareRuns(a, b).differing.length, 0);
});

test("passing on one and failing on the other is a difference", () => {
  const a = run([["health", true], ["db", true]]);
  const b = run([["health", true], ["db", false, "status 404"]]);
  const { differing } = compareRuns(a, b);
  assert.equal(differing.length, 1);
  assert.equal(differing[0].name, "db");
  assert.equal(differing[0].a, true);
  assert.equal(differing[0].b, false);
  assert.equal(differing[0].detailB, "status 404");
});

test("a check one run never reached counts as a difference", () => {
  const a = run([["health", true], ["upload", true]]);
  const b = run([["health", true]]); // crashed before "upload"
  const { differing } = compareRuns(a, b);
  assert.equal(differing.length, 1);
  assert.equal(differing[0].name, "upload");
  assert.equal(differing[0].a, true);
  assert.equal(differing[0].b, null);
});

test("names keep the order of the first run, then the extras", () => {
  const a = run([["one", true], ["two", true]]);
  const b = run([["one", true], ["two", true], ["three", true]]);
  assert.deepEqual(compareRuns(a, b).names, ["one", "two", "three"]);
});
