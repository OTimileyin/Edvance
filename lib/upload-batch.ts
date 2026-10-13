/**
 * The batch upload state machine, kept pure so it can be tested without a
 * browser. The form owns the `File` objects (a browser handle, not view state)
 * and stores everything else here, so what the learner sees is a plain function
 * of these transitions.
 *
 * A batch can outlive the page it was started on: `lib/upload-queue.ts` keeps
 * the chosen files on the device, and `restoredBatch` turns what it finds back
 * into a batch. Two cases have to stay distinct, because they mean different
 * things to the learner:
 *
 *   - a file that never started (`waiting`) is simply sent again — no request
 *     was ever made, so nothing can arrive twice;
 *   - a file whose request had begun (`interrupted`) may or may not have
 *     reached Oyevolve, so it is never resent on its own: the learner is told
 *     and decides, with a Retry on the row.
 */

export type UploadState = "waiting" | "uploading" | "done" | "failed" | "interrupted";

export interface BatchFile {
  /** Stable key for React and for the in-flight bookkeeping. */
  id: string;
  name: string;
  size: number;
  state: UploadState;
  /** 0–100 while uploading; 0 before it starts and 100 once it is stored. */
  progress: number;
  /** A user-safe failure message; set while `state` is "failed" or "interrupted". */
  error: string | null;
}

export type UploadBatch = BatchFile[];

/**
 * How many files are in flight at once. Ten parallel uploads would open ten
 * sockets and compete for the same bandwidth, and a learner learns more from
 * three files finishing than from ten progressing together.
 */
export const UPLOAD_CONCURRENCY = 3;

/** What the learner is told about a file that was interrupted mid-upload. */
export const INTERRUPTED_REASON =
  "Oyevolve was interrupted while sending this file. It may not have arrived — " +
  "Retry to send it again, or add it again if it is not in the list above.";

function patch(batch: UploadBatch, id: string, changes: Partial<BatchFile>): UploadBatch {
  return batch.map((entry) => (entry.id === id ? { ...entry, ...changes } : entry));
}

export function markUploading(batch: UploadBatch, id: string): UploadBatch {
  return patch(batch, id, { state: "uploading", progress: 0, error: null });
}

/**
 * Puts a file back in the queue to be sent again — what the Retry button on a
 * failed or interrupted row does. Deliberately a learner action: resending a
 * file Oyevolve may already hold is only ever their choice.
 */
export function markWaiting(batch: UploadBatch, id: string): UploadBatch {
  return patch(batch, id, { state: "waiting", progress: 0, error: null });
}

/**
 * Clamps and rounds a reported percentage. A progress event should never exceed
 * 100, but a bar that reports 103% would be a visible lie either way.
 */
export function markProgress(batch: UploadBatch, id: string, percent: number): UploadBatch {
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));
  return patch(batch, id, { progress: clamped });
}

export function markDone(batch: UploadBatch, id: string): UploadBatch {
  return patch(batch, id, { state: "done", progress: 100, error: null });
}

export function markFailed(batch: UploadBatch, id: string, message: string): UploadBatch {
  return patch(batch, id, { state: "failed", error: message });
}

/** One file as the device remembered it while the batch was running. */
export interface RememberedUpload {
  id: string;
  name: string;
  size: number;
  /** `queued` never started; `sending` had a request in flight; `failed` finished badly. */
  state: "queued" | "sending" | "failed";
  /** The reason recorded for a file that failed before the page went away. */
  error?: string | null;
}

/**
 * Turns what the device remembered into a batch to carry on with.
 *
 * Order is preserved, so a restored batch reads in the order the files were
 * chosen. Nothing is started here: `startableIds` picks up the files that are
 * safe to resend, and the form leaves the interrupted ones for the learner.
 */
export function restoredBatch(remembered: RememberedUpload[]): UploadBatch {
  return remembered.map((entry) => ({
    id: entry.id,
    name: entry.name,
    size: entry.size,
    state:
      entry.state === "queued" ? "waiting" : entry.state === "sending" ? "interrupted" : "failed",
    progress: 0,
    error:
      entry.state === "sending"
        ? INTERRUPTED_REASON
        : entry.state === "failed"
          ? (entry.error ?? "This file did not finish uploading.")
          : null,
  }));
}

/**
 * The files that should start now: whoever is waiting, up to the concurrency
 * limit. Called again after every change, which is what makes the batch pump
 * itself without a scheduler.
 *
 * An interrupted file is never in this list: it may already be in Oyevolve, so it
 * waits for the learner.
 */
export function startableIds(batch: UploadBatch, concurrency = UPLOAD_CONCURRENCY): string[] {
  const inFlight = batch.filter((entry) => entry.state === "uploading").length;
  const room = Math.max(0, concurrency - inFlight);
  if (room === 0) return [];
  return batch
    .filter((entry) => entry.state === "waiting")
    .slice(0, room)
    .map((entry) => entry.id);
}

export interface BatchSummary {
  total: number;
  waiting: number;
  uploading: number;
  done: number;
  failed: number;
  /** Sent, but interrupted before the answer arrived; the learner must decide. */
  interrupted: number;
  /** The names that failed, so the summary can be specific rather than vague. */
  failedNames: string[];
}

export function summarise(batch: UploadBatch): BatchSummary {
  const summary: BatchSummary = {
    total: batch.length,
    waiting: 0,
    uploading: 0,
    done: 0,
    failed: 0,
    interrupted: 0,
    failedNames: [],
  };
  for (const entry of batch) {
    if (entry.state === "waiting") summary.waiting += 1;
    else if (entry.state === "uploading") summary.uploading += 1;
    else if (entry.state === "done") summary.done += 1;
    else if (entry.state === "interrupted") summary.interrupted += 1;
    else {
      summary.failed += 1;
      summary.failedNames.push(entry.name);
    }
  }
  return summary;
}

/** One honest line about the whole batch, e.g. "6 of 8 uploaded · 1 failed". */
export function summaryLine(summary: BatchSummary): string {
  const parts = [`${summary.done} of ${summary.total} uploaded`];
  if (summary.failed > 0) parts.push(`${summary.failed} failed`);
  if (summary.interrupted > 0) parts.push(`${summary.interrupted} interrupted`);
  const remaining = summary.waiting + summary.uploading;
  if (remaining > 0) parts.push(`${remaining} still to go`);
  return parts.join(" · ");
}

/**
 * What is said when a batch comes back from an earlier visit: which files are
 * being sent again because they never started, and which ones need the learner's
 * decision because Oyevolve cannot know whether they arrived. Returns null when
 * nothing was restored.
 */
export function restoredLine(restored: {
  resumed: number;
  interrupted: number;
  failed: number;
}): string | null {
  const sentences: string[] = [];
  if (restored.resumed > 0) {
    sentences.push(
      `${restored.resumed} ${restored.resumed === 1 ? "file was" : "files were"} still waiting ` +
        `when you left, so ${restored.resumed === 1 ? "it is" : "they are"} uploading now.`,
    );
  }
  if (restored.interrupted > 0) {
    sentences.push(
      `${restored.interrupted} ${restored.interrupted === 1 ? "was" : "were"} interrupted ` +
        "mid-upload, so check the list above and Retry the ones that did not arrive.",
    );
  }
  if (restored.failed > 0) {
    sentences.push(
      `${restored.failed} ${restored.failed === 1 ? "file had" : "files had"} already failed, ` +
        "with the reason still on the row.",
    );
  }
  return sentences.length > 0 ? sentences.join(" ") : null;
}

/**
 * Tidies the list: everything finished is dropped, anything still waiting or
 * uploading is kept. A failure or an interruption is finished too — its reason
 * has been read by the time this is offered.
 */
export function clearFinished(batch: UploadBatch): UploadBatch {
  return batch.filter((entry) => entry.state === "waiting" || entry.state === "uploading");
}

/** The rows a learner can ask to send again. */
export function retryableIds(batch: UploadBatch): string[] {
  return batch
    .filter((entry) => entry.state === "failed" || entry.state === "interrupted")
    .map((entry) => entry.id);
}

export function isBusy(batch: UploadBatch): boolean {
  return batch.some((entry) => entry.state === "waiting" || entry.state === "uploading");
}
