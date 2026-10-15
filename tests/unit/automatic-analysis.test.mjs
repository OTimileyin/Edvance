import { test } from "node:test";
import assert from "node:assert/strict";
import { batchReadiness } from "../../lib/automatic-analysis.ts";

const source = (id, status, chunkCount = 0, queued = false) => ({
  id,
  queued,
  ingestion: status ? { status, chunkCount } : null,
});

test("waits until every uploaded material has a terminal extraction state", () => {
  assert.equal(
    batchReadiness(["a", "b"], [source("a", "completed", 2), source("b", "processing")]),
    "waiting",
  );
});

test("starts analysis when at least one material has evidence and the rest are terminal", () => {
  assert.equal(
    batchReadiness(["a", "b"], [source("a", "completed", 2), source("b", "failed")]),
    "ready",
  );
});

test("does not analyse a batch with no readable evidence", () => {
  assert.equal(
    batchReadiness(["a", "b"], [source("a", "failed"), source("b", "completed", 0)]),
    "unreadable",
  );
});

test("waits if the course response does not include every uploaded material yet", () => {
  assert.equal(batchReadiness(["a", "b"], [source("a", "completed", 2)]), "waiting");
});

test("waits while a material is still queued even if extraction is marked completed", () => {
  assert.equal(batchReadiness(["a"], [source("a", "completed", 2, true)]), "waiting");
});
