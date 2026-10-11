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
  startableIds,
  summarise,
  summaryLine,
} from "@/lib/upload-batch";

const STATE_LABELS: Record<BatchFile["state"], string> = {
  waiting: "Waiting",
  uploading: "Uploading…",
  done: "Uploaded",
  failed: "Not uploaded",
};

/**
 * Upload form for the Sources section: drop up to ten files at once, or choose
 * them. Unsupported types, oversized files and over-long batches get an
 * immediate per-file reason, and every rule is enforced again by the upload
 * route, so nothing reaches object storage that Edvance cannot read.
 *
 * Files go one per request — which keeps the route's per-file quota checks
 * exact — with a few in flight at a time. One file failing never cancels the
 * batch, and more files can be added while a batch is still running.
 */
export function AddMaterialForm({ courseId, onAdded }: { courseId: string; onAdded: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(0);
  // The File objects stay out of React state: they are browser handles, and an
  // entry only needs to point at one.
  const filesById = useRef(new Map<string, File>());
  // Guards against starting the same file twice when the pump effect re-runs.
  const inFlight = useRef(new Set<string>());

  const [batch, setBatch] = useState<BatchFile[]>([]);
  const [rejected, setRejected] = useState<{ name: string; reason: string }[]>([]);
  const [dragging, setDragging] = useState(false);

  function addFiles(chosen: File[]) {
    if (chosen.length === 0) return;
    const queued = batch.filter(
      (entry) => entry.state === "waiting" || entry.state === "uploading",
    ).length;
    const { accepted, rejected: refused } = validateUploadFiles(chosen, { alreadyQueued: queued });

    const additions: BatchFile[] = accepted.map((file) => {
      nextId.current += 1;
      const id = `upload-${nextId.current}`;
      filesById.current.set(id, file);
      return { id, name: file.name, size: file.size, state: "waiting", progress: 0, error: null };
    });

    if (additions.length > 0) setBatch((current) => [...current, ...additions]);
    setRejected(refused);
    // Let the same file be chosen again after it was refused.
    if (inputRef.current) inputRef.current.value = "";
  }

  // The pump: whoever can start, starts. Running after every change is what
  // keeps `UPLOAD_CONCURRENCY` files in flight until the batch drains.
  useEffect(() => {
    for (const id of startableIds(batch)) {
      if (inFlight.current.has(id)) continue;
      const file = filesById.current.get(id);
      if (!file) {
        setBatch((current) =>
          markFailed(current, id, "This file is no longer available. Choose it again."),
        );
        continue;
      }
      inFlight.current.add(id);
      setBatch((current) => markUploading(current, id));
      uploadMaterialWithProgress(courseId, file, (percent) =>
        setBatch((current) => markProgress(current, id, percent)),
      )
        .then(() => {
          filesById.current.delete(id);
          setBatch((current) => markDone(current, id));
          onAdded();
        })
        .catch((caught: unknown) => {
          const message =
            caught instanceof Error ? caught.message : "Could not upload the material.";
          setBatch((current) => markFailed(current, id, message));
        })
        .finally(() => {
          inFlight.current.delete(id);
        });
    }
  }, [batch, courseId, onAdded]);

  const summary: BatchSummary = summarise(batch);

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
          Edvance can read from them is extracted, so the next analysis has real evidence to work
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
                {entry.state === "failed" && entry.error && (
                  <p className="upload-error">{entry.error}</p>
                )}
              </li>
            ))}
          </ul>
          <p className="upload-summary" aria-live="polite">
            {summaryLine(summary)}
          </p>
          {!batch.some((entry) => entry.state === "waiting" || entry.state === "uploading") && (
            <div>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setBatch((current) => clearFinished(current));
                  setRejected([]);
                }}
              >
                Clear the list
              </button>
            </div>
          )}
        </>
      )}

      <p className="form-hint">Files are stored privately and linked to this course.</p>
    </form>
  );
}
