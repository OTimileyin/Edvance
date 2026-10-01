import { groupParagraphs } from "./shared";
import {
  EMPTY_CONTENT_CODE,
  MaterialExtractionError,
  type ExtractionResult,
  type ExtractedBlock,
} from "./types";

/** Upper bound on a single block before it is split at sentence boundaries. */
const MAX_BLOCK_CHARS = 2000;

/**
 * Extracts plain text (.txt).
 *
 * Blocks are paragraph groups with a stable, human-readable line range so a
 * later citation can point at "Lines 12–18" without inventing a location.
 */
export function extractText(bytes: Buffer): ExtractionResult {
  const text = bytes.toString("utf8").replace(/^\uFEFF/, "");
  const groups = groupParagraphs(text, MAX_BLOCK_CHARS);

  const blocks: ExtractedBlock[] = groups.map((group) => ({
    text: group.text,
    location: {
      type: "line",
      label:
        group.lineStart === group.lineEnd
          ? `Line ${group.lineStart}`
          : `Lines ${group.lineStart}–${group.lineEnd}`,
      lineStart: group.lineStart,
      lineEnd: group.lineEnd,
    },
  }));

  if (blocks.length === 0) {
    throw new MaterialExtractionError(
      EMPTY_CONTENT_CODE,
      "No readable text was found in this file.",
    );
  }

  const lineCount = text.split(/\r?\n/).filter((line) => line.trim()).length;
  return { blocks, metadata: { unit: "line", count: lineCount } };
}
