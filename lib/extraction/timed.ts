/** Timing and parsing helpers shared by the WebVTT and SRT transcript extractors. */

export type Cue = {
  /** Milliseconds from the start of the recording. */
  startMs: number;
  endMs: number;
  text: string;
};

/**
 * Parses a WebVTT (`00:04:12.000`) or SRT (`00:04:12,000`) timestamp into
 * milliseconds. Returns null when the token is not a valid timestamp.
 */
export function parseTimestamp(token: string): number | null {
  const value = token.trim().replace(",", ".");
  const match = /^(?:(\d+):)?(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?$/.exec(value);
  if (!match) return null;

  const hours = match[1] ? Number.parseInt(match[1], 10) : 0;
  const minutes = Number.parseInt(match[2], 10);
  const seconds = Number.parseInt(match[3], 10);
  const millis = match[4] ? Number.parseInt(match[4].padEnd(3, "0"), 10) : 0;
  if (minutes > 59 || seconds > 59) return null;

  return ((hours * 60 + minutes) * 60 + seconds) * 1000 + millis;
}

/** Formats milliseconds as `HH:MM:SS`, keeping `.mmm` only when non-zero. */
export function formatTimestamp(ms: number): string {
  const total = Math.max(0, Math.round(ms));
  const hours = Math.floor(total / 3_600_000);
  const minutes = Math.floor((total % 3_600_000) / 60_000);
  const seconds = Math.floor((total % 60_000) / 1000);
  const millis = total % 1000;
  const pad = (value: number, width = 2) => String(value).padStart(width, "0");
  const base = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return millis === 0 ? base : `${base}.${pad(millis, 3)}`;
}

/** A human-readable range, e.g. "00:04:12–00:04:38". */
export function formatRange(startMs: number, endMs: number): string {
  return `${formatTimestamp(startMs)}–${formatTimestamp(endMs)}`;
}

/**
 * Splits a cue into `start`/`end`/`text` from the lines of one caption block.
 * Returns null when the block has no parseable timestamp line.
 */
export function parseCueBlock(lines: string[]): Cue | null {
  const index = lines.findIndex((line) => line.includes("-->"));
  if (index === -1) return null;

  const [startToken, rest] = lines[index].split("-->");
  if (rest === undefined) return null;
  // WebVTT allows cue settings after the end timestamp; SRT does not.
  const endToken = rest.trim().split(/\s+/)[0];
  const startMs = parseTimestamp(startToken);
  const endMs = parseTimestamp(endToken);
  if (startMs === null || endMs === null) return null;

  const text = lines
    .slice(index + 1)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
  if (!text) return null;

  return { startMs, endMs, text };
}

/** Splits a subtitle document into blank-line-separated blocks. */
export function splitBlocks(text: string): string[][] {
  return text
    .split(/\r?\n\s*\r?\n/)
    .map((block) => block.split(/\r?\n/).map((line) => line.trimEnd()))
    .filter((lines) => lines.some((line) => line.trim()));
}
