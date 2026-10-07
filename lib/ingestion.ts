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
import { downloadObject } from "@/lib/supabase-storage";
import type { IngestionStatus } from "@/lib/types";

/**
 * Runs the extraction pipeline for one stored material:
 *
 *   create job → mark processing → download bytes → extract → chunk →
 *   store chunks → mark completed
 *
 * It is synchronous by design: for a local prototype this keeps the Sources UI
 * truthful without a background-job platform. A failure never deletes the
 * learner's uploaded file — it only records a safe diagnostic on the job.
 */

export type IngestionOutcome = { found: false } | { found: true; status: IngestionStatus };

/** Maps any thrown error to a short code and a user-safe summary. */
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

  try {
    const bytes = await downloadObject(source.storageReference);
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
    return { found: true, status: "failed" };
  }
}
