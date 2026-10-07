/**
 * Small, dependency-free text helpers shared by the extractors and the
 * chunker. Kept separate so PDF/DOCX/PPTX plumbing never leaks into the
 * plain-text paths and every format is chunked from the same primitives.
 */

/** Decodes an HTML/XML entity reference used by generated document markup. */
export function decodeEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-fA-F]+|amp|lt|gt|quot|apos);/g, (match, entity: string) => {
    switch (entity) {
      case "amp":
        return "&";
      case "lt":
        return "<";
      case "gt":
        return ">";
      case "quot":
        return '"';
      case "apos":
        return "'";
      default: {
        if (entity[0] !== "#") return match;
        const code =
          entity[1]?.toLowerCase() === "x"
            ? Number.parseInt(entity.slice(2), 16)
            : Number.parseInt(entity.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : match;
      }
    }
  });
}

/** Strips markup tags, decodes entities and collapses whitespace runs. */
export function toPlainText(markup: string): string {
  return decodeEntities(markup.replace(/<[^>]*>/g, " "))
    .replace(/[ \t\u00a0]+/g, " ")
    .trim();
}

/**
 * Splits text into sentence-ish segments: on line breaks first, then at
 * sentence punctuation. Used so chunking can avoid cutting a sentence in half.
 */
export function splitIntoSegments(text: string): string[] {
  const segments: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    for (const part of trimmed.split(/(?<=[.!?])\s+/)) {
      const piece = part.trim();
      if (piece) segments.push(piece);
    }
  }
  return segments;
}

/**
 * Hard-splits an over-long segment into pieces no larger than `max`, preferring
 * whitespace boundaries. Deterministic: the same input always yields the same
 * pieces.
 */
export function hardSplit(segment: string, max: number): string[] {
  if (segment.length <= max) return [segment];
  const pieces: string[] = [];
  let rest = segment;
  while (rest.length > max) {
    let cut = rest.lastIndexOf(" ", max);
    if (cut <= 0) cut = max;
    pieces.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) pieces.push(rest);
  return pieces.filter(Boolean);
}

/**
 * Splits text into pieces no larger than `maxChars`, first at sentence
 * boundaries and then, only if a single sentence is itself too long, at word
 * boundaries. Deterministic.
 */
export function splitBounded(text: string, maxChars: number): string[] {
  const pieces: string[] = [];
  let current = "";
  for (const segment of splitIntoSegments(text)) {
    for (const piece of hardSplit(segment, maxChars)) {
      if (current && current.length + 1 + piece.length > maxChars) {
        pieces.push(current);
        current = "";
      }
      current = current ? `${current} ${piece}` : piece;
    }
  }
  if (current) pieces.push(current);
  return pieces;
}

export type LineGroup = { text: string; lineStart: number; lineEnd: number };

/**
 * Groups consecutive non-blank lines into paragraph-like groups, tracking the
 * 1-based line range each group came from. Groups larger than `maxChars` are
 * split at sentence boundaries so no block is unbounded.
 */
export function groupParagraphs(text: string, maxChars: number): LineGroup[] {
  const lines = text.split(/\r?\n/);
  const raw: LineGroup[] = [];
  let buffer: string[] = [];
  let start = 0;

  const flush = (end: number) => {
    if (buffer.length === 0) return;
    raw.push({ text: buffer.join("\n"), lineStart: start, lineEnd: end });
    buffer = [];
  };

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    if (line.trim()) {
      if (buffer.length === 0) start = lineNumber;
      buffer.push(line);
    } else {
      flush(lineNumber - 1);
    }
  });
  flush(lines.length);

  const groups: LineGroup[] = [];
  for (const group of raw) {
    if (group.text.length <= maxChars) {
      groups.push(group);
      continue;
    }
    let current: string[] = [];
    let length = 0;
    for (const segment of splitIntoSegments(group.text)) {
      for (const piece of hardSplit(segment, maxChars)) {
        if (length > 0 && length + 1 + piece.length > maxChars) {
          groups.push({
            text: current.join(" "),
            lineStart: group.lineStart,
            lineEnd: group.lineEnd,
          });
          current = [];
          length = 0;
        }
        current.push(piece);
        length += (length ? 1 : 0) + piece.length;
      }
    }
    if (current.length > 0) {
      groups.push({ text: current.join(" "), lineStart: group.lineStart, lineEnd: group.lineEnd });
    }
  }

  return groups;
}
