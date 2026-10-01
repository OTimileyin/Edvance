/**
 * Shared types for the server-only extraction layer.
 *
 * Every extractor normalises its format into a list of `ExtractedBlock`s — a
 * run of text plus the human-readable location it came from — so downstream
 * chunking and storage never need to know which format produced the evidence.
 *
 * This module is intentionally free of React, database and environment
 * dependencies: it is pure data shape, so it can be imported by any extractor.
 */

/** The kind of place a piece of evidence came from. */
export type SourceLocationType = "page" | "slide" | "timestamp" | "section" | "line";

/**
 * Where an extracted block lives in the source document. `label` is the
 * human-readable form a learner will see ("Page 7", "00:04:12–00:04:38");
 * the remaining fields are structured detail for later citations and filters.
 */
export type SourceLocation = {
  type: SourceLocationType;
  /** Human-readable location, e.g. "Page 7" or "Section: Introduction". */
  label: string;
  // PDF
  page?: number;
  // PPTX
  slide?: number;
  // VTT / SRT
  startTime?: string;
  endTime?: string;
  // Markdown / DOCX
  section?: string | null;
  // TXT / Markdown line ranges
  lineStart?: number;
  lineEnd?: number;
};

/** A run of extracted text together with the location it came from. */
export type ExtractedBlock = {
  text: string;
  location: SourceLocation;
};

/** What the derived metadata counts, so the UI can say "PDF · 14 pages". */
export type ExtractionUnit = "page" | "slide" | "cue" | "section" | "line" | "block";

/** Factual metadata about a completed extraction. Never fabricated. */
export type ExtractionMetadata = {
  unit: ExtractionUnit;
  count: number;
};

/** The normalised result every extractor returns. */
export type ExtractionResult = {
  blocks: ExtractedBlock[];
  metadata: ExtractionMetadata;
};

/**
 * A failure that is safe to show a learner. `code` is a short machine-readable
 * identifier stored on the ingestion job; `message` is the safe summary. The
 * raw provider error is never carried here.
 */
export class MaterialExtractionError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "MaterialExtractionError";
    this.code = code;
  }
}

/** The error code used when a file yields no usable text at all. */
export const EMPTY_CONTENT_CODE = "empty-content";
