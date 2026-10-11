/**
 * Edvance service worker — the second half of installability.
 *
 * Deliberately small and safe for an authenticated app:
 *   - navigations are network-first, so a signed-in learner always gets fresh
 *     HTML; only when the network is gone do they get the offline notice
 *     (public/offline.html) or, for /offline-revision, the precached page of
 *     saved revision lists — which is a deliberate local copy the learner
 *     controls, never a silent cache of app responses;
 *   - immutable build assets (/_next/static/…) and icons are cache-first,
 *     because their URLs carry content hashes;
 *   - /api/* and every non-GET request are never intercepted: no learner data
 *     is ever written to storage.
 */

const CACHE = "edvance-shell-v2";

const SHELL = [
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-512-maskable.png",
];

/**
 * The offline revision page plus the build assets its HTML references, cached
 * best-effort. If this ever fails, installation still succeeds and the page
 * falls back to the offline notice — the assets are found by scanning the
 * served HTML, so no build-time manifest is needed.
 */
async function precacheOfflineRevision(cache) {
  try {
    const response = await fetch("/offline-revision");
    if (!response.ok) return;
    const html = await response.clone().text();
    const assets = [...new Set(html.match(/\/_next\/static\/[^"'\s>]+/g) || [])];
    await cache.put("/offline-revision", response);
    await Promise.allSettled(assets.map((asset) => cache.add(asset)));
  } catch {
    // Best effort only — never block installation.
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL).then(() => precacheOfflineRevision(cache)))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            // Only the shell caches rotate. The learner's saved revision
            // lists (edvance-revision-*) are theirs — kept until they clear
            // them from the offline revision page.
            .filter((key) => key.startsWith("edvance-shell-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Pages: network first; offline, a precached page if we have one (the
  // saved revision lists), else the offline notice.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches
          .match(request)
          .then((page) => page || caches.match("/offline.html"))
          .then((page) => page || Response.error()),
      ),
    );
    return;
  }

  // Hashed build assets and icons: cache first, they can never go stale.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});
