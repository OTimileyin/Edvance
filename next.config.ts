import type { NextConfig } from "next";

/**
 * Security headers.
 *
 * The Content-Security-Policy is deliberately strict — no third-party scripts,
 * no framing, no object embeds — and the only relaxation is in development,
 * where Next's dev tooling needs `unsafe-eval` and a websocket connection. In
 * production the policy admits nothing the app does not need. Fonts are
 * self-hosted by `next/font`, so `font-src` never needs an external origin.
 */
const isDev = process.env.NODE_ENV !== "production";

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  // Only meaningful over HTTPS; harmless (and ignored) over plain HTTP locally.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // The text-extraction parsers are server-only Node libraries. Keeping them
  // external means Next serves them straight from node_modules instead of
  // bundling their worker/wasm assets into the server build.
  serverExternalPackages: ["pdfjs-dist", "mammoth", "jszip"],
  // Do not advertise the framework in responses.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
