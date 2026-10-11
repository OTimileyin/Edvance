/**
 * Edvance service worker — the second half of installability.
 *
 * Deliberately small and safe for an authenticated app:
 *   - navigations are network-first, so a signed-in learner always gets fresh
 *     HTML; only when the network is gone do they get the offline notice
 *     (public/offline.html) — cached pages are never served for app routes,
 *     because stale learner data is worse than an honest offline message;
 *   - immutable build assets (/_next/static/…) and icons are cache-first,
 *     because their URLs carry content hashes;
 *   - /api/* and every non-GET request are never intercepted: no learner data
 *     is ever written to storage.
 */

const CACHE = "edvance-shell-v1";

const SHELL = [
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-512-maskable.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
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

  // Pages: network first, offline notice as the fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match("/offline.html").then((page) => page || Response.error()),
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
