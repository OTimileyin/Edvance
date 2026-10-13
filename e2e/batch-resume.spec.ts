import { type APIRequestContext, type Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import { SourcesPage } from "./pages/sources-page";
import { slowBatch } from "./support/files";

/**
 * A batch outliving the page it started on.
 *
 * These specs abandon a batch mid-upload — by reloading, and by navigating
 * through the workspace's own links — and check what a learner is entitled to:
 * the files that never started are sent without being asked again, the files
 * whose request had begun are never quietly resent, and the workspace is never
 * told something arrived that did not.
 *
 * They run against the same real app and the same storage double as the upload
 * specs; the double is simply slow (see `E2E_STORAGE_DELAY_MS`), which is what
 * makes the window these specs cover something a test can stand in.
 *
 * One thing worth stating plainly, because it is easy to assume the opposite:
 * leaving a page abandons the *browser's* interest in a request, not the
 * server's work on it. Requests already in flight still finish, so an
 * interrupted file usually does arrive. That is exactly why it is never resent
 * on its own — Oyevolve cannot tell, and guessing in either direction would
 * either duplicate a learner's material or silently drop it.
 */

/** The queue's own cache, read back from the page: what a reload would find. */
const QUEUE_CACHE = "oyevolve-uploads-v1";
const MANIFEST_PREFIX = "/queued-uploads/";

async function queuedFiles(page: Page): Promise<number> {
  return page.evaluate(
    async ({ cacheName, prefix }) => {
      const cache = await caches.open(cacheName);
      const manifest = (await cache.keys()).find((request) =>
        new URL(request.url).pathname.startsWith(prefix),
      );
      if (!manifest) return 0;
      const response = await cache.match(manifest);
      if (!response) return 0;
      const records = (await response.json()) as unknown;
      return Array.isArray(records) ? records.length : 0;
    },
    { cacheName: QUEUE_CACHE, prefix: MANIFEST_PREFIX },
  );
}

/**
 * Makes the next upload of one file not arrive at the object store. The refusal
 * is spent by the first attempt and lands well after the page has gone, so the
 * file's fate is genuinely unknown to the browser — the state the honest
 * "interrupted" row exists for.
 */
async function refuseUpload(name: string): Promise<void> {
  const origin = process.env.E2E_STORAGE_URL ?? "";
  const response = await fetch(`${origin}/__reject?key=${encodeURIComponent(name)}`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`The storage double refused the refusal request (${response.status}).`);
  }
}

test("a reload mid-batch keeps the files that had not started, and asks about the rest", async ({
  course,
  page,
  api,
  storage,
}) => {
  test.skip(!storage.available, "this run has no storage double to inspect");

  const sources = new SourcesPage(page);
  await sources.goto(course.id);

  // Five files, three at a time: the last two cannot have started.
  await sources.drop(slowBatch("slow", 5));
  await expect(sources.batchRows).toHaveCount(5);
  await expect(sources.batchRow("slow-1.md")).toContainText("Uploading");
  await expect(sources.batchRow("slow-4.md")).toContainText("Waiting");
  await expect(sources.batchRow("slow-5.md")).toContainText("Waiting");

  await page.reload();

  // The two that never started are simply sent again — nothing was ever sent, so
  // nothing can arrive twice — and the learner is told that is what happened.
  await expect(page.getByText(/2 files were still waiting when you left/)).toBeVisible();
  await expect(sources.batchRow("slow-4.md")).toContainText("Uploaded");
  await expect(sources.batchRow("slow-5.md")).toContainText("Uploaded");
  await sources.waitRead("slow-4");
  await sources.waitRead("slow-5");

  // The three that were mid-flight are labelled instead of resent: Oyevolve
  // cannot know whether they arrived, so it says so and leaves the decision.
  await expect(page.getByText(/3 were interrupted mid-upload/)).toBeVisible();
  for (const name of ["slow-1.md", "slow-2.md", "slow-3.md"]) {
    await expect(sources.batchRow(name)).toContainText("Interrupted");
    await expect(sources.batchRow(name)).toContainText("may not have arrived");
    await expect(sources.batchRow(name).getByRole("button", { name: "Retry" })).toBeVisible();
  }

  // What the workspace shows must equal what Oyevolve actually holds: no row
  // invented, none hidden, and — the real risk — no file stored twice, because
  // nothing interrupted was resent by itself.
  //
  // How many of the three interrupted uploads *did* arrive is deliberately not
  // asserted. Abandoning a request abandons the browser's interest in it, and the
  // server usually finishes the work anyway — but that is a race, not a promise:
  // a request cancelled early enough stores nothing, as this very row reports.
  // Pinning the count would be asserting the race instead of the guarantee.
  const held = await heldTitles(api, course.id);
  await expect(sources.sources).toHaveCount(held.length);
  for (const title of ["slow-1", "slow-2", "slow-3", "slow-4", "slow-5"]) {
    await expect(sources.source(title)).toHaveCount(held.includes(title) ? 1 : 0);
  }
  // Whatever happened, the two files that never started are among them.
  expect(held).toEqual(expect.arrayContaining(["slow-4", "slow-5"]));
});

test("leaving the workspace mid-batch keeps the files that had not started", async ({
  course,
  page,
  api,
  storage,
}) => {
  test.skip(!storage.available, "this run has no storage double to inspect");

  const sources = new SourcesPage(page);
  await sources.goto(course.id);
  await sources.drop(slowBatch("slow", 5));
  await expect(sources.batchRow("slow-5.md")).toContainText("Waiting");

  // Leave through the workspace's own navigation. The requests already in flight
  // are not cancelled by a tab switch; the files that had not started cannot be
  // sent by a page that is no longer there.
  await page.getByRole("link", { name: "Intelligence" }).click();
  await expect(page).toHaveURL(new RegExp(`/courses/${course.id}/intelligence`));

  // The three that were in flight finish while their page is gone.
  await expect
    .poll(async () => {
      const response = await api.get(`/api/courses/${course.id}`);
      const body = (await response.json()) as {
        course: { sources: { storageReference: string | null }[] };
      };
      return body.course.sources.filter((source) => source.storageReference).length;
    })
    .toBe(3);

  // Those three are finished with, so they are not waiting to be resumed — which
  // is what stops the two survivors from becoming an interrupted-alert.
  await expect.poll(() => queuedFiles(page)).toBe(2);

  await sources.goto(course.id);
  await expect(page.getByText(/2 files were still waiting when you left/)).toBeVisible();
  await expect(sources.batchRow("slow-4.md")).toContainText("Uploaded");
  await expect(sources.batchRow("slow-5.md")).toContainText("Uploaded");
  await expect(sources.sources).toHaveCount(5);
  await sources.waitRead("slow-1");
});

/**
 * The materials Oyevolve actually holds for a course, in its own order.
 *
 * A reload abandons the browser's interest in the uploads that were in flight,
 * and whether the server finished them is a race rather than a promise — so a
 * spec must compare the screen against this, never against a hoped-for count.
 *
 * A read that does not look like the course the screen is drawn from fails here,
 * naming the response, because the alternative is worse than a red test: an empty
 * or missing list would read as "Oyevolve holds nothing", and the arithmetic below
 * would blame the upload for it.
 */
async function heldTitles(api: APIRequestContext, courseId: string): Promise<string[]> {
  const response = await api.get(`/api/courses/${courseId}`);
  const body = (await response.json().catch(() => undefined)) as
    { course?: { sources?: { title: string; storageReference: string | null }[] } } | undefined;
  const sources = body?.course?.sources;
  if (!response.ok() || !Array.isArray(sources)) {
    throw new Error(
      `Reading the course back failed (${response.status()}): ${JSON.stringify(body)?.slice(0, 300)}`,
    );
  }
  return sources.filter((source) => source.storageReference).map((source) => source.title);
}

/**
 * The same list, once it has stopped changing.
 *
 * The retry spec asserts a *delta*, so it needs a baseline that is a settled
 * picture rather than a photograph of a list that is still growing — or of a read
 * that came back short. Two consecutive identical reads is the cheapest honest
 * definition of "stopped changing", and the deadline turns a real disagreement
 * into a failure instead of a wait.
 */
async function settledTitles(
  api: APIRequestContext,
  courseId: string,
  atLeast: number,
): Promise<string[]> {
  const deadline = Date.now() + 15_000;
  let previous = "";
  for (;;) {
    const current = await heldTitles(api, courseId);
    const fingerprint = [...current].sort().join("\n");
    if (current.length >= atLeast && fingerprint === previous) return current;
    previous = fingerprint;
    if (Date.now() > deadline) {
      throw new Error(
        `Oyevolve held ${current.length} material(s) for this course and the list never settled at ${atLeast}: ${current.join(", ")}`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

test("an interrupted file that really did not arrive comes back fixable", async ({
  course,
  page,
  api,
  storage,
}) => {
  test.skip(!storage.available, "this run has no storage double to inspect");

  const sources = new SourcesPage(page);
  await sources.goto(course.id);

  // One of the three in-flight uploads genuinely never arrives. The other two
  // still do, so the batch comes back holding both kinds of interrupted file.
  await refuseUpload("slow-3.md");

  await sources.drop(slowBatch("slow", 5));
  await expect(sources.batchRow("slow-3.md")).toContainText("Uploading");
  await expect(sources.batchRow("slow-4.md")).toContainText("Waiting");

  await page.reload();

  await expect(page.getByText(/3 were interrupted mid-upload/)).toBeVisible();

  // The file Oyevolve refused to store is absent — that much is certain, because
  // its bytes never reached the object store — and its row says only what
  // Oyevolve knows: that it may not have arrived.
  await expect(sources.source("slow-3")).toHaveCount(0);
  await expect(sources.batchRow("slow-3.md")).toContainText("Interrupted");

  // Wait for the two files that never started to be sent and read before taking
  // a baseline. They were uploaded *after* the ones the reload abandoned, so once
  // they have been read, nothing else is still arriving — which is what makes the
  // snapshot below a settled one rather than a photograph of a growing list.
  await expect(sources.batchRow("slow-4.md")).toContainText("Uploaded");
  await expect(sources.batchRow("slow-5.md")).toContainText("Uploaded");
  await sources.waitRead("slow-4");
  await sources.waitRead("slow-5");

  // The list matches what Oyevolve holds. Whether the other two in-flight uploads
  // arrived is the same race as the reload spec, and is deliberately not pinned —
  // but the two resumed files are certain, so the baseline is only trusted once
  // it has settled and holds both of them.
  const before = await settledTitles(api, course.id, 2);
  expect(before).toEqual(expect.arrayContaining(["slow-4", "slow-5"]));
  await expect(sources.sources).toHaveCount(before.length);
  await expect(sources.source("slow-4")).toHaveCount(1);
  await expect(sources.source("slow-5")).toHaveCount(1);

  // Retry is the learner's decision, and it puts the missing file in exactly
  // once — the other materials are untouched.
  await sources.batchRow("slow-3.md").getByRole("button", { name: "Retry" }).click();
  await expect(sources.batchRow("slow-3.md")).toContainText("Uploaded");
  await sources.waitRead("slow-3");
  await expect(sources.source("slow-3")).toHaveCount(1);
  const after = await heldTitles(api, course.id);
  expect(after).toEqual(expect.arrayContaining([...before, "slow-3"]));
  expect(after.length).toBe(before.length + 1);
});
