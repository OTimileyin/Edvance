import { test } from "node:test";
import assert from "node:assert/strict";
import { registerAppImports } from "../lib/app-modules.mjs";

registerAppImports();
const { resolveConceptIds } = await import("../../lib/ai/concept-identity.ts");
const { isMockProvider } = await import("../../lib/ai/gemini.ts");

test("production cannot enable the mock provider or null-ID scenario", () => {
  const nodeEnv = process.env.NODE_ENV;
  const mock = process.env.OYEVOLVE_AI_MOCK;
  try {
    process.env.NODE_ENV = "production";
    process.env.OYEVOLVE_AI_MOCK = "null-concept-ids";
    assert.equal(isMockProvider(), false);
  } finally {
    if (nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = nodeEnv;
    if (mock === undefined) delete process.env.OYEVOLVE_AI_MOCK;
    else process.env.OYEVOLVE_AI_MOCK = mock;
  }
});

for (const archivedAt of [null, "2026-10-14T00:00:00Z"]) {
  test(`null ID reuses normalized name match (${archivedAt ? "archived" : "active"})`, () => {
    const existing = [{ id: "stable-id", name: "  Frame   Question  ", archivedAt }];
    const output = [{ id: null, name: "\tFRAME \n question  ", definition: "Updated" }];
    assert.deepEqual(resolveConceptIds(output, existing), [{ ...output[0], id: "stable-id" }]);
    assert.equal(output[0].id, null, "resolution does not mutate model output");
  });
}

test("a new name remains null and cannot match an identity outside the supplied course", () => {
  const output = [{ id: null, name: "New Concept" }];
  assert.deepEqual(resolveConceptIds(output, [{ id: "other", name: "Different" }]), output);
});

test("an explicit unknown ID is rejected even when the name matches", () => {
  assert.throws(
    () =>
      resolveConceptIds([{ id: "wrong-course", name: "Frame" }], [{ id: "real", name: "Frame" }]),
    /unknown or duplicate existing concept id/,
  );
});

test("ambiguous normalized names fail without choosing or creating an identity", () => {
  assert.throws(
    () =>
      resolveConceptIds(
        [{ id: null, name: "Frame Question" }],
        [
          { id: "one", name: "Frame Question" },
          { id: "two", name: " FRAME   QUESTION " },
        ],
      ),
    /More than one existing concept/,
  );
});

test("duplicate resolved IDs are rejected", () => {
  assert.throws(
    () =>
      resolveConceptIds(
        [
          { id: "real", name: "Frame" },
          { id: null, name: " frame " },
        ],
        [{ id: "real", name: "Frame" }],
      ),
    /unknown or duplicate existing concept id/,
  );
});
