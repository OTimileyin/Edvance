import { NextResponse } from "next/server";
import { ANDROID_PACKAGE_ID } from "@/lib/android-release";

/**
 * Digital Asset Links — the file that lets the Android shell prove it *is*
 * Oyevolve, and so hide the browser's address bar.
 *
 * It is served at `/.well-known/assetlinks.json` (rewritten to this route in
 * `next.config.ts`) because Android fetches that exact path on the exact origin
 * to verify the app against the site. The statement names the app's package id
 * and the SHA-256 fingerprint of the certificate the APK was signed with, so
 * the fingerprint is configuration, not source: it lives in
 * `ANDROID_APP_FINGERPRINT` and is read here.
 *
 * When no fingerprint is configured the answer is an empty list, which is
 * correct rather than broken — the app still runs, as a Custom Tab with browser
 * UI. Inventing or guessing a certificate would be a lie about who signed the
 * build, so it is never done.
 *
 * `ANDROID_APP_FINGERPRINT` may hold several fingerprints, comma-separated, for
 * a build signed by more than one certificate (for example a locally signed
 * test build alongside the released one).
 */
export async function GET() {
  const fingerprints = (process.env.ANDROID_APP_FINGERPRINT ?? "")
    .split(",")
    .map((fingerprint) => fingerprint.trim().toUpperCase())
    .filter((fingerprint) => fingerprint.length > 0);

  const statements =
    fingerprints.length === 0
      ? []
      : [
          {
            relation: ["delegate_permission/common.handle_all_urls"],
            target: {
              namespace: "android_app",
              package_name: ANDROID_PACKAGE_ID,
              sha256_cert_fingerprints: fingerprints,
            },
          },
        ];

  return NextResponse.json(statements, {
    headers: {
      // Android reads this file occasionally, not on every launch. It is safe to
      // cache, but a rotated certificate should not take days to take effect.
      "cache-control": "public, max-age=3600",
    },
  });
}
