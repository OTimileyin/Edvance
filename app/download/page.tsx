import type { Metadata } from "next";
import { ANDROID_RELEASE } from "@/lib/android-release";
import { InstallButton } from "@/components/install-button";

/**
 * Where a learner goes to get the Android app.
 *
 * Every value on this page — the build number, the release date, the download
 * URL — comes from `lib/android-release.ts`, which is the same module
 * `/api/app/version` answers from and the same one the in-app update notice
 * compares itself against. That is deliberate rather than convenient: there is
 * one reading of `android/version.json` behind both, so this page cannot
 * advertise a build the update check would not offer, or a URL the app would
 * not use.
 *
 * Rendered on the server, so the version, the date and the links are in the
 * HTML with no JavaScript involved — a page about installing software is a bad
 * place to need a second download to read.
 *
 * It describes the app honestly and specifically: what installing it does,
 * what it asks for, and what it does not do. The app itself is described in
 * `docs/ANDROID_APP_RUNBOOK.md`.
 */

/** "2026-10-13" → "13 October 2026". UTC, so every renderer prints one answer. */
const releaseDateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function formatReleaseDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return releaseDateFormat.format(date);
}

export const metadata: Metadata = {
  title: "Get the Android app — Oyevolve",
  description:
    "Download the signed Oyevolve app for Android 7.0 and later, and sign in with the same account you use on the web.",
};

export default function DownloadPage() {
  return (
    <div className="container page-pad">
      <section className="section">
        <span className="kicker">Android app</span>
        <h1 className="page-title">Get Oyevolve on your phone</h1>
        <p className="page-lede">
          The Android app opens this same workspace in your phone&rsquo;s own browser engine, with
          its own icon on the home screen. One account and one set of courses: your materials stay
          on the server and nothing is copied onto the phone.
        </p>
      </section>

      <section className="section" aria-labelledby="build-heading">
        <h2 className="section-heading" id="build-heading">
          Current build
        </h2>
        <div className="alert alert-neutral">
          <p className="alert-title">
            Oyevolve {ANDROID_RELEASE.versionName} — build {ANDROID_RELEASE.versionCode}
          </p>
          <p>
            Released {formatReleaseDate(ANDROID_RELEASE.releasedAt)} · Android 7.0 or newer · the
            same app for every phone, no variants to choose between
          </p>
        </div>
        <div className="field-row" style={{ marginTop: "var(--space-4)" }}>
          <a className="btn btn-primary" href={ANDROID_RELEASE.apkUrl}>
            Download the APK
          </a>
          <a className="btn btn-secondary" href={ANDROID_RELEASE.releasePageUrl}>
            Read the release notes
          </a>
        </div>
        <p className="form-hint" style={{ marginTop: "var(--space-3)" }}>
          Every build is signed with the same key, which is what lets a newer APK install over the
          app you already have — keeping its data and your signed-in session — instead of sitting
          beside it as a second copy.
        </p>
      </section>

      <section className="section" aria-labelledby="install-heading">
        <h2 className="section-heading" id="install-heading">
          Installing it
        </h2>
        <ol className="step-chips">
          <li>Download the APK with the button above.</li>
          <li>Open it from your download notification, or from Files &rsaquo; Downloads.</li>
          <li>
            Android will say the file did not come from Google Play and ask you to allow installs
            from this source. That prompt is expected for a direct download; allow it, then
            continue.
          </li>
          <li>Open Oyevolve and sign in with the same email and password you use here.</li>
        </ol>
        <div className="alert alert-neutral" style={{ marginTop: "var(--space-5)" }}>
          <p>
            <strong>Oyevolve is not on Google Play.</strong> The app is published as a release of
            this project and installed directly. Android will tell you as much when you install it,
            and it is right — so it is worth saying here rather than letting the prompt be a
            surprise.
          </p>
        </div>
      </section>

      <section className="section" aria-labelledby="shell-heading">
        <h2 className="section-heading" id="shell-heading">
          What the app actually is
        </h2>
        <p>
          It is a shell, not a second copy of Oyevolve. The app opens the live site, so a change to
          the web app reaches your phone the moment it is deployed — there is nothing to update for
          that. Only the shell is a versioned, signed download: the icon, the name, the permissions,
          and the Android version it targets.
        </p>
        <p style={{ marginTop: 16 }}>
          That is also why the app can tell you when it is out of date. At launch it reports its own
          build number, compares it against the current one, and offers the download above when a
          newer build exists. It never installs anything by itself: Android&rsquo;s own installer
          does that, after you agree to it.
        </p>
      </section>

      <section className="section" aria-labelledby="permissions-heading">
        <h2 className="section-heading" id="permissions-heading">
          What it asks for
        </h2>
        <ul>
          <li>
            <strong>Internet access, and nothing else.</strong> No storage permission, no contacts,
            no location, and no background service.
          </li>
          <li>
            <strong>No separate account.</strong> The app signs in to this site, so the courses,
            materials and practice records it shows are the ones you already have.
          </li>
        </ul>
        <p style={{ marginTop: 16 }}>
          Which means deleting your account removes it for the app too. There is only one account,
          and only one place your work is stored.
        </p>
      </section>

      <section className="section" aria-labelledby="webapp-heading">
        <h2 className="section-heading" id="webapp-heading">
          Or install it without an APK
        </h2>
        <p>
          You do not have to install an APK to use Oyevolve on a phone. The site installs as a web
          app from your browser&rsquo;s own menu: the same workspace, updating the moment the site
          does, with one fewer step in between. Where your browser offers it, the button below does
          that.
        </p>
        <div className="field-row" style={{ marginTop: "var(--space-4)" }}>
          <InstallButton />
        </div>
      </section>

      <section className="section" aria-labelledby="addressbar-heading">
        <h2 className="section-heading" id="addressbar-heading">
          If the app opens with a browser address bar
        </h2>
        <p>
          The app is meant to open full-screen, without browser controls. That requires this
          deployment to publish the fingerprint of the certificate the APK was signed with, at
          /.well-known/assetlinks.json on this origin. Where that has not been configured, the app
          still works — it opens as a plain browser view inside the app, address bar and all. The
          fix is a deployment setting, not a reinstall.
        </p>
      </section>
    </div>
  );
}
