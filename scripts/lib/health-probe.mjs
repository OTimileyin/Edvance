// Classifies a `/api/health` probe into the states the deployment watcher cares
// about. Pure — no network — so it is unit-tested directly.
//
//   ready     the app is serving AND reports itself healthy: run the suite.
//   degraded  it is reachable but not healthy (a 5xx, or a 200 that does not
//             report ok) — typically a database that is not wired or not warm.
//             Do NOT run the suite against it; keep waiting and keep telling the
//             operator, because a fresh deployment often passes through this.
//   pending   nothing is serving here yet (no response, or a 404 such as
//             Vercel's DEPLOYMENT_NOT_FOUND before a production deployment
//             exists).

/**
 * @param {number | null} status HTTP status, or null when the request failed.
 * @param {{ status?: string, database?: string } | null} body Parsed JSON body, if any.
 * @returns {"ready" | "degraded" | "pending"}
 */
export function classifyProbe(status, body) {
  if (status === 200) {
    return body?.status === "ok" && body?.database === "ok" ? "ready" : "degraded";
  }
  if (typeof status === "number" && status >= 500) return "degraded";
  // No response, a 404, or any other 4xx: nothing healthy is serving here yet.
  return "pending";
}
