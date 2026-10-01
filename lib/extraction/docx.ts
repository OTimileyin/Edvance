import mammoth from "mammoth";

import { splitBounded, toPlainText } from "./shared";
import {
  EMPTY_CONTENT_CODE,
  MaterialExtractionError,
  type ExtractionResult,
  type ExtractedBlock,
  type SourceLocation,
} from "./types";

/** Upper bound on a single block before it is split at sentence boundaries. */
const MAX_BLOCK_CHARS = 2000;

type Section = { heading: string | null; parts: string[] };

/**
 * Extracts a Word document (.docx) via mammoth's HTML conversion.
 *
 * Headings open a section; the paragraphs beneath a heading become one block
 * located at `Section: …`. Documents with no heading fall back to a "Document"
 * location. A file mammoth cannot parse fails as `corrupt-file`.
 */
export async function extractDocx(bytes: Buffer): Promise<ExtractionResult> {
  let html: string;
  try {
    const result = await mammoth.convertToHtml({ buffer: bytes });
    html = result.value;
  } catch {
    throw new MaterialExtractionError(
      "corrupt-file",
      "This Word document could not be read. It may be damaged.",
    );
  }

  const sections: Section[] = [];
  let current: Section = { heading: null, parts: [] };
  const blockPattern = /<(h[1-6]|p)\b[^>]*>([\s\S]*?)<\/\1>/gi;

  for (const match of html.matchAll(blockPattern)) {
    const tag = match[1].toLowerCase();
    const text = toPlainText(match[2]);
    if (!text) continue;
    if (tag.startsWith("h")) {
      if (current.parts.length > 0) sections.push(current);
      current = { heading: text, parts: [text] };
    } else {
      current.parts.push(text);
    }
  }
  if (current.parts.length > 0) sections.push(current);

  const blocks: ExtractedBlock[] = [];
  let sectionCount = 0;
  for (const section of sections) {
    const text = section.parts.join("\n").trim();
    if (!text) continue;
    sectionCount += 1;
    const location: SourceLocation = section.heading
      ? { type: "section", label: `Section: ${section.heading}`, section: section.heading }
      : { type: "section", label: "Document", section: null };
    for (const piece of splitBounded(text, MAX_BLOCK_CHARS)) {
      blocks.push({ text: piece, location });
    }
  }

  if (blocks.length === 0) {
    throw new MaterialExtractionError(
      EMPTY_CONTENT_CODE,
      "No readable text was found in this document.",
    );
  }

  return { blocks, metadata: { unit: "section", count: sectionCount } };
}
