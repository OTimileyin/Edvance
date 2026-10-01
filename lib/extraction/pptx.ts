import JSZip from "jszip";

import { decodeEntities } from "./shared";
import {
  EMPTY_CONTENT_CODE,
  MaterialExtractionError,
  type ExtractionResult,
  type ExtractedBlock,
} from "./types";

/** Matches a slide part, capturing its ordinal, e.g. `ppt/slides/slide12.xml`. */
const SLIDE_PATTERN = /^ppt\/slides\/slide(\d+)\.xml$/;
/** Matches a DrawingML paragraph. */
const PARAGRAPH_PATTERN = /<a:p[ >][\s\S]*?<\/a:p>/g;
/** Matches a DrawingML text run. */
const RUN_PATTERN = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;

/** The slide's ordinal from its part name, or 0 when it cannot be read. */
function slideOrdinal(name: string): number {
  const match = SLIDE_PATTERN.exec(name);
  return match ? Number.parseInt(match[1], 10) : 0;
}

/**
 * Extracts a PowerPoint deck (.pptx) directly from its Open XML parts.
 *
 * Each slide becomes a block located at `Slide N`, ordered by the slide's
 * part number (its order in the deck). A file that is not a readable package
 * fails as `corrupt-file`; a deck with no text fails as empty.
 */
export async function extractPptx(bytes: Buffer): Promise<ExtractionResult> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch {
    throw new MaterialExtractionError(
      "corrupt-file",
      "This presentation could not be read. It may be damaged.",
    );
  }

  const slideNames = Object.keys(zip.files)
    .filter((name) => SLIDE_PATTERN.test(name))
    .sort((a, b) => slideOrdinal(a) - slideOrdinal(b));

  if (slideNames.length === 0) {
    throw new MaterialExtractionError(
      "corrupt-file",
      "This presentation could not be read. It may be damaged.",
    );
  }

  const blocks: ExtractedBlock[] = [];
  for (const name of slideNames) {
    const file = zip.file(name);
    if (!file) continue;
    const xml = await file.async("string");

    const paragraphs = Array.from(xml.matchAll(PARAGRAPH_PATTERN))
      .map((paragraph) =>
        Array.from(paragraph[0].matchAll(RUN_PATTERN))
          .map((run) => decodeEntities(run[1]))
          .join("")
          .trim(),
      )
      .filter(Boolean);

    if (paragraphs.length === 0) continue;
    const slide = slideOrdinal(name);
    blocks.push({
      text: paragraphs.join("\n"),
      location: { type: "slide", label: `Slide ${slide}`, slide },
    });
  }

  if (blocks.length === 0) {
    throw new MaterialExtractionError(
      EMPTY_CONTENT_CODE,
      "No readable text was found in this presentation.",
    );
  }

  return { blocks, metadata: { unit: "slide", count: slideNames.length } };
}
