"use client";

import { useRef, useState } from "react";
import { uploadMaterial } from "@/lib/useCourses";
import {
  MAX_MATERIAL_BYTES,
  acceptedExtensions,
  acceptedKindLabels,
  formatBytes,
  materialKindFor,
} from "@/lib/materials";

/**
 * Upload form for the Sources section. Unsupported types and oversized files
 * are caught here for immediate feedback, and the same rules are enforced again
 * by the upload route so an unsupported file never reaches object storage.
 */
export function AddMaterialForm({
  courseId,
  onAdded,
}: {
  courseId: string;
  onAdded: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function choose(next: File | null) {
    if (!next) {
      setFile(null);
      return;
    }
    if (!materialKindFor(next.name)) {
      setFile(null);
      setError(
        `“${next.name}” isn’t a supported material yet. Accepted formats: ${acceptedKindLabels()}.`,
      );
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (next.size > MAX_MATERIAL_BYTES) {
      setFile(null);
      setError(
        `“${next.name}” is ${formatBytes(next.size)}. The limit is ${formatBytes(
          MAX_MATERIAL_BYTES,
        )}.`,
      );
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setError(null);
    setFile(next);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    setUploading(true);
    try {
      await uploadMaterial(courseId, file);
      setFile(null);
      setError(null);
      if (inputRef.current) inputRef.current.value = "";
      onAdded();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not upload the material.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="field">
        <label className="field-label" htmlFor="material-file">
          Course material
        </label>
        <input
          ref={inputRef}
          id="material-file"
          className="input file-input"
          type="file"
          accept={acceptedExtensions()}
          onChange={(event) => choose(event.target.files?.[0] ?? null)}
        />
        <p className="form-hint">
          {acceptedKindLabels()}. Up to {formatBytes(MAX_MATERIAL_BYTES)} per file.
        </p>
      </div>
      {file && (
        <p className="form-hint" aria-live="polite">
          Ready to upload: <strong>{file.name}</strong> ({formatBytes(file.size)})
        </p>
      )}
      {error && (
        <p role="alert" className="alert alert-warning">
          {error}
        </p>
      )}
      <div>
        <button type="submit" className="btn btn-primary" disabled={uploading || !file}>
          {uploading ? "Uploading…" : "Upload material"}
        </button>
      </div>
      <p className="form-hint">Files are stored privately and linked to this course.</p>
    </form>
  );
}
