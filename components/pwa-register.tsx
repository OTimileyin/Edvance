"use client";

import { useEffect } from "react";

/**
 * Registers the PWA service worker once the app is interactive.
 *
 * Production only: in development the Next dev server serves changing chunks
 * that a cache-first worker would happily pin in place.
 */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Installability is a progressive enhancement; the app works without it.
    });
  }, []);

  return null;
}
