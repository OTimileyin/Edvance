"use client";

import { useEffect, useState } from "react";

/**
 * Identifies the launch and carries the installed build's `versionCode`.
 * Written by `LauncherActivity` in the Android project, not by this code.
 */
const BUILD_KEY = "oyevolve.android.build";

/** The published `versionCode` the learner has already waved away. */
const DISMISSED_KEY = "oyevolve.android.update-dismissed";

interface PublishedRelease {
  versionCode: number;
  versionName: string;
  apkUrl: string;
}

/** A positive integer, or null for anything else. */
function parseBuild(value: string | null): number | null {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * "A newer version of the Oyevolve app is available."
 *
 * Two facts have to meet before this can say anything: which build of the
 * Android shell is installed, and which build is current.
 *
 * The first comes from the shell itself. `LauncherActivity` appends
 * `?app=android&v=<versionCode>` to the URL it opens, so a cold start carries
 * the installed APK's own build number — the app speaking about itself, rather
 * than a constant that could drift from what shipped. It is remembered in
 * `localStorage` because a reload or a deep link inside the app does not
 * re-send it.
 *
 * The second comes from `/api/app/version`.
 *
 * Nothing renders outside the Android shell, since an ordinary browser tab has
 * no build marker. Nothing renders during the server render either, so the
 * server and client markup agree and there is no hydration mismatch.
 *
 * What this deliberately does not do: install anything. "Update now" follows a
 * link to the signed APK and the browser downloads it; Android's own installer
 * applies it, over the existing app, because the package id and signing key
 * match. That is why the shell needs no `REQUEST_INSTALL_PACKAGES` permission
 * and never installs a package silently.
 */
export function AppUpdateBanner() {
  const [published, setPublished] = useState<PublishedRelease | null>(null);
  const [installed, setInstalled] = useState<number | null>(null);

  useEffect(() => {
    let installedBuild: number | null = null;
    let dismissedFor: number | null = null;

    try {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = parseBuild(params.get("v"));

      if (params.get("app") === "android" && fromUrl !== null) {
        installedBuild = fromUrl;
        window.localStorage.setItem(BUILD_KEY, String(fromUrl));
      } else {
        installedBuild = parseBuild(window.localStorage.getItem(BUILD_KEY));
      }

      dismissedFor = parseBuild(window.localStorage.getItem(DISMISSED_KEY));
    } catch {
      // Storage is unavailable (private mode, a blocked origin). Without a
      // remembered build there is nothing to compare against, and the banner
      // simply never appears — the app itself is unaffected.
      return;
    }

    if (installedBuild === null) return;

    let cancelled = false;
    fetch("/api/app/version")
      .then((response) => (response.ok ? response.json() : null))
      .then((release: PublishedRelease | null) => {
        if (cancelled || release === null) return;
        if (release.versionCode <= installedBuild) return;
        if (dismissedFor !== null && dismissedFor >= release.versionCode) return;
        setInstalled(installedBuild);
        setPublished(release);
      })
      .catch(() => {
        // Offline, or the endpoint did not answer. An update *check* failing is
        // not something to bother anybody about — the app is already working.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function dismiss() {
    if (published) {
      try {
        window.localStorage.setItem(DISMISSED_KEY, String(published.versionCode));
      } catch {
        // Dismissal is a convenience; if it cannot be remembered, the notice
        // reappears on the next launch rather than the app breaking.
      }
    }
    setPublished(null);
  }

  if (published === null || installed === null) return null;

  return (
    <div className="container" style={{ paddingTop: "var(--space-5)" }}>
      <div className="alert alert-warning" role="status">
        <p className="alert-title">A newer version of the Oyevolve app is available</p>
        <p>
          You are running app build <strong>{installed}</strong>; the current one is{" "}
          <strong>{published.versionName}</strong> (build {published.versionCode}). Your courses and
          sign-in are unaffected — this replaces the Android app itself, not your work.
        </p>
        <p
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            marginTop: "var(--space-3)",
          }}
        >
          <a className="btn btn-secondary btn-sm" href={published.apkUrl}>
            Update now
          </a>
          <button
            type="button"
            className="icon-btn icon-btn--quiet"
            onClick={dismiss}
            aria-label="Dismiss this update notice"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path d="M6 6l12 12" />
              <path d="M18 6L6 18" />
            </svg>
          </button>
        </p>
      </div>
    </div>
  );
}
