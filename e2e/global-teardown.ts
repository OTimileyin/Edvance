import { readFile } from "node:fs/promises";

import type { FullConfig } from "@playwright/test";

import { AUTH_FILES } from "./support/session";

/**
 * Deletes the throwaway learners after the run.
 *
 * Every spec's workspace is deleted by its own fixture, but the accounts
 * themselves would otherwise accumulate — one per run per learner on a reused
 * database. Deleting them here also proves the cascade the app promises: the
 * account, its courses, its materials, their ingestion jobs, their chunks and
 * their stored objects all go.
 *
 * Best effort by design: a run that already failed should not be masked by a
 * failure to clean up, so a problem here is reported and does not fail the run.
 */
export default async function globalTeardown(config: FullConfig): Promise<void> {
  const baseURL = process.env.E2E_BASE_URL ?? config.projects[0]?.use?.baseURL;
  if (!baseURL) return;

  for (const file of AUTH_FILES) {
    const cookie = await cookiesIn(file);
    if (!cookie) continue;

    try {
      const response = await fetch(`${baseURL}/api/account`, {
        method: "DELETE",
        headers: { cookie },
      });
      console.log(
        response.ok
          ? `e2e: deleted the learner from ${file} and its uploads`
          : `e2e: the learner from ${file} was not deleted (${response.status}); nothing else failed because of it`,
      );
    } catch (error) {
      console.log(
        `e2e: the learner from ${file} was not deleted (${
          error instanceof Error ? error.message : "unknown error"
        }); nothing else failed because of it`,
      );
    }
  }
}

/** The saved cookie header for one session file, or null when it was never written. */
async function cookiesIn(file: string): Promise<string | null> {
  try {
    const state = JSON.parse(await readFile(file, "utf8")) as {
      cookies: { name: string; value: string }[];
    };
    const cookie = state.cookies.map((entry) => `${entry.name}=${entry.value}`).join("; ");
    return cookie || null;
  } catch {
    return null;
  }
}
