import {
  test as base,
  expect,
  request as playwrightRequest,
  type APIRequestContext,
} from "@playwright/test";

import { authStateFile } from "./support/session";

/**
 * What every spec starts from.
 *
 * - `seed` and `api` reach the app's own routes with the learner's session, so
 *   test data is created the way the product creates it and never by touching
 *   the database.
 * - `course` is one throwaway workspace per test, created before and deleted
 *   after, so specs cannot leak state into each other.
 * - `storage` is a read-only window into the object store the app was pointed
 *   at: the suite asserts that bytes really landed there, not merely that the
 *   screen said "Uploaded".
 */

export type StorageObject = { key: string; size: number; contentType: string };

export type StorageProbe = {
  /** False when the suite runs against a server with its own storage provider. */
  available: boolean;
  objects: () => Promise<StorageObject[]>;
  /** Keys matching a course or material id — the app's owner-scoped prefixes. */
  keysContaining: (fragment: string) => Promise<string[]>;
};

type Fixtures = {
  /** The learner's session, for seeding and assertions through the API. */
  seed: APIRequestContext;
  /** The same session as the page's own context, for calls made mid-test. */
  api: APIRequestContext;
  course: { id: string; name: string };
  storage: StorageProbe;
};

// Playwright's own docs call a fixture's second parameter `use`. Here it is
// called `provide`: in a Next.js project ESLint's React rules read a bare
// `use(...)` call as the React hook and demand a disable comment on every
// fixture. The name is not part of the contract — the fixture value is passed as
// the second argument either way.
export const test = base.extend<Fixtures>({
  seed: async ({ baseURL }, provide, testInfo) => {
    // Built from the saved cookie jar rather than the browser context, so a spec
    // that deliberately runs signed out can still seed its own data — and from
    // the jar this project's learner actually owns.
    const context = await playwrightRequest.newContext({
      baseURL,
      storageState: authStateFile(testInfo.project.name),
    });
    await provide(context);
    await context.dispose();
  },

  api: async ({ context }, provide) => {
    await provide(context.request);
  },

  course: async ({ seed }, provide) => {
    const response = await seed.post("/api/courses", {
      data: {
        name: `E2E batch upload ${Date.now().toString(36)}`,
        institution: "Test University",
        lesson: "Evidence",
      },
    });
    if (!response.ok()) {
      throw new Error(`Seeding a course failed (${response.status()}): ${await response.text()}`);
    }
    const { course } = (await response.json()) as { course: { id: string; name: string } };

    await provide(course);

    // Deleting the workspace cascades to its materials and removes the stored
    // objects, so the next run starts clean even on a reused database.
    await seed.delete(`/api/courses/${course.id}`).catch(() => undefined);
  },

  storage: async ({}, provide) => {
    const origin = process.env.E2E_STORAGE_URL ?? "";
    // In the default mode the whole point is that the double is there to be
    // asked. A missing URL would otherwise turn every storage assertion into a
    // silent no-op, so it is an error rather than an empty probe.
    const expectsDouble = !process.env.E2E_BASE_URL && process.env.E2E_STORAGE !== "real";
    if (expectsDouble && !origin) {
      throw new Error("The storage double's URL was not published by playwright.config.ts.");
    }
    const objects = async (): Promise<StorageObject[]> => {
      if (!origin) return [];
      const response = await fetch(`${origin}/__objects`);
      if (!response.ok) throw new Error(`The storage double answered ${response.status}.`);
      return ((await response.json()) as { objects: StorageObject[] }).objects;
    };

    await provide({
      available: Boolean(origin),
      objects,
      keysContaining: async (fragment) =>
        (await objects()).map((object) => object.key).filter((key) => key.includes(fragment)),
    });
  },
});

export { expect };
