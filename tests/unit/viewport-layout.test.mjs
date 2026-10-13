import { test } from "node:test";
import assert from "node:assert/strict";

import {
  HORIZONTAL_TOLERANCE_PX,
  PHONE_WIDTHS,
  describeLayoutFailures,
  describeOffender,
  overflowsHorizontally,
  probeOverflow,
} from "../../scripts/lib/viewport-layout.mjs";

/** A measurement as the in-page probe returns it. */
function measured({ width = 320, scrollWidth = 320, offenders = [] } = {}) {
  return {
    viewportWidth: width,
    scrollWidth,
    overflowPx: Math.max(0, scrollWidth - width),
    offenders,
  };
}

test("phone widths are the narrowest real ones, ascending and unique", () => {
  assert.ok(PHONE_WIDTHS.length >= 3, "check more than one phone width");
  assert.deepEqual(
    [...PHONE_WIDTHS].sort((a, b) => a - b),
    PHONE_WIDTHS,
  );
  assert.equal(new Set(PHONE_WIDTHS).size, PHONE_WIDTHS.length);
  assert.equal(Math.min(...PHONE_WIDTHS), 320, "320px is the tightest width in use");
  assert.ok(PHONE_WIDTHS.every((width) => width <= 480));
});

test("a page that fits is not a failure", () => {
  assert.equal(overflowsHorizontally(measured()), false);
});

test("sub-pixel rounding within the tolerance is not a failure", () => {
  assert.equal(
    overflowsHorizontally(measured({ scrollWidth: 320 + HORIZONTAL_TOLERANCE_PX })),
    false,
  );
  assert.equal(overflowsHorizontally(measured({ scrollWidth: 322 })), true);
});

test("the tolerance is a parameter, so a stricter check is possible", () => {
  assert.equal(overflowsHorizontally(measured({ scrollWidth: 322 }), 4), false);
  assert.equal(overflowsHorizontally(measured({ scrollWidth: 330 }), 4), true);
});

test("an offender is described by its label, width and offending edge", () => {
  assert.equal(
    describeOffender({ label: "div.card-grid", left: 0, right: 412, width: 412 }),
    "div.card-grid (412px wide, reaches 412px)",
  );
  assert.equal(
    describeOffender({ label: "pre.code", left: -24, right: 296, width: 320 }),
    "pre.code (320px wide, overflows the left by 24px)",
  );
});

test("every page fitting produces no failure lines", () => {
  const results = [
    { target: "landing", width: 320, status: "measured", ...measured() },
    {
      target: "signin",
      width: 414,
      status: "measured",
      ...measured({ width: 414, scrollWidth: 414 }),
    },
  ];
  assert.deepEqual(describeLayoutFailures(results), []);
});

test("a page that scrolls sideways names the width, the amount and the offender", () => {
  const results = [
    {
      target: "landing",
      width: 320,
      status: "measured",
      ...measured({
        scrollWidth: 412,
        offenders: [{ label: "table.scores", left: 0, right: 412, width: 412 }],
      }),
    },
  ];
  const [line] = describeLayoutFailures(results);
  assert.match(line, /^landing @ 320px — scrolls 92px horizontally/);
  assert.match(line, /viewport 320px, document 412px/);
  assert.match(line, /table\.scores \(412px wide, reaches 412px\)/);
});

test("a failure inside the tolerance is not reported", () => {
  const results = [
    { target: "signup", width: 320, status: "measured", ...measured({ scrollWidth: 321 }) },
  ];
  assert.deepEqual(describeLayoutFailures(results), []);
});

test("a page that could not be measured fails and says why", () => {
  const results = [
    { target: "signin", width: 320, status: "error", detail: "…/signin answered 500" },
  ];
  assert.deepEqual(describeLayoutFailures(results), [
    "signin @ 320px — could not be measured: …/signin answered 500",
  ]);
});

test("failures keep the order they were measured in", () => {
  const results = [
    { target: "landing", width: 320, status: "measured", ...measured({ scrollWidth: 400 }) },
    { target: "signin", width: 320, status: "measured", ...measured() },
    {
      target: "signup",
      width: 360,
      status: "measured",
      ...measured({ width: 360, scrollWidth: 420 }),
    },
  ];
  const lines = describeLayoutFailures(results);
  assert.equal(lines.length, 2);
  assert.ok(lines[0].startsWith("landing @ 320px"));
  assert.ok(lines[1].startsWith("signup @ 360px"));
});

test("the in-page probe stays self-contained for serialisation", () => {
  // Playwright serialises this function and runs it in the browser, where
  // module scope does not exist: referencing anything above would throw there.
  const source = probeOverflow.toString();
  for (const identifier of ["PHONE_WIDTHS", "HORIZONTAL_TOLERANCE_PX", "describeOffender"]) {
    assert.ok(!source.includes(identifier), `probeOverflow must not reference ${identifier}`);
  }
});
