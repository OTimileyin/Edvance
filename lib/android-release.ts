import release from "@/android/version.json";

/**
 * What the Android shell is, and which build of it is current.
 *
 * The version is not duplicated here: it is read from `android/version.json`,
 * the same file `android/app/build.gradle` takes `versionCode` and
 * `versionName` from. One file, so the shell that is built and the site that
 * advertises it cannot disagree about what "latest" means.
 *
 * Server-only. The browser never imports this module — it asks
 * `/api/app/version`, which is why none of these values need a
 * `NEXT_PUBLIC_` prefix and none of them leak into a client bundle.
 */

/** The application id declared in `android/app/build.gradle`. */
export const ANDROID_PACKAGE_ID = "app.oyevolve.mobile";

/**
 * `owner/name` of the repository whose Releases host the signed APK. GitHub
 * Releases serve release assets with no bandwidth charge and without an
 * account of their own, which is why the APK lives there rather than in
 * `public/` (a binary in the repository would grow every clone forever).
 *
 * Read per request: `/api/app/version` is a dynamic route (route handlers are
 * not cached by default), so changing this variable needs a restart, not a
 * rebuild.
 */
const RELEASE_REPOSITORY = process.env.ANDROID_RELEASE_REPO ?? "OTimileyin/Oyevolve";

/** The tag and asset name the Android workflow publishes under. */
function assetCoordinates(versionCode: number) {
  return {
    tag: `android-v${versionCode}`,
    asset: `oyevolve-${versionCode}.apk`,
  };
}

/**
 * The direct download URL for a build's APK. It is the URL the update prompt
 * sends a learner to: the browser downloads the file and Android's own
 * installer takes over, so the app never needs the
 * `REQUEST_INSTALL_PACKAGES` permission and never installs anything itself.
 */
export function androidApkUrl(versionCode: number = release.versionCode): string {
  const { tag, asset } = assetCoordinates(versionCode);
  return `https://github.com/${RELEASE_REPOSITORY}/releases/download/${tag}/${asset}`;
}

/** The release page, for someone who would rather read the notes first. */
export function androidReleasePageUrl(versionCode: number = release.versionCode): string {
  const { tag } = assetCoordinates(versionCode);
  return `https://github.com/${RELEASE_REPOSITORY}/releases/tag/${tag}`;
}

/**
 * Every release, for the case where this build's own release is not there yet.
 * In that state the useful link is not the one that 404s but the one that shows
 * what does exist.
 */
export function androidReleasesUrl(): string {
  return `https://github.com/${RELEASE_REPOSITORY}/releases`;
}

/** The current release, as the site publishes it. */
export const ANDROID_RELEASE = {
  platform: "android" as const,
  packageId: ANDROID_PACKAGE_ID,
  versionCode: release.versionCode,
  versionName: release.versionName,
  releasedAt: release.releasedAt,
  apkUrl: androidApkUrl(),
  releasePageUrl: androidReleasePageUrl(),
  releasesUrl: androidReleasesUrl(),
};
