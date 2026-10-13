import { type Locator, type Page, expect } from "@playwright/test";

/**
 * The Sources page, where the drop path lives.
 *
 * Locators are by role and label rather than by class, so the suite keeps
 * working through a restyle, and the drop is performed the way a browser does it
 * — a `DataTransfer` full of real `File` objects, dispatched as `dragover` and
 * then `drop` — rather than by reaching past the UI into the hidden input. The
 * input path is exercised too, because that is how a learner who clicks
 * "Course material" uploads.
 */

/**
 * How long to wait for a material to actually be read.
 *
 * Reading a file happens *after* the upload response (V2.2): the route enqueues an
 * `ingest` job and a worker runs it. So waiting for "Ready for analysis" is waiting
 * for background work, not for the request that caused it — and for a file whose
 * page was abandoned mid-upload, the worker loop's own tick is the only path,
 * which a loaded machine can delay by seconds. Generous on purpose: the guarantee
 * these specs exist for is that nothing is lost, not that extraction is instant.
 *
 * The number is a measurement, not a preference. Watching the queue from the
 * database while this suite ran showed the worker healthy but unhurried — two
 * attempts in hand for about four seconds, the connections idle, nothing waiting
 * on a lock — under the double's store delay, two Chromium workers and a freshly
 * seeded workspace. The old 30s was chosen before any of that was measured, and
 * it made the suite fail roughly one run in three on work that was never in
 * trouble. 45s is still a real deadline: a material that is never read fails here.
 */
export const READ_TIMEOUT_MS = 45_000;

/** A file to hand to the drop zone, built inside the browser. */
export type DroppableFile = {
  name: string;
  /** A MIME type the browser would report for that extension. */
  type: string;
} & (
  | /** Exact bytes, for a file whose contents matter. */
    { base64: string } /** A file of exactly this many bytes, for size-rule tests. */
  | { size: number }
);

export class SourcesPage {
  readonly heading: Locator;
  readonly dropZone: Locator;
  readonly fileInput: Locator;
  /** One row per queued file, in the order they were chosen. */
  readonly batchRows: Locator;
  /** The per-file reasons for anything the form refused to send. */
  readonly refusedRows: Locator;
  readonly batchSummary: Locator;
  /** One item per stored material. */
  readonly sources: Locator;

  constructor(private page: Page) {
    this.heading = page.getByRole("heading", { name: "Sources" });
    this.dropZone = page.locator(".drop-zone");
    this.fileInput = page.getByLabel("Course material");
    this.batchRows = page.getByRole("list", { name: "Uploading files" }).getByRole("listitem");
    this.refusedRows = page
      .getByRole("list", { name: "Files that were not accepted" })
      .getByRole("listitem");
    this.batchSummary = page.locator(".upload-summary");
    this.sources = page.getByRole("region", { name: "Sources list" }).getByRole("article");
  }

  async goto(courseId: string) {
    await this.page.goto(`/courses/${courseId}/sources`);
    await expect(this.heading).toBeVisible();
  }

  /** The batch row for one file, addressed by the name shown on it. */
  batchRow(name: string): Locator {
    return this.batchRows.filter({ hasText: name });
  }

  /** The stored-material item for one material, addressed by its title. */
  source(title: string): Locator {
    return this.sources.filter({ hasText: title });
  }

  /** Waits until a material has been read and its evidence extracted. */
  async waitRead(title: string): Promise<void> {
    await expect(this.source(title)).toContainText("Ready for analysis", {
      timeout: READ_TIMEOUT_MS,
    });
  }

  /**
   * Drops files onto the zone as a real drag: `dragover` first (the zone lights
   * up), then `drop` with the same `DataTransfer`.
   */
  async drop(files: DroppableFile[]) {
    const transfer = await this.dataTransfer(files);
    await this.dropZone.dispatchEvent("dragover", { dataTransfer: transfer });
    await expect(this.dropZone).toHaveClass(/drop-zone-active/);
    await this.dropZone.dispatchEvent("drop", { dataTransfer: transfer });
    await expect(this.dropZone).not.toHaveClass(/drop-zone-active/);
  }

  /** Chooses files through the file input, the click-and-pick path. */
  async choose(files: DroppableFile[]) {
    await this.fileInput.setInputFiles(
      files.map((file) => ({
        name: file.name,
        mimeType: file.type,
        buffer: "base64" in file ? Buffer.from(file.base64, "base64") : Buffer.alloc(file.size),
      })),
    );
  }

  /** Waits for the batch the summary describes, e.g. "3 of 3 uploaded". */
  async expectSummary(line: string) {
    await expect(this.batchSummary).toHaveText(line);
  }

  /** Waits until every stored material has finished being read, or failed. */
  async expectSettled() {
    await expect(this.batchSummary).not.toContainText("still to go");
  }

  private async dataTransfer(files: DroppableFile[]) {
    return this.page.evaluateHandle((entries: DroppableFile[]) => {
      const decode = (base64: string) => {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) {
          bytes[index] = binary.charCodeAt(index);
        }
        return bytes;
      };
      const transfer = new DataTransfer();
      for (const entry of entries) {
        const bytes = "base64" in entry ? decode(entry.base64) : new Uint8Array(entry.size);
        transfer.items.add(new File([bytes], entry.name, { type: entry.type }));
      }
      return transfer;
    }, files);
  }
}
