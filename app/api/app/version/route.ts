import { NextResponse } from "next/server";
import { ANDROID_RELEASE } from "@/lib/android-release";

/**
 * The newest Android build, for the app to compare itself against.
 *
 * The Android shell tags its launch URL with its own `versionCode`
 * (`?app=android&v=3`), so the web app can ask this endpoint whether a newer
 * build exists and offer it. Public by design and containing nothing
 * learner-specific: it is a release notice, not user data.
 *
 * Note what this endpoint deliberately does *not* do: it has nothing to say
 * about the site itself. The web app updates the moment it is deployed and the
 * phone is online, because the shell renders the live site rather than a copy
 * bundled inside the APK. Only the shell — icon, name, permissions, target API
 * level — ever needs this comparison.
 */
export async function GET() {
  return NextResponse.json(ANDROID_RELEASE, {
    headers: {
      // Long enough that the check is not a request per page view, short enough
      // that a release reaches a device within minutes of being published.
      "cache-control": "public, max-age=300",
    },
  });
}
