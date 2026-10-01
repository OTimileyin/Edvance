import { formatRange, formatTimestamp, parseCueBlock, splitBlocks } from "./timed";
import {
  EMPTY_CONTENT_CODE,
  MaterialExtractionError,
  type ExtractionResult,
  type ExtractedBlock,
} from "./types";

/**
 * Extracts a WebVTT transcript (.vtt).
 *
 * Each cue becomes a block whose location is the cue's timestamp range, so a
 * later citation can say "00:04:12–00:04:38". A file that is not WebVTT at all
 * fails with a clear code; a valid file with no cues is treated as empty.
 */
export function extractVtt(bytes: Buffer): ExtractionResult {
  const text = bytes.toString("utf8").replace(/^\uFEFF/, "");

  if (!/^\s*WEBVTT/.test(text)) {
    throw new MaterialExtractionError(
      "malformed-transcript",
      "This file is not a valid WebVTT transcript.",
    );
  }

  const blocks: ExtractedBlock[] = [];
  for (const lines of splitBlocks(text)) {
    const first = lines.find((line) => line.trim())?.trim() ?? "";
    if (/^(NOTE|STYLE|REGION)\b/.test(first)) continue;
    if (first.startsWith("WEBVTT")) continue;

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
