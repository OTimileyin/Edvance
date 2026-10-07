// Edvance — watch a deployment until it is healthy, then run the remote suite.
//
// Polls `<url>/api/health` until the app reports ready (HTTP 200 with
// `status: "ok"` and `database: "ok"`), then runs
// `scripts/verify-remote-deployment.mjs` against the same URL, forwarding its
// exit code. A deployment that is reachable but not healthy (a 5xx, or a 200 that
// reports degraded) does NOT trigger the suite — it is reported and the watch
// continues, so a database that is still coming up never causes a false run.
//
// Usage:
//   npm run watch:deploy -- https://your-app.vercel.app
//   npm run watch:deploy -- https://your-app.vercel.app --diff https://white-whale.spcf.app
//   npm run watch:deploy -- https://your-app.vercel.app --timeout 1800 --interval 10
//   npm run watch:deploy -- https://your-app.vercel.app --no-suite
//
// Flags: --timeout <seconds> (default 900), --interval <seconds> (default 15),
//        --diff <baseline-url> (run the two-deployment diff instead of one),
//        --no-suite (stop once healthy, without running anything).
//
// Exit codes: 0 healthy and the suite passed, 1 timed out or the suite failed,
//             2 bad arguments.

import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { classifyProbe } from "./lib/health-probe.mjs";

const here = dirname(fileURLToPath(import.meta.url));

function fail(message) {
  console.error(`watch-deployment: ${message}`);
  process.exit(2);
}

function normalizeUrl(url) {
  return url.replace(/\/+$/, "");
}

// --- arguments -------------------------------------------------------------
const argv = process.argv.slice(2);
const flags = new Map();
const positional = [];
for (let index = 0; index < argv.length; index += 1) {
  const arg = argv[index];
  if (arg === "--no-suite") {
    flags.set("noSuite", true);
    continue;
  }
  if (arg.startsWith("--")) {
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) fail(`--${arg.slice(2)} needs a value`);
    flags.set(arg.slice(2), value);
    index += 1;
    continue;
  }
  positional.push(arg);
}

const target = positional[0] ?? process.env.BASE_URL;
if (!target)
  fail("give a deployment URL, e.g. npm run watch:deploy -- https://your-app.vercel.app");
if (!/^https?:\/\//.test(target)) fail(`expected an http(s) URL, got "${target}"`);
const baseUrl = normalizeUrl(target);

const baseline = flags.get("diff");
if (baseline !== undefined && !/^https?:\/\//.test(baseline)) {
  fail(`--diff expects an http(s) URL, got "${baseline}"`);
}

const timeoutSeconds = Number(flags.get("timeout") ?? 900);
const intervalSeconds = Number(flags.get("interval") ?? 15);
if (!Number.isFinite(timeoutSeconds) || timeoutSeconds <= 0)
  fail("--timeout must be a positive number of seconds");
if (!Number.isFinite(intervalSeconds) || intervalSeconds <= 0)
  fail("--interval must be a positive number of seconds");

// --- polling ---------------------------------------------------------------
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function probe(url) {
  try {
    const response = await fetch(`${url}/api/health`, { redirect: "manual" });
    const body = await response.json().catch(() => null);
    return { status: response.status, body };
  } catch {
    return { status: null, body: null };
  }
}

function describe({ status, body }) {
  if (status === null) return "no response";
  return `HTTP ${status} status=${body?.status ?? "?"} database=${body?.database ?? "?"}`;
}

function runNode(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { stdio: "inherit" });
    child.on("close", (code) => resolve(code ?? 1));
    child.on("error", () => resolve(1));
  });
}

async function main() {
  console.log(
    `Watching ${baseUrl}/api/health every ${intervalSeconds}s (timeout ${timeoutSeconds}s)\n`,
  );
  const deadline = Date.now() + timeoutSeconds * 1000;

  let ready = false;
  for (;;) {
    const result = await probe(baseUrl);
    const state = classifyProbe(result.status, result.body);
    const stamp = new Date().toISOString().slice(11, 19);

    // One line per probe, so a long wait is visibly alive rather than a hang.
    console.log(`[${stamp}] ${state} — ${describe(result)}`);

    if (state === "ready") {
      ready = true;
      break;
    }
    if (Date.now() >= deadline) break;
    await sleep(intervalSeconds * 1000);
  }

  if (!ready) {
    const result = await probe(baseUrl);
    console.error(
      `\nwatch-deployment: ${baseUrl} was not healthy within ${timeoutSeconds}s (last: ${classifyProbe(result.status, result.body)}, ${describe(result)}).`,
    );
    process.exit(1);
  }

  console.log(`\n${baseUrl} is healthy.`);
  if (flags.get("noSuite")) return;

  const suite = join(here, "verify-remote-deployment.mjs");
  const args = baseline ? [suite, "--diff", normalizeUrl(baseline), baseUrl] : [suite, baseUrl];
  console.log(`Running the remote suite${baseline ? " as a two-deployment diff" : ""}...\n`);
  process.exitCode = await runNode(args);
}

main().catch((error) => {
  console.error("watch-deployment crashed:", error);
  process.exit(1);
});
