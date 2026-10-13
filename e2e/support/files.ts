import type { DroppableFile } from "../pages/sources-page";

/**
 * File fixtures for the upload specs.
 *
 * Markdown is the cheapest format the extractor really reads, so a fixture is a
 * real file with real text: extraction has something to find in it. The text
 * carries a marker so a spec can prove the bytes made the round trip.
 */

export function markdown(name: string, marker: string): DroppableFile {
  const body =
    `# ${marker}\n\n${marker} is the part of the method this file teaches, ` +
    "in a sentence long enough to be worth extracting.\n";
  return { name, type: "text/markdown", base64: Buffer.from(body, "utf8").toString("base64") };
}

/**
 * A batch larger than the form's concurrency, so the files at the end of it
 * cannot have started while the first ones are still in flight.
 */
export function slowBatch(prefix: string, count: number): DroppableFile[] {
  return Array.from({ length: count }, (_, index) =>
    markdown(`${prefix}-${index + 1}.md`, `Section ${index + 1}`),
  );
}
