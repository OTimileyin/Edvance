import { extractDocx } from "./docx";
import { extractMarkdown } from "./markdown";
import { extractPdf } from "./pdf";
import { extractPptx } from "./pptx";
import { extractSrt } from "./srt";
import { extractText } from "./text";
import { extractVtt } from "./vtt";
import { MaterialExtractionError, type ExtractionResult } from "./types";

export { chunkBlocks, type EvidenceChunk } from "./chunk";
export {
  EMPTY_CONTENT_CODE,
  MaterialExtractionError,
  type ExtractionMetadata,
  type ExtractionResult,
  type ExtractionUnit,
  type ExtractedBlock,
  type SourceLocation,
  type SourceLocationType,
} from "./types";

/** The lower-case extension of a filename, or "" when it has none. */
export function extensionOf(filename: string): string {
  const match = /\.([a-z0-9]+)\s*$/i.exec(filename.trim());
  return match ? match[1].toLowerCase() : "";
}

/**
 * Extracts one stored material into normalised, location-tagged blocks.
 *
 * The extension alone selects the parser, so a caller that already validated
 * the upload never has to branch on MIME type. Unsupported formats throw a
 * `MaterialExtractionError` with the `unsupported-format` code rather than
 * returning empty evidence.
 */
export async function extractMaterial(
  extension: string,
  bytes: Buffer,
): Promise<ExtractionResult> {
  switch (extension.trim().toLowerCase()) {
    case "pdf":
      return extractPdf(bytes);
    case "txt":
      return extractText(bytes);
    case "md":
    case "markdown":
      return extractMarkdown(bytes);
    case "docx":
      return extractDocx(bytes);
    case "pptx":
      return extractPptx(bytes);
    case "vtt":
      return extractVtt(bytes);
    case "srt":
      return extractSrt(bytes);
    default:
      throw new MaterialExtractionError(
        "unsupported-format",
        "Text extraction is not supported for this file type.",
      );
  }
}
