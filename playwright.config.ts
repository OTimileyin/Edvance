import { defineConfig, devices } from "@playwright/test";

import { AUTH_FILE, AUTH_FILE_RESUME } from "./e2e/support/session";

/**
 * End-to-end suite: the batch-upload drop path, in a real browser, against the
 * real app.
 *
 * `npm run build && npm run test:e2e` starts two servers itself — the app and a
 * local object-storage double (see `e2e/support/storage-stub.mjs`) — then runs
 * `e2e/*.spec.ts` in Chromium. Auth is better-auth cookies, so `auth.setup.ts`
 * signs two throwaway learners up through the UI and saves their cookie jars;
 * every spec reuses one through `storageState` instead of signing in again. Two
 * learners, because the resume specs upload their own batch and the upload route
 * has a per-learner burst guard.
 *
 * Environment:
 *   DATABASE_URL        the database to run against (defaults to a local one)
 *   E2E_BASE_URL        an already-running origin; no server is started and the
 *                       storage double is not used
 *   E2E_DEV=1           start `next dev` instead of `next start`
 *   E2E_STORAGE=real    point the app at the real Supabase Storage instead of
 *                       the double; needs SUPABASE_* in the environment
 *   E2E_PORT            the app's port (default 3400)
 *   E2E_STORAGE_DELAY_MS  how long the double takes per upload (default 800)
 *
 * Nothing here weakens the app for the sake of a test: the suite drives the same
 * routes, the same rules and the same code a learner does.
 */

const PORT = Number(process.env.E2E_PORT ?? 3400);
const STORAGE_PORT = Number(process.env.E2E_STORAGE_PORT ?? 3410);
const BASE_URL = (process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`).replace(/\/$/, "");
const STORAGE_URL = `http://127.0.0.1:${STORAGE_PORT}`;
const EXTERNAL_SERVER = Boolean(process.env.E2E_BASE_URL);
const REAL_STORAGE = process.env.E2E_STORAGE === "real";

// Published to the test process so a spec can look inside the storage double
// (and stay honest about it: empty string means "there is no double to look in").
process.env.E2E_STORAGE_URL = REAL_STORAGE || EXTERNAL_SERVER ? "" : STORAGE_URL;

/**
 * The app's storage configuration. Unless the real provider was asked for, the
 * three names point at the double, which is what lets an upload be proved end to
 * end on any machine and in CI.
 */
const storageEnv: Record<string, string> = REAL_STORAGE
  ? {}
  : {
      SUPABASE_URL: STORAGE_URL,
      SUPABASE_SECRET_KEY: "e2e-storage-double-key",
      SUPABASE_STORAGE_BUCKET: "edvance-e2e",
    };

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  // Deliberately narrow. The suite shares one learner, and the upload route has a
  // 20-per-minute burst guard per learner (RATE_LIMITS.upload): the specs upload
  // roughly fifteen files in total, so letting a wide fan-out of workers (and of
  // CI retries) run at once is what would trip it.
  workers: process.env.CI ? 1 : 2,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // The HTML report is what CI uploads as an artifact when a spec fails.
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },
  projects: [
    // Runs first and leaves a signed-in cookie jar for every other project.
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      testMatch: /.*\.spec\.ts/,
      testIgnore: /resume/,
      use: { ...devices["Desktop Chrome"], storageState: AUTH_FILE },
      dependencies: ["setup"],
    },
    // The specs that abandon a batch and come back to it carry their own
    // learner, so their uploads cannot eat the first learner's burst budget.
    //
    // They wait on background reading, and one spec waits on two reads: a per-
    // test budget of 60s would contradict `READ_TIMEOUT_MS`, turning a slow but
    // healthy queue into a timeout that says nothing about what went wrong.
    {
      name: "chromium-resume",
      testMatch: /resume.*\.spec\.ts/,
      timeout: 150_000,
      use: { ...devices["Desktop Chrome"], storageState: AUTH_FILE_RESUME },
      dependencies: ["setup"],
    },
  ],
  // Deletes the throwaway learner and everything it uploaded, so a run leaves
  // the database as it found it.
  globalTeardown: "./e2e/global-teardown.ts",
  webServer: EXTERNAL_SERVER
    ? undefined
    : [
        {
          command: "node e2e/support/storage-stub.mjs",
          url: `${STORAGE_URL}/__health`,
          reuseExistingServer: !process.env.CI,
          timeout: 30_000,
          // Saw the double's own lines in the test output. A refused upload is
          // what half these specs turn on, and "did the refusal actually fire"
          // is otherwise unanswerable from a red run.
          stdout: "pipe",
          stderr: "pipe",
          env: {
            E2E_STORAGE_PORT: String(STORAGE_PORT),
            // Slow enough that a reload or a tab switch can land while a batch
            // is in flight — the window the resume specs exist to cover — and
            // fast enough to keep the suite quick.
            E2E_STORAGE_DELAY_MS: process.env.E2E_STORAGE_DELAY_MS ?? "800",
          },
        },
        {
          command: process.env.E2E_DEV ? `npx next dev -p ${PORT}` : `npx next start -p ${PORT}`,
          // A database that is up and a build that boots: /api/health answers
          // 503 until the first is true.
          url: `${BASE_URL}/api/health`,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          // The server's own trail belongs in the test output. A queued reading
          // that never happens is a worker problem, and without this the only
          // evidence of it is a badge on a page nobody can inspect afterwards.
          stdout: "pipe",
          stderr: "pipe",
          env: {
            DATABASE_URL:
              process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:5432/edvance",
            BETTER_AUTH_SECRET:
              process.env.BETTER_AUTH_SECRET ?? "e2e-local-secret-not-for-runtime-use",
            // The origin the browser actually uses; better-auth checks it.
            BETTER_AUTH_URL: BASE_URL,
            NEXT_TELEMETRY_DISABLED: "1",
            ...storageEnv,
          },
        },
      ],
});
