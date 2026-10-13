import { expect, test } from "./fixtures";
import { SourcesPage, type DroppableFile } from "./pages/sources-page";

/**
 * The batch-upload drop path, end to end.
 *
 * Every spec here runs against the app a learner actually uses: the real form,
 * the real route handler, the real database and the real extraction pipeline.
 * The only stand-in is object storage (see `e2e/support/storage-stub.mjs`) —
 * which is why the specs ask the store what it received rather than trusting the
 * word "Uploaded" on screen.
 */

/** Markdown is the cheapest format the extractor really reads, so it is the fixture. */
function markdown(name: string, marker: string): DroppableFile {
  const body = `# ${marker}\n\n${marker} is the part of the method this file teaches, in a sentence long enough to be worth extracting.\n`;
  return { name, type: "text/markdown", base64: Buffer.from(body, "utf8").toString("base64") };
}

test("the drop zone states the rules it enforces", async ({ course, page }) => {
  const sources = new SourcesPage(page);
  await sources.goto(course.id);

  await expect(sources.dropZone).toContainText("Drop up to 10 files here");
  await expect(sources.dropZone).toContainText("Up to 25 MB per file, 10 files at a time.");
  await expect(sources.dropZone).toContainText("PDF document");
  // The picker itself only offers formats the extractor can read.
  await expect(sources.fileInput).toHaveAttribute("multiple", "");
  await expect(sources.fileInput).toHaveAttribute("accept", /\.pdf/);
  await expect(sources.fileInput).toHaveAttribute("accept", /\.docx/);
  // Legacy binary .doc is not offered: Oyevolve cannot extract text from it.
  await expect(sources.fileInput).not.toHaveAttribute("accept", /(^|,)\.doc(,|$)/);
});

test("one dropped file is stored, extracted, downloaded and removed", async ({
  course,
  page,
  api,
  storage,
}) => {
  // The storage double is what lets this spec prove the bytes landed; a run
  // against a server with its own provider reports it as skipped, not as passed.
  test.skip(!storage.available, "this run has no storage double to inspect");

  const sources = new SourcesPage(page);
  await sources.goto(course.id);

  // One file is one request — the route's per-file quota checks depend on it.
  const uploads: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/materials")) {
      uploads.push(request.url());
    }
  });

  await sources.drop([markdown("evidence-notes.md", "Frame")]);

  await expect(sources.batchRow("evidence-notes.md")).toContainText("Uploaded");
  await sources.expectSummary("1 of 1 uploaded");
  const storedKeys = await storage.keysContaining(course.id);
  expect(uploads).toHaveLength(1);

  // The workspace's own view: stored, read, and carrying real extracted evidence.
  const item = sources.source("evidence-notes");
  await expect(item).toBeVisible();
  await sources.waitRead("evidence-notes");
  await expect(item).toContainText(/[1-9]\d* chunks?/);

  // The bytes really left the request, under the learner's own scoped key.
  expect(storedKeys).toHaveLength(1);
  expect(storedKeys[0]).toMatch(
    new RegExp(`^users/[^/]+/courses/${course.id}/materials/material-[^/]+/evidence-notes\\.md$`),
  );

  // Downloading redirects an authorised learner to a short-lived signed URL, and
  // that URL serves back what was uploaded.
  const href = await item.getByRole("link", { name: "Download" }).getAttribute("href");
  const redirect = await api.get(href ?? "", { maxRedirects: 0 });
  expect(redirect.status()).toBe(307);
  const signed = redirect.headers()["location"] ?? "";
  expect(signed).toContain("/object/sign/");
  const downloaded = await fetch(signed);
  expect(downloaded.status).toBe(200);
  expect(await downloaded.text()).toContain("Frame");

  // Removing the material takes its stored object with it.
  page.once("dialog", (dialog) => void dialog.accept());
  await item.getByRole("button", { name: "Remove" }).click();
  await expect(sources.sources).toHaveCount(0);
  await expect(page.getByText("No sources in this workspace yet")).toBeVisible();
  expect(await storage.keysContaining(course.id)).toHaveLength(0);
});

test("ten files upload together, the eleventh is explained, and the list clears", async ({
  course,
  page,
  storage,
}) => {
  test.skip(!storage.available, "this run has no storage double to inspect");

  const sources = new SourcesPage(page);
  await sources.goto(course.id);

  const files = Array.from({ length: 11 }, (_, index) =>
    markdown(`batch-${index + 1}.md`, `Section ${index + 1}`),
  );
  await sources.drop(files);

  // The eleventh never becomes a row: it is refused with the rule it broke.
  await expect(sources.refusedRows).toHaveCount(1);
  await expect(sources.refusedRows.first()).toContainText("batch-11.md");
  await expect(sources.refusedRows.first()).toContainText(
    "Only 10 files can be uploaded at once. Add these in a second batch.",
  );
  await expect(sources.batchRows).toHaveCount(10);

  await sources.expectSummary("10 of 10 uploaded");
  await expect(sources.sources).toHaveCount(10);
  await sources.waitRead("batch-10");

  // Every file was stored separately, under its own key for this course.
  expect(await storage.keysContaining(`/courses/${course.id}/`)).toHaveLength(10);

  // Clearing tidies the batch list, never the workspace.
  await page.getByRole("button", { name: "Clear the list" }).click();
  await expect(sources.batchRows).toHaveCount(0);
  await expect(sources.refusedRows).toHaveCount(0);
  await expect(sources.sources).toHaveCount(10);
});

test("a file the browser accepts but the server refuses fails alone", async ({ course, page }) => {
  const sources = new SourcesPage(page);
  await sources.goto(course.id);

  // `.txt` and 0 bytes pass every rule the form can check; the route is the only
  // thing that can tell the learner the file is empty.
  await sources.drop([
    markdown("kept-one.md", "Order"),
    { name: "empty.txt", type: "text/plain", size: 0 },
    markdown("kept-two.md", "Move"),
  ]);

  await sources.expectSummary("2 of 3 uploaded · 1 failed");
  await expect(sources.batchRow("empty.txt")).toContainText("Not uploaded");
  await expect(sources.batchRow("empty.txt")).toContainText("That file is empty.");
  await expect(sources.batchRow("kept-one.md")).toContainText("Uploaded");
  await expect(sources.batchRow("kept-two.md")).toContainText("Uploaded");

  // One bad file never takes the good ones down with it.
  await expect(sources.sources).toHaveCount(2);
  await expect(sources.source("kept-one")).toBeVisible();
  await expect(sources.source("kept-two")).toBeVisible();
  await expect(sources.source("empty")).toHaveCount(0);
});

test("files that break the rules are refused before anything is sent", async ({ course, page }) => {
  const sources = new SourcesPage(page);
  await sources.goto(course.id);

  const sent: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/materials"))
      sent.push(request.url());
  });

  await sources.drop([
    // A legacy binary format Oyevolve cannot extract from, and a file past the cap.
    { name: "legacy.doc", type: "application/msword", size: 1024 },
    { name: "huge.pdf", type: "application/pdf", size: 26 * 1024 * 1024 },
  ]);

  await expect(sources.refusedRows).toHaveCount(2);
  await expect(sources.refusedRows.first()).toContainText("legacy.doc");
  await expect(sources.refusedRows.first()).toContainText("Oyevolve can't read this format yet");
  await expect(sources.refusedRows.nth(1)).toContainText("huge.pdf");
  await expect(sources.refusedRows.nth(1)).toContainText(
    "Too large at 26 MB — the limit is 25 MB per file.",
  );

  // Nothing was queued, so nothing was uploaded.
  await expect(sources.batchRows).toHaveCount(0);
  await expect(sources.sources).toHaveCount(0);
  expect(sent).toEqual([]);
});

test("choosing files through the picker works like dropping them", async ({ course, page }) => {
  const sources = new SourcesPage(page);
  await sources.goto(course.id);

  await sources.choose([markdown("picked-notes.md", "Trace")]);

  await sources.expectSummary("1 of 1 uploaded");
  await sources.waitRead("picked-notes");
});

test.describe("without a session", () => {
  // The cookie jar the setup project saved is what every other spec carries;
  // dropping it here is what proves the workspace is gated by it.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("the workspace cannot be reached", async ({ course, page }) => {
    await page.goto(`/courses/${course.id}/sources`);
    await expect(page).toHaveURL(/\/signin\?next=/);
    await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
    await expect(page.getByLabel("Course material")).toHaveCount(0);
  });
});
