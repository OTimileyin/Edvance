"use client";

import { useEffect, useState } from "react";

/**
 * The event Chrome/Edge/Android fire before offering installation.
 * TypeScript's DOM lib does not ship this type yet.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * "Install Oyevolve" — a real install action, never a fake one.
 *
 * The button renders only after the browser fires `beforeinstallprompt`, so it
 * is invisible where installation is not offered (including iOS Safari) and
 * once the app is installed. Clicking it runs the browser's own install flow;
 * whether the learner accepts or dismisses it, the prompt is spent and the
 * action retires until the browser offers installation again.
 */
export function InstallButton() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  // Resolved at first render: running inside the installed app means the
  // action is never offered. (Both render outputs are null, so the server and
  // the client agree and there is no hydration mismatch.)
  const [installed, setInstalled] = useState(() => {
    if (typeof window === "undefined") return false;
    return !window.matchMedia("(display-mode: browser)").matches;
  });

  useEffect(() => {
    if (installed) return;

    const handleBeforeInstall = (event: Event) => {
      // Keep the browser's mini-infobar from appearing; our button is the UI.
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, [installed]);

  async function handleInstall() {
    if (!promptEvent) return;
    const event = promptEvent;
    // The prompt is spent either way — retire the action immediately.
    setPromptEvent(null);
    try {
      await event.prompt();
      await event.userChoice;
    } catch {
      // The browser refused (e.g. the prompt expired). The app is unaffected;
      // installation remains available from the browser's own UI.
    }
  }

  if (installed || !promptEvent) return null;

  return (
    <button type="button" className="btn btn-secondary" onClick={handleInstall}>
      Install Oyevolve
    </button>
  );
}
