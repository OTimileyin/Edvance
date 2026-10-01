import { hardSplit, splitIntoSegments } from "./shared";
import type { ExtractedBlock, SourceLocation } from "./types";

/** Aim for chunks around this size, without ever splitting a sentence. */
const TARGET_CHARS = 900;
/** A single sentence longer than this is hard-split at a word boundary. */
const MAX_CHARS = 1600;
/** Trailing fragments smaller than this are merged into the previous chunk. */
const MIN_CHARS = 60;

/** An ordered, location-tagged unit of evidence ready for storage. */
export type EvidenceChunk = {
  content: string;
  location: SourceLocation;
  metadata: Record<string, unknown>;
};

/** Structured location detail stored alongside the human-readable label. */
function locationMetadata(location: SourceLocation): Record<string, unknown> {
  const meta: Record<string, unknown> = { type: location.type };
  if (location.page !== undefined) meta.page = location.page;
  if (location.slide !== undefined) meta.slide = location.slide;
  if (location.startTime !== undefined) meta.startTime = location.startTime;
  if (location.endTime !== undefined) meta.endTime = location.endTime;
  if (location.section !== undefined) meta.section = location.section;
  if (location.lineStart !== undefined) meta.lineStart = location.lineStart;
  if (location.lineEnd !== undefined) meta.lineEnd = location.lineEnd;
  return meta;
}

/**
 * Splits one block's text into pieces bounded by `TARGET_CHARS`, never cutting a
 * sentence unless a single sentence exceeds `MAX_CHARS`. A tiny trailing piece
 * is folded back into its predecessor so no useless fragment is stored.
 */
function chunkBlockText(text: string): string[] {
  const pieces: string[] = [];
  let current = "";

  for (const segment of splitIntoSegments(text)) {
    for (const piece of hardSplit(segment, MAX_CHARS)) {
      if (current && current.length + 1 + piece.length > TARGET_CHARS) {
        pieces.push(current);
        current = "";
      }
      current = current ? `${current} ${piece}` : piece;
    }
  }
  if (current) pieces.push(current);

  if (pieces.length > 1 && pieces[pieces.length - 1].length < MIN_CHARS) {
    const tail = pieces.pop()!;
    pieces[pieces.length - 1] = `${pieces[pieces.length - 1]} ${tail}`;
  }
  return pieces;
}

/**
 * Turns ordered extracted blocks into ordered evidence chunks.
 *
 * Deterministic: identical input always produces identical chunks in the same
 * order. A chunk never spans two source locations, so its citation is exact.
 */
export function chunkBlocks(blocks: ExtractedBlock[]): EvidenceChunk[] {
  const chunks: EvidenceChunk[] = [];
  for (const block of blocks) {
    const metadata = locationMetadata(block.location);
    for (const content of chunkBlockText(block.text)) {
      chunks.push({ content, location: block.location, metadata });
    }
  }
  return chunks;
}
