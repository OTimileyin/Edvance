import { splitBounded } from "./shared";
import {
  EMPTY_CONTENT_CODE,
  MaterialExtractionError,
  type ExtractionResult,
  type ExtractedBlock,
  type SourceLocation,
} from "./types";

/** Upper bound on a single block before it is split at sentence boundaries. */
const MAX_BLOCK_CHARS = 2000;

type Section = {
  heading: string | null;
  lines: string[];
};

/**
 * Extracts Markdown (.md).
 *
 * Text is grouped under the nearest preceding ATX heading so each block carries
 * a "Section: …" location. Fenced code blocks are copied verbatim (a `#` inside
 * a fence is not a heading). Documents with no heading fall back to an
 * "Introduction" location rather than a fabricated page number.
 */
export function extractMarkdown(bytes: Buffer): ExtractionResult {
  const text = bytes.toString("utf8").replace(/^\uFEFF/, "");
  const sections: Section[] = [];
  let current: Section = { heading: null, lines: [] };
  let inFence = false;

  text.split(/\r?\n/).forEach((line) => {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      current.lines.push(line);
      return;
    }
    const heading = inFence ? null : /^(#{1,6})\s+(.*\S)\s*$/.exec(line);
    if (heading) {
      if (current.lines.length > 0 || current.heading !== null) sections.push(current);
      current = { heading: heading[2].trim(), lines: [] };
      return;
    }
    current.lines.push(line);
  });
  if (current.lines.length > 0 || current.heading !== null) sections.push(current);

  const blocks: ExtractedBlock[] = [];
  let sectionCount = 0;

  for (const section of sections) {
    const location: SourceLocation = section.heading
      ? { type: "section", label: `Section: ${section.heading}`, section: section.heading }
      : { type: "section", label: "Introduction", section: null };

    const body = section.lines.join("\n").trim();
    const full = section.heading ? `${section.heading}\n${body}`.trim() : body;
    if (!full) continue;

    sectionCount += 1;
    for (const piece of splitBounded(full, MAX_BLOCK_CHARS)) {
      blocks.push({ text: piece, location });
    }
  }

  if (blocks.length === 0) {
    throw new MaterialExtractionError(
      EMPTY_CONTENT_CODE,
      "No readable text was found in this file.",
    );
  }

  return { blocks, metadata: { unit: "section", count: sectionCount } };
}
