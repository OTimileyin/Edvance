/**
 * The batch upload state machine, kept pure so it can be tested without a
 * browser. The form owns the `File` objects (a browser handle, not view state)
 * and stores everything else here, so what the learner sees is a plain function
 * of these transitions.
 */

export type UploadState = "waiting" | "uploading" | "done" | "failed";

export interface BatchFile {
  /** Stable key for React and for the in-flight bookkeeping. */
  id: string;
  name: string;
  size: number;
  state: UploadState;
  /** 0–100 while uploading; 0 before it starts and 100 once it is stored. */
  progress: number;
  /** A user-safe failure message; set only while `state` is "failed". */
  error: string | null;
}

export type UploadBatch = BatchFile[];

/**
 * How many files are in flight at once. Ten parallel uploads would open ten
 * sockets and compete for the same bandwidth, and a learner learns more from
 * three files finishing than from ten progressing together.
 */
export const UPLOAD_CONCURRENCY = 3;

function patch(batch: UploadBatch, id: string, changes: Partial<BatchFile>): UploadBatch {
  return batch.map((entry) => (entry.id === id ? { ...entry, ...changes } : entry));
}

export function markUploading(batch: UploadBatch, id: string): UploadBatch {
  return patch(batch, id, { state: "uploading", progress: 0, error: null });
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

/**
 * The files that should start now: whoever is waiting, up to the concurrency
 * limit. Called again after every change, which is what makes the batch pump
 * itself without a scheduler.
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
    failedNames: [],
  };
  for (const entry of batch) {
    if (entry.state === "waiting") summary.waiting += 1;
    else if (entry.state === "uploading") summary.uploading += 1;
    else if (entry.state === "done") summary.done += 1;
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
  const remaining = summary.waiting + summary.uploading;
  if (remaining > 0) parts.push(`${remaining} still to go`);
  return parts.join(" · ");
}

/**
 * Tidies the list: everything finished is dropped, anything still waiting or
 * uploading is kept. A failure is finished too — its reason has been read by
 * the time this is offered.
 */
export function clearFinished(batch: UploadBatch): UploadBatch {
  return batch.filter((entry) => entry.state === "waiting" || entry.state === "uploading");
}

export function isBusy(batch: UploadBatch): boolean {
  return batch.some((entry) => entry.state === "waiting" || entry.state === "uploading");
}
