"use client";

import { useEffect } from "react";

/**
 * Route-level error boundary. It never shows the raw error (which could contain
 * course contents or a provider message): the learner gets a plain explanation
 * and a way to retry, and the digest is kept for a developer to correlate.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the digest only — never the message or stack.
    console.error(`[ui] route error (digest ${error.digest ?? "none"})`);
  }, [error]);

  return (
    <div className="container page-pad">
      <section className="section">
        <span className="kicker">Something went wrong</span>
        <h1 className="page-title">This screen could not load</h1>
        <p className="page-lede">
          Edvance hit an unexpected error while rendering this page. Your work is unaffected — try
          again, and if it keeps happening, reload the page.
        </p>
        <p style={{ marginTop: 20 }}>
          <button type="button" className="btn btn-primary" onClick={() => reset()}>
            Try again
          </button>
        </p>
        {error.digest && (
          <p className="form-hint" style={{ marginTop: 12 }}>
            Reference: {error.digest}
          </p>
        )}
      </section>
    </div>
  );
}
