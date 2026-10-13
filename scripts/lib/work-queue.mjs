// Waiting for the background queue, for the suites that used to rely on
// ingestion happening inside the upload request.
//
// V2.2 moved reading a material out of the request and onto `work_job`, so
// "upload returned 201" no longer means "the material has been read". These
// suites assert real chunks and real rows, and they should keep asserting them —
// what they need is to wait for the work rather than to assume it is over.
//
// The wait is driven by the app's own honest signal: `/api/courses/:id` reports
// the course's queue, and its `line` is null exactly when nothing is active,
// retrying or waiting. Polling that beats polling a database table, because it
// is the same thing the learner's page is told.

/**
 * Polls until the course's queue has nothing outstanding, or the timeout passes.
 *
 * Does not throw on timeout: the suite's own assertions are the thing that should
 * report a failure, and they say far more about what went wrong than a timeout
 * from a helper. A timeout is logged so it is never silent.
 *
 * @param {{ fetch: (url: string, init?: object) => Promise<Response> }} session
 * @param {string} courseId
 * @param {{ timeoutMs?: number, intervalMs?: number }} [options]
 * @returns {Promise<{ drained: boolean, state: object | null }>}
 */
export async function waitForQueue(session, courseId, options = {}) {
  const timeoutMs = options.timeoutMs ?? 30_000;
  const intervalMs = options.intervalMs ?? 250;
  const deadline = Date.now() + timeoutMs;
  let state = null;

  for (;;) {
    const response = await session.fetch(`/api/courses/${courseId}`).catch(() => null);
    if (response?.ok) {
      const body = await response.json().catch(() => ({}));
      state = body.course?.queue ?? null;
      // `line` is null when there is nothing left to do — including when the
      // only remaining jobs are terminal failures, which the row itself reports.
      if (state && !state.line) return { drained: true, state };
    }
    if (Date.now() >= deadline) {
      console.log(
        `  ! the work queue for ${courseId} did not drain within ${timeoutMs}ms ` +
          `(last seen: ${JSON.stringify(state)})`,
      );
      return { drained: false, state };
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
