// Phone-width horizontal-scroll smoke check, shared by the visual regression
// harness (`scripts/visual-regression.mjs`).
//
// Pixel baselines catch a page growing wider only indirectly, and only at the
// widths someone screenshotted. A page that scrolls sideways at a phone width is
// a plain layout bug, so it is measured directly instead: the document's scroll
// width is compared with its client width, and the elements sticking out are
// named, so a failure is diagnosable without opening the diff images.
//
// `probeOverflow` runs inside the page — Playwright serialises it, so it must
// stay self-contained — while everything that *decides* something from its
// numbers is pure and unit-tested in `tests/unit/viewport-layout.test.mjs`.

/**
 * The widths real phones use, tightest first. 320px is the narrowest width still
 * in use (small Android, iPhone SE), so a page that fits there fits every wider
 * phone.
 */
export const PHONE_WIDTHS = [320, 360, 375, 414];

/** Sub-pixel layout rounding is not a regression: allow one pixel of slack. */
export const HORIZONTAL_TOLERANCE_PX = 1;

/**
 * Runs in the page: measures how far the document scrolls horizontally and names
 * the elements that stick out past the viewport. An element inside a container
 * that scrolls or clips on its own is not an offender — only the document
 * scrolling sideways is the bug.
 *
 * Self-contained on purpose: Playwright serialises this function, so it may not
 * reference anything from module scope.
 *
 * @param {{ tolerancePx?: number }} options
 * @returns {{ viewportWidth: number, scrollWidth: number, overflowPx: number,
 *             offenders: Array<{ label: string, left: number, right: number, width: number }> }}
 */
export function probeOverflow(options) {
  const tolerance = options && options.tolerancePx ? options.tolerancePx : 1;
  const limit = 5;
  const doc = document.documentElement;
  const viewportWidth = doc.clientWidth;
  const scrollWidth = Math.max(doc.scrollWidth, document.body ? document.body.scrollWidth : 0);
  const overflowPx = Math.max(0, scrollWidth - viewportWidth);
  const offenders = [];

  if (overflowPx > tolerance) {
    const scrollsOnItsOwn = (element) => {
      for (let node = element.parentElement; node && node !== doc; node = node.parentElement) {
        const overflowX = getComputedStyle(node).overflowX;
        if (overflowX === "auto" || overflowX === "scroll" || overflowX === "hidden") return true;
      }
      return false;
    };

    const candidates = [];
    for (const element of document.querySelectorAll("body *")) {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const excess = Math.max(rect.right - viewportWidth, -rect.left);
      if (excess <= tolerance) continue;
      if (scrollsOnItsOwn(element)) continue;
      candidates.push({ element, rect, excess });
    }
    // The widest offenders are the useful ones to name, so a container that
    // wraps everything is reported instead of the first child that happens to
    // stick out.
    candidates.sort((a, b) => b.excess - a.excess);

    for (const { element, rect } of candidates.slice(0, limit)) {
      const classes =
        typeof element.className === "string"
          ? element.className.trim().split(/\s+/).filter(Boolean).slice(0, 2)
          : [];
      offenders.push({
        label: `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}${classes
          .map((name) => `.${name}`)
          .join("")}`,
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
      });
    }
  }

  return { viewportWidth, scrollWidth, overflowPx, offenders };
}

/**
 * Whether a measurement is a real horizontal-scroll regression. The tolerance
 * absorbs sub-pixel rounding, which is not a layout bug.
 *
 * @param {{ overflowPx: number }} measurement
 * @param {number} [tolerancePx]
 * @returns {boolean}
 */
export function overflowsHorizontally(measurement, tolerancePx = HORIZONTAL_TOLERANCE_PX) {
  return measurement.overflowPx > tolerancePx;
}

/**
 * A readable description of one element sticking out of the viewport.
 *
 * @param {{ label: string, left: number, right: number, width: number }} offender
 * @returns {string}
 */
export function describeOffender(offender) {
  const edge =
    offender.left < 0
      ? `overflows the left by ${Math.abs(offender.left)}px`
      : `reaches ${offender.right}px`;
  return `${offender.label} (${offender.width}px wide, ${edge})`;
}

/**
 * The report lines for every page/width that does not fit, in run order. Empty
 * when every page fitted — which is exactly what the smoke check asserts.
 *
 * @param {Array<{ target: string, width: number, status: string, detail?: string,
 *                 overflowPx?: number, viewportWidth?: number, scrollWidth?: number,
 *                 offenders?: Array<{ label: string, left: number, right: number, width: number }> }>} results
 * @param {number} [tolerancePx]
 * @returns {string[]}
 */
export function describeLayoutFailures(results, tolerancePx = HORIZONTAL_TOLERANCE_PX) {
  const lines = [];
  for (const result of results) {
    if (result.status === "error") {
      lines.push(
        `${result.target} @ ${result.width}px — could not be measured: ${
          result.detail ?? "unknown error"
        }`,
      );
      continue;
    }
    if (!overflowsHorizontally({ overflowPx: result.overflowPx ?? 0 }, tolerancePx)) continue;
    const offenders = (result.offenders ?? []).map(describeOffender);
    lines.push(
      `${result.target} @ ${result.width}px — scrolls ${result.overflowPx}px horizontally ` +
        `(viewport ${result.viewportWidth}px, document ${result.scrollWidth}px)` +
        (offenders.length > 0 ? `: ${offenders.join("; ")}` : ""),
    );
  }
  return lines;
}
