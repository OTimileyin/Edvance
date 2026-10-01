import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The text-extraction parsers are server-only Node libraries. Keeping them
  // external means Next serves them straight from node_modules instead of
  // bundling their worker/wasm assets into the server build.
  serverExternalPackages: ["pdfjs-dist", "mammoth", "jszip"],
};

export default nextConfig;
