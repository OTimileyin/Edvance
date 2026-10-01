import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

import {
  EMPTY_CONTENT_CODE,
  MaterialExtractionError,
  type ExtractionResult,
  type ExtractedBlock,
} from "./types";

/**
 * Points pdf.js at its bundled standard fonts when the package is present, so
 * the fourteen base fonts resolve without a network fetch. Best-effort: if the
 * directory is missing, extraction still proceeds.
 */
function standardFontDataUrl(): string | undefined {
  const dir = join(process.cwd(), "node_modules", "pdfjs-dist", "standard_fonts");
  if (!existsSync(dir)) return undefined;
  const base = pathToFileURL(dir).href;
  return base.endsWith("/") ? base : `${base}/`;
}

/**
 * Extracts a PDF (.pdf) page by page.
 *
 * Each page with text becomes a block located at `Page N`, so evidence is
 * always anchored to a page a learner can open. A damaged file fails as
 * `corrupt-file`; a text-less (scanned) PDF fails as empty rather than
 * fabricating page content.
 */
export async function extractPdf(bytes: Buffer): Promise<ExtractionResult> {
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(bytes),
    useSystemFonts: false,
    useWorkerFetch: false,
    standardFontDataUrl: standardFontDataUrl(),
    // Only the page text is needed; font/style warnings are render-only noise.
    verbosity: 0,
  });

  let document: Awaited<typeof loadingTask.promise>;
  try {
    document = await loadingTask.promise;
  } catch {
    await loadingTask.destroy().catch(() => undefined);
    throw new MaterialExtractionError(
      "corrupt-file",
      "This PDF could not be read. It may be damaged.",
    );
  }

  try {
    const blocks: ExtractedBlock[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (!text) continue;
      blocks.push({
        text,
        location: { type: "page", label: `Page ${pageNumber}`, page: pageNumber },
      });
    }

    if (blocks.length === 0) {
      throw new MaterialExtractionError(
        EMPTY_CONTENT_CODE,
        "No readable text was found in this PDF. It may be a scanned image without a text layer.",
      );
    }

    return { blocks, metadata: { unit: "page", count: document.numPages } };
  } finally {
    await loadingTask.destroy().catch(() => undefined);
  }
}
