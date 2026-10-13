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

/**
 * Per-course quotas. Storage is a shared, finite, free-tier resource, so a
 * single workspace cannot grow without bound: the number of materials and their
 * total size are both capped, and the learner is told which limit they hit.
 */
export const MAX_MATERIALS_PER_COURSE = 50;
export const MAX_COURSE_BYTES = 200 * 1024 * 1024; // 200 MB across a course

/**
 * How many files one action may hand to the uploader.
 *
 * A batch is uploaded one request per file — so the route's per-file quota
 * checks stay exact and one bad file cannot take the others down with it — and
 * this cap keeps a single action bounded. Every rule here is enforced again by
 * the upload route.
 */
export const MAX_FILES_PER_UPLOAD = 10;

export type MaterialKind = {
  /** The Oyevolve source type this file is ingested as. */
  type: SourceType;
  /** Human-readable description shown in the UI and error messages. */
  label: string;
  /** Fallback MIME type when the browser does not report one. */
  mime: string;
};

/**
 * Accepted material formats.
 *
 * Only formats Oyevolve can actually extract evidence from are accepted: a file
 * that uploads but yields no readable text would give the learner a dead end.
 * Legacy binary `.doc` and `.ppt` are deliberately excluded — there is no
 * reliable text extractor for them, so learners are asked to save as `.docx` or
 * `.pptx` instead.
 */
const KINDS: Record<string, MaterialKind> = {
  pdf: { type: "PDF", label: "PDF document", mime: "application/pdf" },
  pptx: {
    type: "Slide",
    label: "PowerPoint slides",
    mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  },
  docx: {
    type: "Notes",
    label: "Word document",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
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

/** One chosen file the uploader will not send, and why — shown as-is. */
export interface RejectedUpload {
  name: string;
  /** A sentence naming the limit that was hit, never a bare identifier. */
  reason: string;
}

/**
 * Applies the upload rules to a batch of chosen files.
 *
 * Pure on purpose: the form renders a per-file reason for anything refused, and
 * the same rules are unit-tested here rather than only exercised through the
 * browser.`alreadyQueued` counts the files still waiting or uploading, so a
 * second drop cannot push a batch past {@link MAX_FILES_PER_UPLOAD}.
 */
export function validateUploadFiles<T extends { name: string; size: number }>(
  files: T[],
  options: { alreadyQueued?: number } = {},
): { accepted: T[]; rejected: RejectedUpload[] } {
  const alreadyQueued = Math.max(0, options.alreadyQueued ?? 0);
  const room = Math.max(0, MAX_FILES_PER_UPLOAD - alreadyQueued);
  const accepted: T[] = [];
  const rejected: RejectedUpload[] = [];

  for (const file of files) {
    if (accepted.length >= room) {
      rejected.push({
        name: file.name,
        reason: `Only ${MAX_FILES_PER_UPLOAD} files can be uploaded at once. Add these in a second batch.`,
      });
      continue;
    }
    if (!materialKindFor(file.name)) {
      rejected.push({
        name: file.name,
        reason: `Oyevolve can't read this format yet. Accepted: ${acceptedKindLabels()}.`,
      });
      continue;
    }
    if (file.size > MAX_MATERIAL_BYTES) {
      rejected.push({
        name: file.name,
        reason: `Too large at ${formatBytes(file.size)} — the limit is ${formatBytes(
          MAX_MATERIAL_BYTES,
        )} per file.`,
      });
      continue;
    }
    accepted.push(file);
  }

  return { accepted, rejected };
}
