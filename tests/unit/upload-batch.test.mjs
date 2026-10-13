import { test } from "node:test";
import assert from "node:assert/strict";
import {
  INTERRUPTED_REASON,
  UPLOAD_CONCURRENCY,
  clearFinished,
  isBusy,
  markDone,
  markFailed,
  markProgress,
  markUploading,
  markWaiting,
  restoredBatch,
  restoredLine,
  retryableIds,
  startableIds,
  summarise,
  summaryLine,
} from "../../lib/upload-batch.ts";
import {
  MAX_FILES_PER_UPLOAD,
  MAX_MATERIAL_BYTES,
  validateUploadFiles,
} from "../../lib/materials.ts";

/**
 * The batch upload the Sources form renders is a pure state machine plus a pure
 * validation policy, so both are covered here rather than only through a
 * browser: the form is a rendering of these functions.
 */

function entry(id, overrides = {}) {
  return {
    id,
    name: `${id}.pdf`,
    size: 1024,
    state: "waiting",
    progress: 0,
    error: null,
    ...overrides,
  };
}

function file(name, size = 1024, extra = {}) {
  return { name, size, ...extra };
}

// ---------------------------------------------------------------------------
// Concurrency: how many uploads start, and when
// ---------------------------------------------------------------------------

test("starts no more than the concurrency limit, in order", () => {
  const batch = ["a", "b", "c", "d", "e"].map((id) => entry(id));
  assert.deepEqual(startableIds(batch), ["a", "b", "c"]);
  assert.equal(UPLOAD_CONCURRENCY, 3);
});

test("fills the free slots while others are in flight", () => {
  const batch = [entry("a", { state: "uploading" }), entry("b"), entry("c"), entry("d")];
  assert.deepEqual(startableIds(batch), ["b", "c"]);
});

test("starts nothing while every slot is busy", () => {
  const batch = ["a", "b", "c"].map((id) => entry(id, { state: "uploading" }));
  assert.deepEqual(startableIds(batch), []);
});

test("never restarts a finished or failed file", () => {
  const batch = [
    entry("a", { state: "done", progress: 100 }),
    entry("b", { state: "failed", error: "no" }),
  ];
  assert.deepEqual(startableIds(batch), []);
});

test("never resends an interrupted file on its own", () => {
  // Oyevolve cannot know whether an interrupted file arrived, so resending it is
  // only ever the learner's decision — never the pump's.
  const batch = [entry("a", { state: "interrupted", error: INTERRUPTED_REASON }), entry("b")];
  assert.deepEqual(startableIds(batch), ["b"]);
});

test("honours an explicit concurrency for a slower connection", () => {
  const batch = ["a", "b", "c", "d"].map((id) => entry(id));
  assert.deepEqual(startableIds(batch, 1), ["a"]);
});

// ---------------------------------------------------------------------------
// Transitions
// ---------------------------------------------------------------------------

test("starting a file clears a previous error and resets its progress", () => {
  const batch = [entry("a", { state: "failed", error: "storage down", progress: 40 })];
  const next = markUploading(batch, "a");
  assert.equal(next[0].state, "uploading");
  assert.equal(next[0].error, null);
  assert.equal(next[0].progress, 0);
});

test("progress is rounded and clamped into 0–100", () => {
  const batch = [entry("a", { state: "uploading" })];
  assert.equal(markProgress(batch, "a", 42.6)[0].progress, 43);
  assert.equal(markProgress(batch, "a", -5)[0].progress, 0);
  assert.equal(markProgress(batch, "a", 240)[0].progress, 100);
});

test("a finished file reports 100% and no error", () => {
  const batch = [entry("a", { state: "uploading", progress: 91, error: "stale" })];
  const next = markDone(batch, "a");
  assert.equal(next[0].state, "done");
  assert.equal(next[0].progress, 100);
  assert.equal(next[0].error, null);
});

test("a failure keeps the file's identity and records the reason", () => {
  const batch = [entry("a", { name: "notes.pdf", size: 2048, state: "uploading", progress: 30 })];
  const next = markFailed(batch, "a", "Storage is not configured.");
  assert.equal(next[0].state, "failed");
  assert.equal(next[0].error, "Storage is not configured.");
  assert.equal(next[0].name, "notes.pdf");
  assert.equal(next[0].size, 2048);
});

test("a transition touches one file and leaves the others alone", () => {
  const batch = [
    entry("a", { state: "uploading" }),
    entry("b"),
    entry("c", { state: "done", progress: 100 }),
  ];
  const next = markFailed(batch, "a", "nope");
  assert.deepEqual(next[1], batch[1]);
  assert.deepEqual(next[2], batch[2]);
});

test("transitions never mutate the batch they were given", () => {
  const batch = [entry("a")];
  const snapshot = structuredClone(batch);
  markUploading(batch, "a");
  markProgress(batch, "a", 50);
  markDone(batch, "a");
  markFailed(batch, "a", "nope");
  clearFinished(batch);
  assert.deepEqual(batch, snapshot);
});

// ---------------------------------------------------------------------------
// Summary and tidying
// ---------------------------------------------------------------------------

test("summarise counts every state and names the failures", () => {
  const batch = [
    entry("a", { state: "done", progress: 100 }),
    entry("b", { state: "done", progress: 100 }),
    entry("c", { state: "failed", name: "slides.pptx", error: "no" }),
    entry("d", { state: "uploading" }),
    entry("e"),
    entry("f"),
  ];
  const summary = summarise(batch);
  assert.deepEqual(summary, {
    total: 6,
    waiting: 2,
    uploading: 1,
    done: 2,
    failed: 1,
    interrupted: 0,
    failedNames: ["slides.pptx"],
  });
});

test("summarise counts interrupted files apart from failures", () => {
  // A failure is settled: Oyevolve answered. An interruption is not, and telling
  // them apart is what stops a learner resending something that already arrived.
  const summary = summarise([
    entry("a", { state: "interrupted", error: INTERRUPTED_REASON }),
    entry("b", { state: "failed", name: "slides.pptx", error: "no" }),
  ]);
  assert.equal(summary.interrupted, 1);
  assert.equal(summary.failed, 1);
  assert.deepEqual(summary.failedNames, ["slides.pptx"], "an interrupted file is not a failure");
});

test("the summary line states what happened without spin", () => {
  assert.equal(
    summaryLine(
      summarise([
        entry("a", { state: "done", progress: 100 }),
        entry("b", { state: "done", progress: 100 }),
      ]),
    ),
    "2 of 2 uploaded",
  );
  assert.equal(
    summaryLine(
      summarise([
        entry("a", { state: "done", progress: 100 }),
        entry("b", { state: "failed", error: "no" }),
        entry("c"),
      ]),
    ),
    "1 of 3 uploaded · 1 failed · 1 still to go",
  );
  assert.equal(summaryLine(summarise([])), "0 of 0 uploaded");
});

test("the summary line names interruptions separately from failures", () => {
  assert.equal(
    summaryLine(
      summarise([
        entry("a", { state: "done", progress: 100 }),
        entry("b", { state: "interrupted", error: INTERRUPTED_REASON }),
        entry("c"),
      ]),
    ),
    "1 of 3 uploaded · 1 interrupted · 1 still to go",
  );
});

test("clearing the list keeps work that is not finished", () => {
  const batch = [
    entry("a", { state: "done", progress: 100 }),
    entry("b", { state: "failed", error: "no" }),
    entry("c", { state: "uploading" }),
    entry("d"),
  ];
  assert.deepEqual(
    clearFinished(batch).map((item) => item.id),
    ["c", "d"],
  );
});

test("isBusy is true only while something is still going", () => {
  assert.equal(isBusy([]), false);
  assert.equal(isBusy([entry("a")]), true);
  assert.equal(isBusy([entry("a", { state: "uploading" })]), true);
  assert.equal(isBusy([entry("a", { state: "done", progress: 100 })]), false);
  assert.equal(isBusy([entry("a", { state: "failed", error: "no" })]), false);
  assert.equal(isBusy([entry("a", { state: "interrupted", error: "x" })]), false);
});

// ---------------------------------------------------------------------------
// Coming back to a batch the page abandoned
// ---------------------------------------------------------------------------

test("a file that never started comes back ready to send", () => {
  const [restored] = restoredBatch([
    { id: "a", name: "notes.md", size: 2048, state: "queued", error: null },
  ]);
  assert.deepEqual(restored, {
    id: "a",
    name: "notes.md",
    size: 2048,
    state: "waiting",
    progress: 0,
    error: null,
  });
  assert.deepEqual(startableIds([restored]), ["a"], "it is safe to send: nothing was ever sent");
});

test("a file whose request had begun comes back interrupted, with the reason", () => {
  const [restored] = restoredBatch([
    { id: "a", name: "notes.md", size: 2048, state: "sending", error: null },
  ]);
  assert.equal(restored.state, "interrupted");
  assert.equal(restored.error, INTERRUPTED_REASON);
  assert.match(INTERRUPTED_REASON, /may not have arrived/);
  assert.deepEqual(startableIds([restored]), [], "never resent without the learner asking");
  assert.deepEqual(retryableIds([restored]), ["a"]);
});

test("a file that had already failed comes back with its own reason", () => {
  const [restored] = restoredBatch([
    { id: "a", name: "empty.txt", size: 0, state: "failed", error: "That file is empty." },
  ]);
  assert.equal(restored.state, "failed");
  assert.equal(restored.error, "That file is empty.");
  assert.deepEqual(retryableIds([restored]), ["a"]);
});

test("a restored batch keeps the order the files were chosen in", () => {
  const batch = restoredBatch([
    { id: "a", name: "first.md", size: 1, state: "queued" },
    { id: "b", name: "second.md", size: 1, state: "sending" },
    { id: "c", name: "third.md", size: 1, state: "queued" },
  ]);
  assert.deepEqual(
    batch.map((item) => item.id),
    ["a", "b", "c"],
  );
  assert.deepEqual(startableIds(batch), ["a", "c"]);
});

test("retrying puts a file back in the queue with a clean slate", () => {
  const batch = [entry("a", { state: "interrupted", error: INTERRUPTED_REASON, progress: 60 })].map(
    (item) => ({ ...item, state: "uploading" }),
  );
  const next = markWaiting(batch, "a");
  assert.equal(next[0].state, "waiting");
  assert.equal(next[0].error, null);
  assert.equal(next[0].progress, 0);
  assert.deepEqual(startableIds(next), ["a"]);
});

test("what a restored batch tells the learner is specific about each case", () => {
  assert.equal(restoredLine({ resumed: 0, interrupted: 0, failed: 0 }), null);
  assert.equal(
    restoredLine({ resumed: 1, interrupted: 0, failed: 0 }),
    "1 file was still waiting when you left, so it is uploading now.",
  );
  assert.equal(
    restoredLine({ resumed: 3, interrupted: 0, failed: 0 }),
    "3 files were still waiting when you left, so they are uploading now.",
  );
  assert.match(
    restoredLine({ resumed: 2, interrupted: 1, failed: 0 }),
    /2 files were still waiting.*1 was interrupted.*Retry/s,
  );
  assert.match(
    restoredLine({ resumed: 0, interrupted: 0, failed: 2 }),
    /2 files had already failed/,
  );
});

// ---------------------------------------------------------------------------
// Validation policy
// ---------------------------------------------------------------------------

test("accepts a batch of files Oyevolve can read", () => {
  const files = ["a.pdf", "b.pptx", "c.docx", "d.txt", "e.md"].map((name) => file(name));
  const { accepted, rejected } = validateUploadFiles(files);
  assert.equal(accepted.length, 5);
  assert.deepEqual(rejected, []);
});

test("refuses files past the per-action limit and says which limit it hit", () => {
  const files = Array.from({ length: 13 }, (_, index) => file(`f${index}.pdf`));
  const { accepted, rejected } = validateUploadFiles(files);
  assert.equal(accepted.length, MAX_FILES_PER_UPLOAD);
  assert.equal(rejected.length, 3);
  assert.match(rejected[0].reason, /Only 10 files can be uploaded at once/);
});

test("files already queued count against the limit", () => {
  const files = Array.from({ length: 4 }, (_, index) => file(`f${index}.pdf`));
  const { accepted, rejected } = validateUploadFiles(files, { alreadyQueued: 8 });
  assert.equal(accepted.length, 2);
  assert.equal(rejected.length, 2);
});

test("a second drop is refused entirely once the batch is full", () => {
  const { accepted, rejected } = validateUploadFiles([file("late.pdf")], {
    alreadyQueued: MAX_FILES_PER_UPLOAD,
  });
  assert.equal(accepted.length, 0);
  assert.equal(rejected.length, 1);
});

test("an unsupported format is refused with the accepted list named", () => {
  const { accepted, rejected } = validateUploadFiles([file("recording.mp4")]);
  assert.equal(accepted.length, 0);
  assert.equal(rejected[0].name, "recording.mp4");
  assert.match(rejected[0].reason, /PDF/);
  assert.match(rejected[0].reason, /WebVTT/);
});

test("an oversized file is refused with both sizes named", () => {
  const { accepted, rejected } = validateUploadFiles([file("huge.pdf", MAX_MATERIAL_BYTES + 1)]);
  assert.equal(accepted.length, 0);
  assert.match(rejected[0].reason, /25 MB/);
});

test("a refused file does not consume one of the batch slots", () => {
  const files = [
    ...Array.from({ length: 5 }, (_, index) => file(`good${index}.pdf`)),
    file("notes.rtf"),
    ...Array.from({ length: 5 }, (_, index) => file(`more${index}.pdf`)),
  ];
  const { accepted, rejected } = validateUploadFiles(files);
  assert.equal(accepted.length, MAX_FILES_PER_UPLOAD);
  assert.equal(rejected.length, 1);
  assert.equal(rejected[0].name, "notes.rtf");
});

test("accepted files keep their identity, so the form still holds the File", () => {
  const chosen = file("stamped.pdf", 4096, { lastModified: 123 });
  const { accepted } = validateUploadFiles([chosen]);
  assert.equal(accepted[0], chosen);
});
