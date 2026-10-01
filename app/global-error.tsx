"use client";

/**
 * The outermost error boundary, used when the root layout itself fails. It must
 * render its own <html> and <body>, and like the route boundary it never shows
 * the raw error.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          margin: 0,
          padding: "64px 24px",
          background: "#FBF6EA",
          color: "#23201A",
        }}
      >
        <main style={{ maxWidth: 640, margin: "0 auto" }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#C9502E",
            }}
          >
            Edvance
          </p>
          <h1 style={{ fontSize: 32, margin: "8px 0 12px" }}>The app could not start</h1>
          <p style={{ color: "#5A5344", lineHeight: 1.6 }}>
            An unexpected error stopped Edvance from loading. Your data is stored separately and is
            unaffected.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: 20,
              padding: "12px 24px",
              borderRadius: 999,
              border: "none",
              background: "#22545A",
              color: "#FDFBF5",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error.digest && (
            <p style={{ marginTop: 12, fontSize: 14, color: "#756D5B" }}>
              Reference: {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
