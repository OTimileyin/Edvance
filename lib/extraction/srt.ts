import { formatRange, formatTimestamp, parseCueBlock, splitBlocks } from "./timed";
import {
  EMPTY_CONTENT_CODE,
  MaterialExtractionError,
  type ExtractionResult,
  type ExtractedBlock,
} from "./types";

/**
 * Extracts an SRT subtitle transcript (.srt).
 *
 * Each subtitle block becomes a block whose location is its timestamp range.
 * A file with no parseable timestamp lines fails as malformed; a parseable but
 * cue-less file is treated as empty.
 */
export function extractSrt(bytes: Buffer): ExtractionResult {
  const text = bytes.toString("utf8").replace(/^\uFEFF/, "");
  const blocks: ExtractedBlock[] = [];

  for (const lines of splitBlocks(text)) {
    const cue = parseCueBlock(lines);
    if (!cue) continue;
    blocks.push({
      text: cue.text,
      location: {
        type: "timestamp",
        label: formatRange(cue.startMs, cue.endMs),
        startTime: formatTimestamp(cue.startMs),
        endTime: formatTimestamp(cue.endMs),
      },
    });
  }

  if (blocks.length === 0) {
    const hasTimestamp = text.includes("-->");
    throw new MaterialExtractionError(
      hasTimestamp ? "malformed-transcript" : EMPTY_CONTENT_CODE,
      hasTimestamp
        ? "No readable cues were found in this transcript."
        : "No readable text was found in this file.",
    );
  }

  return { blocks, metadata: { unit: "cue", count: blocks.length } };
}
