import { test as setup, expect, type Page } from "@playwright/test";

import {
  AUTH_FILE,
  AUTH_FILE_RESUME,
  LEARNER_NAME,
  LEARNER_PASSWORD,
  learnerEmail,
} from "./support/session";

/**
 * Signs the suite's learners up through the real form and saves their sessions.
 *
 * Oyevolve authenticates with a better-auth session cookie, so "logging in" for
 * the suite means holding that cookie. Doing it once here and reusing the saved
 * state everywhere else keeps the specs about the drop path instead of about
 * signing in — and it is the same cookie jar a browser would carry, which is why
 * a spec that runs without it is a real test of the gate.
 */

async function signUp(page: Page): Promise<void> {
  const email = learnerEmail();

  await page.goto("/signup");
  await page.getByLabel("Name").fill(LEARNER_NAME);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(LEARNER_PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();

  // The sign-up form lands on the workspace only once the session exists.
  await expect(page).toHaveURL(/\/courses/);
  await expect(page.getByRole("heading", { name: "Courses", exact: true })).toBeVisible();
}

setup("create learner A and save the session", async ({ page, context }) => {
  await signUp(page);
  await context.storageState({ path: AUTH_FILE });
});

setup("create learner B and save the session", async ({ page, context }) => {
  await signUp(page);
  await context.storageState({ path: AUTH_FILE_RESUME });
});
