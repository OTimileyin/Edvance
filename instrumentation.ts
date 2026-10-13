/**
 * Next.js calls `register()` once per server instance, before it serves requests.
 * That is where Oyevolve's background worker starts (see
 * `node_modules/next/dist/docs/01-app/02-guides/instrumentation.md`).
 *
 * The hook is used for exactly one thing — starting the loop — and it is written
 * around three facts about how `register()` behaves:
 *
 *   1. **It is called in every runtime.** The worker holds a `pg` pool and a
 *      timer, so it is Node-only; under any other runtime there is nothing to do
 *      and this returns without importing it.
 *   2. **It must finish before the server serves requests.** The worker is not
 *      awaited: `startWorker()` schedules a tick and returns. A startup path that
 *      waited for work would make the app's first request wait for a queue.
 *   3. **A failure here must not take the app down.** If the worker cannot start
 *      (a database that is briefly unreachable, a misconfigured environment),
 *      Oyevolve still serves, still accepts uploads, and still drains the queue
 *      from `after()` in the upload route — degraded, not broken. The error is
 *      logged and swallowed on purpose.
 */

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // `next build` runs this hook too, with build-time placeholder credentials and
  // no database to talk to. Starting a loop there would only produce noise.
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  try {
    const { startWorker } = await import("./lib/jobs/worker");
    startWorker();
  } catch (error) {
    console.error(
      `[jobs] the background worker could not start: ${
        error instanceof Error ? error.message : "unknown error"
      }. Queued work will still run when an upload triggers a drain.`,
    );
  }
}
