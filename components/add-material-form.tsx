"use client";

import { useEffect, useRef, useState } from "react";
import { uploadMaterialWithProgress } from "@/lib/useCourses";
import {
  MAX_FILES_PER_UPLOAD,
  MAX_MATERIAL_BYTES,
  acceptedExtensions,
  acceptedKindLabels,
  formatBytes,
  validateUploadFiles,
} from "@/lib/materials";
import {
  type BatchFile,
  type BatchSummary,
  clearFinished,
  markDone,
  markFailed,
  markProgress,
  markUploading,
  markWaiting,
  restoredBatch,
  restoredLine,
  startableIds,
  summarise,
  summaryLine,
} from "@/lib/upload-batch";
import { forgetUploads, loadQueue, rememberUpload, updateQueuedUpload } from "@/lib/upload-queue";

const STATE_LABELS: Record<BatchFile["state"], string> = {
  waiting: "Waiting",
  uploading: "Uploading…",
  done: "Uploaded",
  failed: "Not uploaded",
  interrupted: "Interrupted",
};

/** A stable id for one chosen file, unique across sessions so a restored batch cannot collide. */
function newUploadId(): string {
  const random =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `upload-${random}`;
}

/**
 * Upload form for the Sources section: drop up to ten files at once, or choose
 * them. Unsupported types, oversized files and over-long batches get an
 * immediate per-file reason, and every rule is enforced again by the upload
 * route, so nothing reaches object storage that Oyevolve cannot read.
 *
 * Files go one per request — which keeps the route's per-file quota checks
 * exact — with a few in flight at a time. One file failing never cancels the
 * batch, and more files can be added while a batch is still running.
 *
 * A batch also outlives the page. Each chosen file is written to this device
 * (`lib/upload-queue.ts`) before it is sent, so a refresh or a tab switch does
 * not throw away the files that had not started: they are put back in the queue
 * and sent here. A file whose request had already begun is a different case —
 * Oyevolve cannot know whether it arrived — so it comes back labelled, with a
 * Retry the learner chooses. Nothing is dropped quietly, and when the device
 * refuses to keep a file the form says so instead of promising safety.
 */
export function AddMaterialForm({ courseId, onAdded }: { courseId: string; onAdded: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  // The File objects stay out of React state: they are browser handles, and an
  // entry only needs to point at one.
  const filesById = useRef(new Map<string, File>());
  // Guards against starting the same file twice when the pump effect re-runs.
  const inFlight = useRef(new Set<string>());
  // A file may only start once its place on the device has been decided, so a
  // reload can never find a file marked "queued" whose request was already sent.
  const settled = useRef(new Set<string>());
  const restoredCourses = useRef(new Set<string>());

  const [batch, setBatch] = useState<BatchFile[]>([]);
  const [rejected, setRejected] = useState<{ name: string; reason: string }[]>([]);
  const [dragging, setDragging] = useState(false);
  /** Files the device would not keep; the form says so rather than pretending. */
  const [unkeptIds, setUnkeptIds] = useState<string[]>([]);
  /** What an earlier visit left behind, described in one honest sentence. */
  const [restored, setRestored] = useState<{
    resumed: number;
    interrupted: number;
    failed: number;
  } | null>(null);
  const [pumpTick, setPumpTick] = useState(0);

  function addFiles(chosen: File[]) {
    if (chosen.length === 0) return;
    const queued = batch.filter(
      (entry) => entry.state === "waiting" || entry.state === "uploading",
    ).length;
    const { accepted, rejected: refused } = validateUploadFiles(chosen, { alreadyQueued: queued });

    const additions: BatchFile[] = accepted.map((file) => {
      const id = newUploadId();
      filesById.current.set(id, file);
      return { id, name: file.name, size: file.size, state: "waiting", progress: 0, error: null };
    });

    if (additions.length > 0) setBatch((current) => [...current, ...additions]);
    setRejected(refused);
    // Let the same file be chosen again after it was refused.
    if (inputRef.current) inputRef.current.value = "";

    // Keep every chosen file on the device before it can be sent. Whatever the
    // answer, the file is released to the pump: a file the device would not keep
    // still deserves to be uploaded now, it just cannot be promised a second life.
    for (const entry of additions) {
      const file = filesById.current.get(entry.id);
      if (!file) continue;
      void rememberUpload(
        courseId,
        {
          id: entry.id,
          name: entry.name,
          size: entry.size,
          type: file.type,
          state: "queued",
          error: null,
          queuedAt: Date.now(),
        },
        file,
      )
        .then((kept) => {
          if (!kept) setUnkeptIds((current) => [...current, entry.id]);
        })
        .finally(() => {
          settled.current.add(entry.id);
          setPumpTick((tick) => tick + 1);
        });
    }
  }

  // Whatever an earlier visit left behind: the files that never started are put
  // back in the queue, and the ones whose request had begun come back labelled.
  useEffect(() => {
    if (restoredCourses.current.has(courseId)) return;
    restoredCourses.current.add(courseId);
    let live = true;

    void loadQueue(courseId).then((queued) => {
      if (!live || queued.length === 0) return;
      const files = new Map<string, File>();
      const ids: string[] = [];
      for (const { record, blob } of queued) {
        files.set(
          record.id,
          new File([blob], record.name, { type: record.type, lastModified: record.queuedAt }),
        );
        ids.push(record.id);
      }
      for (const id of ids) settled.current.add(id);
      filesById.current = new Map([...files, ...filesById.current]);

      setBatch((current) => [...restoredBatch(queued.map((entry) => entry.record)), ...current]);
      setRestored({
        resumed: queued.filter((entry) => entry.record.state === "queued").length,
        interrupted: queued.filter((entry) => entry.record.state === "sending").length,
        failed: queued.filter((entry) => entry.record.state === "failed").length,
      });
      setPumpTick((tick) => tick + 1);
    });

    return () => {
      live = false;
    };
  }, [courseId]);

  // The pump: whoever can start, starts. Running after every change is what
  // keeps `UPLOAD_CONCURRENCY` files in flight until the batch drains.
  useEffect(() => {
    for (const id of startableIds(batch)) {
      if (inFlight.current.has(id) || !settled.current.has(id)) continue;
      const file = filesById.current.get(id);
      if (!file) {
        setBatch((current) =>
          markFailed(current, id, "This file is no longer available. Choose it again."),
        );
        continue;
      }
      inFlight.current.add(id);
      setBatch((current) => markUploading(current, id));
      // Recorded before the request goes out: if the page dies mid-flight, this
      // is what tells the learner the file may or may not have arrived.
      void updateQueuedUpload(courseId, id, { state: "sending" });
      uploadMaterialWithProgress(courseId, file, (percent) =>
        setBatch((current) => markProgress(current, id, percent)),
      )
        .then(() => {
          filesById.current.delete(id);
          setBatch((current) => markDone(current, id));
          void forgetUploads(courseId, [id]);
          onAdded();
        })
        .catch((caught: unknown) => {
          const message =
            caught instanceof Error ? caught.message : "Could not upload the material.";
          setBatch((current) => markFailed(current, id, message));
          void updateQueuedUpload(courseId, id, { state: "failed", error: message });
        })
        .finally(() => {
          inFlight.current.delete(id);
        });
    }
  }, [batch, courseId, onAdded, pumpTick]);

  /** Sends a failed or interrupted file again — always the learner's decision. */
  function handleRetry(id: string) {
    const file = filesById.current.get(id);
    if (!file) {
      setBatch((current) =>
        markFailed(current, id, "This file is no longer available. Choose it again."),
      );
      return;
    }
    settled.current.add(id);
    void updateQueuedUpload(courseId, id, { state: "queued", error: null });
    setBatch((current) => markWaiting(current, id));
  }

  function handleClear() {
    const finished = batch
      .filter((entry) => entry.state !== "waiting" && entry.state !== "uploading")
      .map((entry) => entry.id);
    for (const id of finished) filesById.current.delete(id);
    void forgetUploads(courseId, finished);
    setBatch((current) => clearFinished(current));
    setRejected([]);
    setRestored(null);
  }

  const summary: BatchSummary = summarise(batch);
  const unkept = batch.filter(
    (entry) =>
      unkeptIds.includes(entry.id) && (entry.state === "waiting" || entry.state === "uploading"),
  );
  const restoreNotice = restored ? restoredLine(restored) : null;

  return (
    <form className="form" onSubmit={(event) => event.preventDefault()}>
      <div
        className={`drop-zone${dragging ? " drop-zone-active" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          addFiles(Array.from(event.dataTransfer.files));
        }}
      >
        <p className="drop-zone-text">
          <strong>Drop up to {MAX_FILES_PER_UPLOAD} files here</strong>, or choose them. Everything
          Oyevolve can read from them is extracted, so the next analysis has real evidence to work
          from.
        </p>
        <div className="field">
          <label className="field-label" htmlFor="material-file">
            Course material
          </label>
          <input
            ref={inputRef}
            id="material-file"
            className="input file-input"
            type="file"
            multiple
            accept={acceptedExtensions()}
            onChange={(event) => addFiles(Array.from(event.target.files ?? []))}
          />
          <p className="form-hint">
            {acceptedKindLabels()}. Up to {formatBytes(MAX_MATERIAL_BYTES)} per file,{" "}
            {MAX_FILES_PER_UPLOAD} files at a time.
          </p>
        </div>
      </div>

      {rejected.length > 0 && (
        <ul className="upload-list" aria-label="Files that were not accepted">
          {rejected.map((entry) => (
            <li key={entry.name} className="upload-row upload-row-failed">
              <span className="upload-name">{entry.name}</span>
              <span className="upload-meta">Not uploaded</span>
              <p className="upload-error" role="alert">
                {entry.reason}
              </p>
            </li>
          ))}
        </ul>
      )}

      {batch.length > 0 && (
        <>
          <ul className="upload-list" aria-label="Uploading files">
            {batch.map((entry) => (
              <li
                key={entry.id}
                className={`upload-row${entry.state === "failed" ? " upload-row-failed" : ""}`}
              >
                <span className="upload-name">{entry.name}</span>
                <span className="upload-meta">
                  {formatBytes(entry.size)} · {STATE_LABELS[entry.state]}
                </span>
                {entry.state === "uploading" && (
                  <span
                    className="upload-bar"
                    role="progressbar"
                    aria-label={`Uploading ${entry.name}`}
                    aria-valuenow={entry.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <span className="upload-bar-fill" style={{ width: `${entry.progress}%` }} />
                  </span>
                )}
                {(entry.state === "failed" || entry.state === "interrupted") && entry.error && (
                  <p className="upload-error">{entry.error}</p>
                )}
                {(entry.state === "failed" || entry.state === "interrupted") && (
                  <div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleRetry(entry.id)}
                    >
                      Retry
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <p className="upload-summary" aria-live="polite">
            {summaryLine(summary)}
          </p>
          {restoreNotice && (
            <p className="form-hint" role="status">
              {restoreNotice}
            </p>
          )}
          {unkept.length > 0 && (
            <p className="form-hint" role="status">
              {unkept.length === 1
                ? `${unkept[0].name} could not be kept on this device, so leaving this page before it is sent would lose it.`
                : `${unkept.length} files could not be kept on this device, so leaving this page before they are sent would lose them.`}{" "}
              The upload itself still works.
            </p>
          )}
          {!batch.some((entry) => entry.state === "waiting" || entry.state === "uploading") && (
            <div>
              <button type="button" className="btn" onClick={handleClear}>
                Clear the list
              </button>
            </div>
          )}
        </>
      )}

      <p className="form-hint">
        Chosen files are kept on this device until they are sent, so a refresh does not lose a batch
        that has not started. Files are stored privately and linked to this course.
      </p>
    </form>
  );
}
