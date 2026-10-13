import {
  EMPTY_CONTENT_CODE,
  MaterialExtractionError,
  chunkBlocks,
  extensionOf,
  extractMaterial,
} from "@/lib/extraction";
import {
  completeIngestion,
  createIngestionJob,
  failIngestion,
  getMaterialIngestionSource,
  markIngestionProcessing,
  replaceMaterialChunks,
} from "@/lib/repo/courses";
import type { JobResult } from "@/lib/jobs/policy";
import type { WorkJob } from "@/lib/repo/jobs";
import { downloadObject } from "@/lib/supabase-storage";
import type { IngestionStatus } from "@/lib/types";

/**
 * Runs the extraction pipeline for one stored material:
 *
 *   create job → mark processing → download bytes → extract → chunk →
 *   store chunks → mark completed
 *
 * `ingestMaterial` is the work, and it still runs synchronously — which is what
 * the Sources "Retry extraction" action needs from it: press a button, get the
 * answer. What changed with the queue is *who calls it*: the upload route now
 * enqueues an `ingest` job instead of running this inside the request, and
 * `runIngestJob` below is that job's handler. The two entry points share one
 * implementation, so a retry and a queued run cannot drift apart.
 *
 * A failure never deletes the learner's uploaded file — it only records a safe
 * diagnostic. `errorCode` is what decides whether the queue tries again: a file
 * with no readable text will fail identically forever, while an unreachable
 * object store is very likely to work in a moment.
 */

export type IngestionOutcome =
  | { found: false }
  | {
      found: true;
      status: IngestionStatus;
      /** Set when `status` is "failed": a short code and a user-safe summary. */
      errorCode?: string;
      errorSummary?: string;
    };

/**
 * Maps any thrown error to a short code and a user-safe summary. Codes used
 * here are classified as permanent or retryable in `lib/jobs/policy.ts`.
 */
function safeFailure(error: unknown): { code: string; summary: string } {
  if (error instanceof MaterialExtractionError) {
    return { code: error.code, summary: error.message };
  }
  return {
    code: "extraction-failed",
    summary: "We couldn't read this material. The file was kept — you can retry.",
  };
}

export async function ingestMaterial(
  userId: string,
  materialId: string,
): Promise<IngestionOutcome> {
  const source = await getMaterialIngestionSource(userId, materialId);
  if (!source) return { found: false };

  const jobId = await createIngestionJob(materialId);
  await markIngestionProcessing(jobId);

  // Fetching the bytes is the one step here that can fail for reasons that have
  // nothing to do with the file, so it is classified on its own: a storage
  // outage is worth retrying, a document that cannot be parsed is not.
  let bytes: Buffer;
  try {
    bytes = await downloadObject(source.storageReference);
  } catch {
    const failure = {
      code: "storage-unavailable",
      summary:
        "Oyevolve could not reach its file storage. The file was kept and this will be tried again.",
    };
    console.error(`[ingestion] material ${materialId} failed: ${failure.code}`);
    await failIngestion(jobId, failure.code, failure.summary);
    return { found: true, status: "failed", ...failure };
  }

  try {
    const result = await extractMaterial(extensionOf(source.storageReference), bytes);
    const chunks = chunkBlocks(result.blocks);

    if (chunks.length === 0) {
      throw new MaterialExtractionError(
        EMPTY_CONTENT_CODE,
        "No readable text was found in this file.",
      );
    }

    await replaceMaterialChunks(
      materialId,
      chunks.map((chunk) => ({
        content: chunk.content,
        sourceLocation: chunk.location.label,
        metadata: chunk.metadata,
      })),
    );
    await completeIngestion(jobId, { ...result.metadata, chunks: chunks.length });
    return { found: true, status: "completed" };
  } catch (error) {
    const failure = safeFailure(error);
    // Log only the failure code and material id — never material contents or
    // provider secrets.
    console.error(`[ingestion] material ${materialId} failed: ${failure.code}`);
    await failIngestion(jobId, failure.code, failure.summary);
    return { found: true, status: "failed", ...failure };
  }
}

/**
 * The `ingest` job handler: read one material, and report honestly whether the
 * queue should try again.
 *
 * A material that has been removed is not a failure of the work — there is
 * simply nothing left to read — but it is permanent, because a retry would look
 * for the same missing row.
 */
export async function runIngestJob(job: WorkJob): Promise<JobResult> {
  if (!job.targetId) {
    return {
      ok: false,
      code: "material-missing",
      summary: "This step was queued without naming the file it should read.",
    };
  }

  const outcome = await ingestMaterial(job.userId, job.targetId);
  if (!outcome.found) {
    return {
      ok: false,
      code: "material-missing",
      summary: "That file is no longer in this course, so there is nothing left to read.",
    };
  }
  if (outcome.status === "completed") return { ok: true };

  return {
    ok: false,
    code: outcome.errorCode ?? "extraction-failed",
    summary: outcome.errorSummary ?? "We couldn't read this material. The file was kept.",
  };
}
