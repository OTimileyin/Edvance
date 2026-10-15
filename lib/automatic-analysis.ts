import type { AnalysisStatus, SourceItem } from "@/lib/types";

export type BatchReadiness = "waiting" | "ready" | "unreadable";

/** Whether every uploaded material has finished extraction and any evidence is usable. */
export function batchReadiness(materialIds: string[], sources: SourceItem[]): BatchReadiness {
  const byId = new Map(sources.map((source) => [source.id, source]));
  const materials = materialIds.map((id) => byId.get(id));
  if (materials.some((source) => !source)) return "waiting";

  const selected = materials as SourceItem[];
  if (
    selected.some(
      (source) =>
        source.queued ||
        !source.ingestion ||
        source.ingestion.status === "pending" ||
        source.ingestion.status === "processing",
    )
  ) {
    return "waiting";
  }

  return selected.some(
    (source) => source.ingestion?.status === "completed" && (source.ingestion.chunkCount ?? 0) > 0,
  )
    ? "ready"
    : "unreadable";
}

interface QueuedBatch {
  id: string;
  materialIds: string[];
}

type AutoAnalysisEvent = {
  courseId: string;
  state: "waiting" | "analysing" | "ready" | "failed";
  message: string;
};

const activeCourses = new Set<string>();
const volatileBatches = new Map<string, QueuedBatch[]>();
const storageKey = (courseId: string) => `oyevolve:auto-analysis:${courseId}`;
const POLL_INTERVAL_MS = 1_500;
const MAX_POLLS = 240;

function announce(event: AutoAnalysisEvent): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("oyevolve:auto-analysis", { detail: event }));
}

function readBatches(courseId: string): QueuedBatch[] {
  try {
    const value = sessionStorage.getItem(storageKey(courseId));
    if (!value) return volatileBatches.get(courseId) ?? [];
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter(
          (entry): entry is QueuedBatch =>
            typeof entry?.id === "string" &&
            Array.isArray(entry.materialIds) &&
            entry.materialIds.every((id: unknown) => typeof id === "string"),
        )
      : [];
  } catch {
    return volatileBatches.get(courseId) ?? [];
  }
}

function writeBatches(courseId: string, batches: QueuedBatch[]): void {
  try {
    if (batches.length === 0) sessionStorage.removeItem(storageKey(courseId));
    else sessionStorage.setItem(storageKey(courseId), JSON.stringify(batches));
    if (batches.length === 0) volatileBatches.delete(courseId);
  } catch {
    if (batches.length === 0) volatileBatches.delete(courseId);
    else volatileBatches.set(courseId, batches);
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchMaterials(
  courseId: string,
  materialIds: string[],
): Promise<{ materials: SourceItem[]; analysisStatus: AnalysisStatus | null } | null> {
  const query = new URLSearchParams({ ids: materialIds.join(",") });
  const response = await fetch(`/api/courses/${courseId}/materials/ingestion-status?${query}`, {
    cache: "no-store",
  });
  if (!response.ok) return null;
  const body = (await response.json()) as {
    materials?: SourceItem[];
    analysisStatus?: AnalysisStatus | null;
  };
  return body.materials
    ? { materials: body.materials, analysisStatus: body.analysisStatus ?? null }
    : null;
}

async function processBatch(courseId: string, batch: QueuedBatch): Promise<void> {
  announce({
    courseId,
    state: "waiting",
    message: "Your uploaded materials are being read before analysis starts.",
  });

  for (let attempt = 0; attempt < MAX_POLLS; attempt += 1) {
    try {
      const materials = await fetchMaterials(courseId, batch.materialIds);
      if (!materials) {
        await wait(POLL_INTERVAL_MS);
        continue;
      }
      const readiness = batchReadiness(batch.materialIds, materials.materials);
      if (readiness === "waiting") {
        await wait(POLL_INTERVAL_MS);
        continue;
      }
      if (readiness === "unreadable") {
        announce({
          courseId,
          state: "failed",
          message: "The uploaded materials had no readable evidence, so analysis did not run.",
        });
        return;
      }
      if (materials.analysisStatus === "analyzing") {
        announce({ courseId, state: "analysing", message: "Oyevolve is analysing your course." });
        await wait(POLL_INTERVAL_MS);
        continue;
      }
    } catch {
      await wait(POLL_INTERVAL_MS);
      continue;
    }

    announce({ courseId, state: "analysing", message: "Oyevolve is analysing your course." });
    let response: Response;
    try {
      response = await fetch(`/api/courses/${courseId}/analyse`, { method: "POST" });
    } catch {
      announce({
        courseId,
        state: "failed",
        message: "Could not reach the analysis service. Open Intelligence and try again.",
      });
      return;
    }

    if (response.ok) {
      announce({ courseId, state: "ready", message: "Analysis is ready in Intelligence." });
      return;
    }
    if (response.status === 409) {
      await wait(POLL_INTERVAL_MS);
      continue;
    }

    let message = "Automatic analysis did not finish. Open Intelligence to retry.";
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = `${body.error} Open Intelligence to retry.`;
    } catch {
      // Keep the safe fallback if the route did not return JSON.
    }
    announce({ courseId, state: "failed", message });
    return;
  }

  announce({
    courseId,
    state: "failed",
    message: "Reading the uploaded materials took too long. Open Intelligence to retry analysis.",
  });
}

/** Add one completed upload batch to the per-course queue and start its analysis. */
export function queueAutomaticAnalysis(courseId: string, materialIds: string[]): void {
  const ids = [...new Set(materialIds)];
  if (ids.length === 0) return;

  const batches = readBatches(courseId);
  batches.push({ id: crypto.randomUUID(), materialIds: ids });
  writeBatches(courseId, batches);
  void resumeAutomaticAnalysis(courseId);
}

/** Resume a batch after navigation or a refresh of the course workspace. */
export async function resumeAutomaticAnalysis(courseId: string): Promise<void> {
  if (activeCourses.has(courseId)) return;
  activeCourses.add(courseId);
  try {
    while (true) {
      const batches = readBatches(courseId);
      const batch = batches[0];
      if (!batch) return;

      await processBatch(courseId, batch);
      writeBatches(
        courseId,
        readBatches(courseId).filter((queued) => queued.id !== batch.id),
      );
    }
  } finally {
    activeCourses.delete(courseId);
  }
}
