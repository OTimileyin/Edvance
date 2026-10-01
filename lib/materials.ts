import type { SourceType } from "@/lib/types";

/**
 * What the Sources upload accepts.
 *
 * Course materials arrive as PDFs, slide decks, documents and transcripts. The
 * allowed list is enforced on the client (for immediate feedback) and again in
 * the upload route, so an unsupported file is rejected gracefully rather than
 * written to object storage.
 */

export const MAX_MATERIAL_BYTES = 25 * 1024 * 1024; // 25 MB

export type MaterialKind = {
  /** The Edvance source type this file is ingested as. */
  type: SourceType;
  /** Human-readable description shown in the UI and error messages. */
  label: string;
  /** Fallback MIME type when the browser does not report one. */
  mime: string;
};

const KINDS: Record<string, MaterialKind> = {
  pdf: { type: "PDF", label: "PDF document", mime: "application/pdf" },
  pptx: {
    type: "Slide",
    label: "PowerPoint slides",
    mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  },
  ppt: { type: "Slide", label: "PowerPoint slides", mime: "application/vnd.ms-powerpoint" },
  docx: {
    type: "Notes",
    label: "Word document",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
  doc: { type: "Notes", label: "Word document", mime: "application/msword" },
  txt: { type: "Notes", label: "Plain-text notes", mime: "text/plain" },
  md: { type: "Notes", label: "Markdown notes", mime: "text/markdown" },
  vtt: { type: "Transcript", label: "WebVTT transcript", mime: "text/vtt" },
  srt: { type: "Transcript", label: "SRT transcript", mime: "application/x-subrip" },
};

function extensionOf(filename: string): string {
  const match = /\.([a-z0-9]+)\s*$/i.exec(filename.trim());
  return match ? match[1].toLowerCase() : "";
}

/** The material kind for a filename, or null when the extension is unsupported. */
export function materialKindFor(filename: string): MaterialKind | null {
  return KINDS[extensionOf(filename)] ?? null;
}

/** The `accept` attribute for the file input, e.g. ".pdf,.pptx,…". */
export function acceptedExtensions(): string {
  return Object.keys(KINDS)
    .map((extension) => `.${extension}`)
    .join(",");
}

/** A comma-separated list for the form hint, e.g. "PDF, PowerPoint slides, …". */
export function acceptedKindLabels(): string {
  return Array.from(new Set(Object.values(KINDS).map((kind) => kind.label))).join(", ");
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes) || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 10 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

/**
 * Sanitises a browser-provided filename for use as the final segment of a
 * storage object key. Keeps it recognisable but removes anything that could
 * escape the key prefix.
 */
export function safeMaterialFilename(filename: string): string {
  const cleaned = filename
    .replace(/[\\/]+/g, "-")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+/, "")
    .slice(-120);
  return cleaned || "material";
}

/** The display title for an uploaded file: its name without the extension. */
export function materialTitle(filename: string, fallback: string): string {
  const base = filename.replace(/\.[a-z0-9]+$/i, "").trim();
  return base || fallback;
}
