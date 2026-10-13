/**
 * The device-local copy of a batch that has not finished uploading.
 *
 * A learner drops five files, three start, and they navigate away or reload
 * before the other two are sent. Without this module those two files are gone
 * without a word: the browser held them, and the browser forgot them. So the
 * bytes are kept here instead, in their own Cache Storage bucket, and the batch
 * is put back together on the next visit.
 *
 * Why the Cache API rather than localStorage or IndexedDB: this is where the
 * repository already keeps learner-controlled local copies (`lib/offline-revision.ts`),
 * it stores real `Blob`s without base64 inflation, and the service worker leaves
 * every cache that is not `oyevolve-shell-*` alone.
 *
 * What is stored, per course: a manifest of files with the state each one was in,
 * and one entry per file holding its bytes. Nothing else — no tokens, no signed
 * URLs, no upload URLs, no response bodies.
 *
 * Failure is honest and never silent: if the device will not keep a file (a full
 * quota, a browser without the API), `rememberUpload` returns false and the form
 * tells the learner that this file would be lost if they leave the page. It is
 * never pretended that a file is safe when it is not.
 */

/** The bucket, deliberately outside the service worker's `oyevolve-shell-*` rotation. */
const CACHE_NAME = "oyevolve-uploads-v1";
const MANIFEST_PREFIX = "/queued-uploads/";
const BODY_PREFIX = "/queued-upload-body/";

/** One file the batch is still holding, as the device remembers it. */
export interface QueuedUploadRecord {
  id: string;
  name: string;
  size: number;
  /** The file's MIME type, so a restored `File` is the same file. */
  type: string;
  /** `queued` never started; `sending` had a request in flight; `failed` finished badly. */
  state: "queued" | "sending" | "failed";
  /** The reason recorded when the file failed before the page went away. */
  error?: string | null;
  /** When the file was chosen (epoch ms), so a restored batch keeps its order. */
  queuedAt: number;
}

export interface QueuedUpload {
  record: QueuedUploadRecord;
  blob: Blob;
}

function supported(): boolean {
  return typeof window !== "undefined" && "caches" in window;
}

/**
 * Every manifest change is a read-modify-write, and a batch does several at
 * once: three files start together, or finish together. Without this queue they
 * would each write back a manifest read before the others changed it, and lose
 * those changes — a file whose "sending" flip was lost would be resent after a
 * reload, and one whose removal was lost would come back as a ghost row. So the
 * writes are serialised in the order they were asked for. Reads are not queued:
 * a Cache Storage read is atomic on its own.
 */
let pendingWrite: Promise<unknown> = Promise.resolve();

function serialise<T>(operation: () => Promise<T>): Promise<T> {
  const next = pendingWrite.then(operation, operation);
  pendingWrite = next.catch(() => undefined);
  return next;
}

function manifestKey(courseId: string): string {
  return MANIFEST_PREFIX + courseId;
}

function bodyKey(courseId: string, id: string): string {
  return `${BODY_PREFIX}${courseId}/${id}`;
}

async function readManifest(cache: Cache, courseId: string): Promise<QueuedUploadRecord[]> {
  const response = await cache.match(manifestKey(courseId));
  if (!response) return [];
  try {
    const parsed = (await response.json()) as unknown;
    return Array.isArray(parsed) ? (parsed as QueuedUploadRecord[]) : [];
  } catch {
    // A damaged manifest is not worth guessing at.
    return [];
  }
}

async function writeManifest(
  cache: Cache,
  courseId: string,
  records: QueuedUploadRecord[],
): Promise<void> {
  if (records.length === 0) {
    await cache.delete(manifestKey(courseId));
    return;
  }
  await cache.put(
    manifestKey(courseId),
    new Response(JSON.stringify(records), { headers: { "content-type": "application/json" } }),
  );
}

/**
 * Remembers one chosen file, with the bytes, before it is sent.
 *
 * Returns false when the device would not keep it. The caller must not claim the
 * file is safe in that case.
 */
export function rememberUpload(
  courseId: string,
  record: QueuedUploadRecord,
  blob: Blob,
): Promise<boolean> {
  if (!supported()) return Promise.resolve(false);
  return serialise(() => writeUpload(courseId, record, blob));
}

async function writeUpload(
  courseId: string,
  record: QueuedUploadRecord,
  blob: Blob,
): Promise<boolean> {
  try {
    const cache = await caches.open(CACHE_NAME);
    const records = await readManifest(cache, courseId);

    // A file the learner chose twice in one session replaces its earlier entry
    // rather than queueing behind it.
    const without = records.filter((entry) => entry.id !== record.id);
    try {
      await cache.put(
        bodyKey(courseId, record.id),
        new Response(blob, { headers: { "content-type": record.type } }),
      );
    } catch {
      // The bytes did not fit: nothing is recorded, so nothing is promised.
      return false;
    }
    try {
      await writeManifest(cache, courseId, [...without, record]);
    } catch {
      // The manifest is what makes a file resumable, so a file without one is
      // not remembered at all — and its orphaned bytes are dropped here.
      await cache.delete(bodyKey(courseId, record.id)).catch(() => undefined);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Records that a file's state changed — that its request has started, or that it
 * failed — without touching its bytes. A no-op when the file was never
 * remembered, so a full-quota batch keeps working for this visit.
 */
export function updateQueuedUpload(
  courseId: string,
  id: string,
  patch: { state: QueuedUploadRecord["state"]; error?: string | null },
): Promise<void> {
  if (!supported()) return Promise.resolve();
  return serialise(() => writeState(courseId, id, patch));
}

async function writeState(
  courseId: string,
  id: string,
  patch: { state: QueuedUploadRecord["state"]; error?: string | null },
): Promise<void> {
  try {
    const cache = await caches.open(CACHE_NAME);
    const records = await readManifest(cache, courseId);
    if (!records.some((entry) => entry.id === id)) return;
    await writeManifest(
      cache,
      courseId,
      records.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    );
  } catch {
    // Losing a state change only means the entry keeps its previous state; the
    // file itself is still remembered.
  }
}

/**
 * Forgets files the batch is finished with: they were stored, or the learner
 * discarded them. The service worker never touches this bucket, so this is the
 * only thing that removes a file from the device.
 */
export function forgetUploads(courseId: string, ids: string[]): Promise<void> {
  if (!supported() || ids.length === 0) return Promise.resolve();
  return serialise(() => removeUploads(courseId, ids));
}

async function removeUploads(courseId: string, ids: string[]): Promise<void> {
  try {
    const cache = await caches.open(CACHE_NAME);
    const records = await readManifest(cache, courseId);
    const forgotten = new Set(ids);
    await Promise.all(ids.map((id) => cache.delete(bodyKey(courseId, id)).catch(() => undefined)));
    await writeManifest(
      cache,
      courseId,
      records.filter((entry) => !forgotten.has(entry.id)),
    );
  } catch {
    // Best effort: a file that stays remembered is offered again, which is the
    // safe direction to fail in.
  }
}

/**
 * Everything the device is still holding for this course, in the order the files
 * were chosen.
 *
 * A manifest entry whose bytes are missing is dropped: a row that cannot be
 * resumed and cannot be inspected would be a worse answer than not showing it.
 */
export async function loadQueue(courseId: string): Promise<QueuedUpload[]> {
  if (!supported()) return [];
  try {
    const cache = await caches.open(CACHE_NAME);
    const records = await readManifest(cache, courseId);
    if (records.length === 0) return [];

    const found: QueuedUpload[] = [];
    const missing: string[] = [];
    for (const record of [...records].sort((a, b) => a.queuedAt - b.queuedAt)) {
      const response = await cache.match(bodyKey(courseId, record.id));
      if (!response) {
        missing.push(record.id);
        continue;
      }
      found.push({ record, blob: await response.blob() });
    }
    if (missing.length > 0) await forgetUploads(courseId, missing);
    return found;
  } catch {
    return [];
  }
}
