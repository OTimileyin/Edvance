import { expect, test } from "./fixtures";
import { SourcesPage } from "./pages/sources-page";
import { markdown } from "./support/files";

/**
 * Work that happens after the response, told honestly.
 *
 * V2.2 moved reading a file out of the upload request and onto a queue, so the
 * learner can be told "uploaded" while the file is still unread. That is only
 * acceptable if the state in between is visible and truthful — and if a failure
 * that the queue is going to retry says so, rather than either hiding the
 * failure or handing the learner a button to press for something already
 * scheduled.
 *
 * These specs make a *transient* failure happen on purpose: the storage double
 * refuses to return the object for the first attempts, then answers normally.
 * Nothing here presses a button, which is the point — the queue is what has to
 * finish the work.
 */

/** Makes the next `times` reads of one object fail, as an outage would. */
async function refuseReads(name: string, times: number): Promise<void> {
  const origin = process.env.E2E_STORAGE_URL ?? "";
  const response = await fetch(
    `${origin}/__reject?key=${encodeURIComponent(name)}&where=download&count=${times}`,
    { method: "POST" },
  );
  if (!response.ok) {
    throw new Error(`The storage double refused the refusal request (${response.status}).`);
  }
}

test("a reading that fails can be seen failing, and finishes without being asked", async ({
  course,
  page,
  storage,
}) => {
  test.skip(!storage.available, "this run has no storage double to inspect");

  const sources = new SourcesPage(page);
  await sources.goto(course.id);

  // The object store will refuse to hand the file back twice, so the first two
  // attempts fail — a transient outage, which is exactly what retries are for.
  await refuseReads("queued-1.md", 2);

  await sources.drop([markdown("queued-1.md", "Queued marker")]);
  await sources.expectSettled();
  await expect(sources.batchRow("queued-1.md")).toContainText("Uploaded");

  // The row says what happened and what happens next. It does not offer Retry,
  // because the queue has already taken that decision — inviting the learner to
  // duplicate scheduled work would be a button that means nothing.
  await expect(sources.source("queued-1")).toContainText("Failed — a retry is queued");
  await expect(sources.source("queued-1")).toContainText("could not reach its file storage");
  await expect(
    sources.source("queued-1").getByRole("button", { name: "Retry extraction" }),
  ).toHaveCount(0);

  // And the course as a whole says the same thing in one plain sentence.
  await expect(page.getByText(/waiting to be tried again after a failure/)).toBeVisible();

  // Then it finishes by itself: no click, no reload, no second upload. The chunk
  // count is the proof that real evidence was extracted, not just a green badge.
  await expect(sources.source("queued-1")).toContainText("Ready for analysis", {
    timeout: 30_000,
  });
  await expect(sources.source("queued-1")).toContainText("1 chunk");
  await expect(page.getByText(/waiting to be tried again after a failure/)).toHaveCount(0);
});
