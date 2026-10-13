#!/usr/bin/env node
/**
 * Visual regression for the plush design.
 *
 * Captures full-page screenshots of the plush surfaces — the landing page,
 * sign-in, sign-up, the offline-revision page, and the two design-document
 * HTML files (design.html, assessment-intelligence.html) — at a desktop and a
 * mobile viewport, then compares them pixel-for-pixel against the baselines
 * committed in tests/visual/baselines/. Any drift (a colour token change, a
 * spacing shift, a component restyle) fails the run and writes the captured
 * image plus a highlighted diff into .tmp-scratch/visual/ for inspection.
 *
 * The same pass runs a viewport layout smoke check: every target is also
 * measured at each phone width in scripts/lib/viewport-layout.mjs, and the run
 * fails when a page scrolls horizontally. That check needs no baselines, so a
 * layout regression is caught at 320px even when nobody is looking at the diff
 * images — and a page that scrolls sideways is never baselined.
 *
 * Usage:
 *   node scripts/visual-regression.mjs                compare against baselines
 *   node scripts/visual-regression.mjs --update       write fresh baselines
 *   node scripts/visual-regression.mjs --layout-only  only the phone-width smoke check
 *   node scripts/visual-regression.mjs --grep=landing run a subset of targets
 *   node scripts/visual-regression.mjs --base-url=…   use a running server
 *                                                    (otherwise `next start`
 *                                                    is spawned on :3311; the
 *                                                    .next build must exist)
 *
 * Baselines are renderer-specific (font rasterisation differs per OS), so they
 * must be captured with the same Chromium/OS that CI uses. The supported flows
 * are (a) run this script inside the Playwright Docker image matching the
 * pinned playwright version, or (b) dispatch the check workflow with the
 * "update-baselines" input and commit the artifact it uploads. Do not commit
 * baselines captured on a developer machine unless it renders identically.
 *
 * Determinism: one fresh browser context per shot (no service-worker or cache
 * carry-over), deviceScaleFactor 1, en-US/UTC, reduced motion, animations and
 * caret disabled, document.fonts.ready awaited before the capture.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import {
  HORIZONTAL_TOLERANCE_PX,
  PHONE_WIDTHS,
  describeLayoutFailures,
  overflowsHorizontally,
  probeOverflow,
} from "./lib/viewport-layout.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE_DIR = path.join(ROOT, "tests", "visual", "baselines");
// .tmp-scratch is already ignored by .gitignore, .prettierignore and eslint,
// so run artifacts never touch the formatting gates or the tree.
const OUTPUT_DIR = path.join(ROOT, ".tmp-scratch", "visual");

/** The plush pages under regression. HTTP targets need a built server; file
 * targets are the standalone design documents served from the repo root. */
const TARGETS = [
  { name: "landing", urlPath: "/" },
  { name: "signin", urlPath: "/signin" },
  { name: "signup", urlPath: "/signup" },
  { name: "offline-revision", urlPath: "/offline-revision" },
  { name: "design-doc", file: "design.html" },
  { name: "assessment-intelligence-doc", file: "assessment-intelligence.html" },
];

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 375, height: 812 },
];

/** The height a phone page is measured at. Phone widths deliberately do not
 * enter VIEWPORTS: the smoke check measures layout instead of screenshotting,
 * so adding a width can never require re-baselining. */
const PHONE_HEIGHT = 812;

/** Per-pixel colour tolerance (0–1) for the diff — absorbs sub-pixel
 * rasterisation noise without hiding a real colour-token change. */
const PIXELMATCH_THRESHOLD = 0.15;
/** Share of pixels allowed to differ before the shot fails. Baseline captures
 * on the CI renderer should be byte-identical run-to-run, so this only needs
 * to absorb antialiasing jitter on the HTML docs' web fonts. */
const MAX_DIFF_RATIO = 0.001;

function parseArgs(argv) {
  const args = {
    update: false,
    layoutOnly: false,
    grep: "",
    baseUrl: "",
    port: Number(process.env.VISUAL_PORT ?? 3311),
  };
  for (const arg of argv) {
    if (arg === "--update") args.update = true;
    else if (arg === "--layout-only") args.layoutOnly = true;
    else if (arg.startsWith("--grep=")) args.grep = arg.slice("--grep=".length);
    else if (arg.startsWith("--base-url=")) args.baseUrl = arg.slice("--base-url=".length);
    else if (arg.startsWith("--port=")) args.port = Number(arg.slice("--port=".length));
    else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(2);
    }
  }
  return args;
}

async function waitForServer(url, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.status < 500) return;
    } catch {
      // Server not accepting connections yet.
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server at ${url} did not become ready in ${timeoutMs}ms`);
}

async function startServer(port) {
  const buildId = path.join(ROOT, ".next", "BUILD_ID");
  if (!existsSync(buildId)) {
    throw new Error(
      "No production build found (.next/BUILD_ID). Run `npm run build` first, " +
        "or pass --base-url=http://host:port to target a running server.",
    );
  }
  const nextBin = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
  const child = spawn(process.execPath, [nextBin, "start", "-p", String(port)], {
    cwd: ROOT,
    stdio: "ignore",
  });
  const url = `http://localhost:${port}`;
  try {
    await waitForServer(url);
  } catch (err) {
    child.kill();
    throw err;
  }
  return { child, url };
}

/** Opens one target in a fresh context at one viewport, so no service-worker
 * or cache state carries between shots. Throws if an HTTP target answers with an
 * error status, so a broken page is never measured or baselined; the caller owns
 * the returned context and closes it. */
async function openTarget(browser, baseUrl, target, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    locale: "en-US",
    timezoneId: "UTC",
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const url = target.file
    ? pathToFileURL(path.join(ROOT, target.file)).href
    : new URL(target.urlPath, baseUrl).href;
  try {
    const response = await page.goto(url, { waitUntil: "load", timeout: 30_000 });
    if (response && response.status() >= 400) {
      throw new Error(`${url} answered ${response.status()}`);
    }
    await page.evaluate(() => document.fonts.ready);
  } catch (error) {
    await context.close();
    throw error;
  }
  return { context, page, url };
}

/** Captures one target at one viewport into `outFile`. */
async function capture(browser, baseUrl, target, viewport, outFile) {
  const { context, page } = await openTarget(browser, baseUrl, target, viewport);
  try {
    await page.waitForTimeout(350);
    await page.screenshot({
      path: outFile,
      fullPage: true,
      animations: "disabled",
      caret: "hide",
      scale: "css",
    });
  } finally {
    await context.close();
  }
}

/** Measures one target at one phone width. Text is allowed to settle first, for
 * the same reason a capture waits: a web font landing after the measurement
 * could change how wide the page lays out. */
async function measureLayout(browser, baseUrl, target, width) {
  const { context, page } = await openTarget(browser, baseUrl, target, {
    width,
    height: PHONE_HEIGHT,
  });
  try {
    await page.waitForTimeout(350);
    return await page.evaluate(probeOverflow, { tolerancePx: HORIZONTAL_TOLERANCE_PX });
  } finally {
    await context.close();
  }
}

/** Compares one captured PNG against its baseline. Returns a result object;
 * writes the diff PNG next to the actual when pixels drift. */
async function compareShot(baselineFile, actualFile, diffFile, dims) {
  const shot = { status: "pass", diffPixels: 0, diffRatio: 0, detail: "" };
  if (!existsSync(baselineFile)) {
    return { ...shot, status: "missing", detail: "no baseline" };
  }
  const baseline = PNG.sync.read(await readFile(baselineFile));
  const actual = PNG.sync.read(await readFile(actualFile));
  const width = Math.max(baseline.width, actual.width);
  const height = Math.max(baseline.height, actual.height);
  if (baseline.width !== actual.width || baseline.height !== actual.height) {
    // Size changes are layout drift on their own; pad so a diff still exists.
    const pad = (img) => {
      const canvas = new PNG({ width, height });
      PNG.bitblt(img, canvas, 0, 0, img.width, img.height, 0, 0);
      return canvas;
    };
    const diff = new PNG({ width, height });
    pixelmatch(pad(baseline).data, pad(actual).data, diff.data, width, height, {
      threshold: PIXELMATCH_THRESHOLD,
    });
    await writeFile(diffFile, PNG.sync.write(diff));
    return {
      ...shot,
      status: "size",
      diffPixels: width * height,
      diffRatio: 1,
      detail: `size changed ${baseline.width}x${baseline.height} -> ${actual.width}x${actual.height} (${dims.width}x${dims.height} viewport)`,
    };
  }
  const diff = new PNG({ width, height });
  const diffPixels = pixelmatch(baseline.data, actual.data, diff.data, width, height, {
    threshold: PIXELMATCH_THRESHOLD,
  });
  const diffRatio = diffPixels / (width * height);
  if (diffPixels > 0) await writeFile(diffFile, PNG.sync.write(diff));
  if (diffRatio > MAX_DIFF_RATIO) {
    return {
      ...shot,
      status: "drift",
      diffPixels,
      diffRatio: Number(diffRatio.toFixed(5)),
      detail: `${diffPixels} pixels differ (${(diffRatio * 100).toFixed(2)}% > ${(MAX_DIFF_RATIO * 100).toFixed(2)}% allowed)`,
    };
  }
  return { ...shot, diffPixels, diffRatio: Number(diffRatio.toFixed(5)) };
}

/** Measures every target at every phone width. A page that cannot be measured is
 * recorded as an error instead of aborting the run, so one broken URL cannot
 * hide the state of the others. */
async function runLayoutPass(browser, baseUrl, targets, layoutResults) {
  for (const target of targets) {
    for (const width of PHONE_WIDTHS) {
      process.stdout.write(`layout ${target.name}@${width} … `);
      try {
        const measured = await measureLayout(browser, baseUrl, target, width);
        layoutResults.push({ target: target.name, width, status: "measured", ...measured });
        console.log(overflowsHorizontally(measured) ? `SCROLLS ${measured.overflowPx}px` : "fits");
      } catch (err) {
        console.log(`ERROR — ${err.message}`);
        layoutResults.push({
          target: target.name,
          width,
          status: "error",
          detail: err.message,
          viewportWidth: width,
          scrollWidth: 0,
          overflowPx: 0,
          offenders: [],
        });
      }
    }
  }
}

/** Captures and compares every target at every screenshot viewport. */
async function runPixelPass(browser, baseUrl, targets, args, results) {
  for (const target of targets) {
    for (const viewport of VIEWPORTS) {
      const shotName = `${target.name}-${viewport.name}`;
      const actualFile = path.join(OUTPUT_DIR, "actual", `${shotName}.png`);
      const baselineFile = path.join(BASELINE_DIR, `${shotName}.png`);
      const diffFile = path.join(OUTPUT_DIR, "diff", `${shotName}.png`);
      process.stdout.write(`capturing ${shotName} … `);
      // One broken page must not hide the state of the others: a capture
      // error is recorded as a failing shot and the run continues.
      try {
        await capture(browser, baseUrl, target, viewport, actualFile);
      } catch (err) {
        console.log(`ERROR — ${err.message}`);
        results.push({
          shot: shotName,
          status: "error",
          diffPixels: 0,
          diffRatio: 0,
          detail: err.message,
        });
        continue;
      }
      if (args.update) {
        await copyFile(actualFile, baselineFile);
        console.log("baselined");
        results.push({
          shot: shotName,
          status: "baselined",
          diffPixels: 0,
          diffRatio: 0,
          detail: "",
        });
        continue;
      }
      const result = await compareShot(baselineFile, actualFile, diffFile, viewport);
      console.log(result.status.toUpperCase() + (result.detail ? ` — ${result.detail}` : ""));
      results.push({ shot: shotName, ...result });
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const targets = TARGETS.filter((t) => !args.grep || t.name.includes(args.grep));
  if (targets.length === 0) {
    console.error(`No targets match --grep=${args.grep}`);
    process.exit(2);
  }

  let server = null;
  let baseUrl = args.baseUrl;
  if (!baseUrl) {
    server = await startServer(args.port);
    baseUrl = server.url;
    console.log(`Started production server at ${baseUrl}`);
  } else {
    await waitForServer(baseUrl);
    console.log(`Using running server at ${baseUrl}`);
  }

  await rm(OUTPUT_DIR, { recursive: true, force: true });
  await mkdir(path.join(OUTPUT_DIR, "actual"), { recursive: true });
  await mkdir(path.join(OUTPUT_DIR, "diff"), { recursive: true });
  if (args.update) await mkdir(BASELINE_DIR, { recursive: true });

  const browser = await chromium.launch();
  const results = [];
  const layoutResults = [];
  try {
    // The layout smoke pass runs first: it needs no baselines, and a page that
    // scrolls sideways at a phone width must never be baselined.
    await runLayoutPass(browser, baseUrl, targets, layoutResults);
    if (!args.layoutOnly) {
      await runPixelPass(browser, baseUrl, targets, args, results);
    }
  } finally {
    await browser.close();
    if (server) server.child.kill();
  }

  const layoutFailures = describeLayoutFailures(layoutResults);
  const report = {
    baseUrl,
    update: args.update,
    layoutOnly: args.layoutOnly,
    generatedAt: new Date().toISOString(),
    maxDiffRatio: MAX_DIFF_RATIO,
    phoneWidths: PHONE_WIDTHS,
    results,
    layoutResults,
  };
  await writeFile(path.join(OUTPUT_DIR, "report.json"), `${JSON.stringify(report, null, 2)}\n`);

  // The layout smoke check is reported first: it is what fails a build for a
  // sideways-scrolling page, so it must not be buried under pixel drift.
  console.log(
    `\nViewport smoke: ${layoutResults.length - layoutFailures.length}/${layoutResults.length} ` +
      `page/width combinations fit ${PHONE_WIDTHS.join("/")}px without horizontal scroll.`,
  );
  for (const failure of layoutFailures) console.log(`  FAIL ${failure}`);

  if (args.layoutOnly) {
    if (layoutFailures.length > 0) {
      console.log(`\nReport: ${path.relative(ROOT, OUTPUT_DIR)}/report.json`);
      process.exit(1);
    }
    return;
  }

  const errored = results.filter((r) => r.status === "error");
  if (args.update) {
    if (layoutFailures.length > 0) {
      console.error(
        "\nRefusing to baseline: fix the horizontal scroll above first, then re-run --update.",
      );
      process.exit(1);
    }
    console.log(
      `\nBaselines written to ${path.relative(ROOT, BASELINE_DIR)} (${results.length - errored.length} shots).`,
    );
    console.log("Commit them only if captured on the CI renderer (see the script header).");
    if (errored.length > 0) {
      console.error(
        `\n${errored.length} shot(s) failed to capture — those pages were NOT baselined.`,
      );
      process.exit(1);
    }
    return;
  }

  const bad = results.filter((r) => r.status !== "pass");
  const missing = results.filter((r) => r.status === "missing");
  console.log(
    `\n${results.length - bad.length}/${results.length} shots match the plush baselines.`,
  );
  if (bad.length > 0 || layoutFailures.length > 0) {
    console.log(`Captured images and diffs: ${path.relative(ROOT, OUTPUT_DIR)}/`);
    if (missing.length > 0) {
      console.log(
        "Missing baselines — capture them on the CI renderer: dispatch the " +
          "check workflow with the update-baselines input and commit the " +
          "uploaded artifact, or run --update inside the Playwright Docker image.",
      );
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
