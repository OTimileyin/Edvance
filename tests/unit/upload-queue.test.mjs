import { test } from "node:test";
import assert from "node:assert/strict";

import {
  forgetUploads,
  loadQueue,
  rememberUpload,
  updateQueuedUpload,
} from "../../lib/upload-queue.ts";

/**
 * The queue's job is to keep the files a batch has not sent yet, so what matters
 * here is exactly what it promises: the bytes come back, the states are kept, a
 * file the device refuses to keep is never recorded as resumable, and a manifest
 * entry whose bytes have gone is not shown as a row that cannot be resumed.
 *
 * Cache Storage is not in Node, so a small fake stands in — the module only ever
 * calls `open`, `put`, `match` and `delete` on it, with real `Response` objects.
 */

class FakeCache {
  constructor() {
    this.entries = new Map();
  }

  async put(key, response) {
    this.entries.set(String(key), response);
  }

  async match(key) {
    // Cache Storage hands back a readable copy on every match — the same entry
    // can be read more than once, which is what a manifest rewrite relies on.
    const stored = this.entries.get(String(key));
    return stored ? stored.clone() : undefined;
  }

  async delete(key) {
    return this.entries.delete(String(key));
  }
}

class FakeCacheStorage {
  constructor() {
    this.caches = new Map();
    /** Return true to make a write fail, as a full quota would. */
    this.rejects = () => false;
  }

  async open(name) {
    if (!this.caches.has(name)) this.caches.set(name, new FakeCache());
    return this.caches.get(name);
  }

  async keys() {
    return [...this.caches.keys()];
  }

  async delete(name) {
    return this.caches.delete(name);
  }
}

const CAUSE_QUOTA = "QuotaExceededError";

/** Installs a fake Cache Storage, runs the body, then removes it again. */
async function withCaches(storage, body) {
  globalThis.caches = {
    open: async (name) => {
      const cache = await storage.open(name);
      // A write the "device" refuses: the underlying cache is wrapped so a
      // failing put throws the way a browser would.
      return {
        put: async (key, response) => {
          if (storage.rejects(String(key))) throw new Error(CAUSE_QUOTA);
          return cache.put(key, response);
        },
        match: (key) => cache.match(key),
        delete: (key) => cache.delete(key),
      };
    },
  };
  globalThis.window = globalThis;
  try {
    await body(storage);
  } finally {
    delete globalThis.caches;
    delete globalThis.window;
  }
}

function record(overrides = {}) {
  return {
    id: "upload-1",
    name: "notes.md",
    size: 12,
    type: "text/markdown",
    state: "queued",
    error: null,
    queuedAt: 1_000,
    ...overrides,
  };
}

const blobFor = (text, type = "text/markdown") => new Blob([text], { type });

/** Every key the fake storage is holding, so a test can prove bytes were written or dropped. */
function keysOf(storage) {
  const keys = [];
  for (const cache of storage.caches.values()) keys.push(...cache.entries.keys());
  return keys;
}

test("a remembered file comes back with its bytes and its state", async () => {
  const storage = new FakeCacheStorage();
  await withCaches(storage, async () => {
    assert.equal(await rememberUpload("course-1", record(), blobFor("hello")), true);

    const [queued] = await loadQueue("course-1");
    assert.equal(queued.record.name, "notes.md");
    assert.equal(queued.record.state, "queued");
    assert.equal(await queued.blob.text(), "hello", "the bytes are the file, not a placeholder");
    assert.equal(queued.blob.type, "text/markdown");
  });
});

test("files come back in the order they were chosen", async () => {
  const storage = new FakeCacheStorage();
  await withCaches(storage, async () => {
    await rememberUpload(
      "course-1",
      record({ id: "b", name: "second.md", queuedAt: 2_000 }),
      blobFor("b"),
    );
    await rememberUpload(
      "course-1",
      record({ id: "a", name: "first.md", queuedAt: 1_000 }),
      blobFor("a"),
    );

    assert.deepEqual(
      (await loadQueue("course-1")).map((entry) => entry.record.name),
      ["first.md", "second.md"],
    );
  });
});

test("a state change is recorded without touching the bytes", async () => {
  const storage = new FakeCacheStorage();
  await withCaches(storage, async () => {
    await rememberUpload("course-1", record(), blobFor("hello"));

    await updateQueuedUpload("course-1", "upload-1", { state: "sending" });
    assert.equal((await loadQueue("course-1"))[0].record.state, "sending");

    await updateQueuedUpload("course-1", "upload-1", {
      state: "failed",
      error: "That file is empty.",
    });
    const [queued] = await loadQueue("course-1");
    assert.equal(queued.record.state, "failed");
    assert.equal(queued.record.error, "That file is empty.");
    assert.equal(await queued.blob.text(), "hello", "the file is still there after it failed");
  });
});

test("a state change for a file the device never kept changes nothing", async () => {
  const storage = new FakeCacheStorage();
  await withCaches(storage, async () => {
    await updateQueuedUpload("course-1", "ghost", { state: "sending" });
    await updateQueuedUpload("course-1", "ghost", { state: "failed", error: "no" });
    assert.deepEqual(await loadQueue("course-1"), [], "nothing may appear that was never stored");
  });
});

test("forgetting a file removes both its row and its bytes", async () => {
  const storage = new FakeCacheStorage();
  await withCaches(storage, async () => {
    await rememberUpload("course-1", record(), blobFor("hello"));
    await forgetUploads("course-1", ["upload-1"]);

    assert.deepEqual(await loadQueue("course-1"), []);
    assert.deepEqual(keysOf(storage), [], "the blob is gone, not merely hidden");
  });
});

test("forgetting one file leaves the others alone", async () => {
  const storage = new FakeCacheStorage();
  await withCaches(storage, async () => {
    await rememberUpload("course-1", record({ id: "a", name: "a.md" }), blobFor("a"));
    await rememberUpload("course-1", record({ id: "b", name: "b.md" }), blobFor("b"));
    await forgetUploads("course-1", ["a"]);

    const remaining = await loadQueue("course-1");
    assert.deepEqual(
      remaining.map((entry) => entry.record.name),
      ["b.md"],
    );
    assert.equal(await remaining[0].blob.text(), "b");
  });
});

test("a file the device refuses to keep is not recorded as resumable", async () => {
  const storage = new FakeCacheStorage();
  await withCaches(storage, async () => {
    storage.rejects = (key) => key.startsWith("/queued-upload-body/");

    assert.equal(
      await rememberUpload("course-1", record(), blobFor("hello")),
      false,
      "the caller must be told, so it can say the file would not survive a reload",
    );
    assert.deepEqual(await loadQueue("course-1"), []);
    assert.deepEqual(keysOf(storage), [], "no half-written entry is left behind");
  });
});

test("a manifest that cannot be written leaves no orphaned bytes", async () => {
  const storage = new FakeCacheStorage();
  await withCaches(storage, async () => {
    storage.rejects = (key) => key.startsWith("/queued-uploads/");

    assert.equal(await rememberUpload("course-1", record(), blobFor("hello")), false);
    assert.deepEqual(keysOf(storage), [], "bytes without a manifest row can never be resumed");
  });
});

test("an entry whose bytes have gone is not shown, and is dropped for good", async () => {
  const storage = new FakeCacheStorage();
  await withCaches(storage, async () => {
    await rememberUpload("course-1", record({ id: "a", name: "a.md" }), blobFor("a"));
    await rememberUpload(
      "course-1",
      record({ id: "b", name: "b.md", queuedAt: 2_000 }),
      blobFor("b"),
    );

    // Something else cleared the bytes (a browser eviction, another tab).
    const cache = storage.caches.get("oyevolve-uploads-v1");
    cache.entries.delete("/queued-upload-body/course-1/a");

    const queued = await loadQueue("course-1");
    assert.deepEqual(
      queued.map((entry) => entry.record.name),
      ["b.md"],
      "a row that cannot be resumed and cannot be inspected is worse than no row",
    );
    assert.deepEqual(
      (await loadQueue("course-1")).map((entry) => entry.record.name),
      ["b.md"],
      "and it stays gone on the next visit",
    );
  });
});

test("changes made at the same moment do not overwrite each other", async () => {
  const storage = new FakeCacheStorage();
  await withCaches(storage, async () => {
    for (const [index, id] of ["a", "b", "c"].entries()) {
      await rememberUpload(
        "course-1",
        record({ id, name: `${id}.md`, queuedAt: 1_000 + index }),
        blobFor(id),
      );
    }

    // Three files start together. Each change rewrites the manifest, so a
    // read-modify-write race would keep only the last one and leave the other
    // two marked "queued" — and a file marked "queued" is resent after a reload.
    await Promise.all([
      updateQueuedUpload("course-1", "a", { state: "sending" }),
      updateQueuedUpload("course-1", "b", { state: "sending" }),
      updateQueuedUpload("course-1", "c", { state: "sending" }),
    ]);
    assert.deepEqual(
      (await loadQueue("course-1")).map((entry) => entry.record.state),
      ["sending", "sending", "sending"],
    );

    // And three files finishing together remove exactly those three, leaving
    // no ghosts behind.
    await Promise.all([
      forgetUploads("course-1", ["a"]),
      forgetUploads("course-1", ["b"]),
      forgetUploads("course-1", ["c"]),
    ]);
    assert.deepEqual(await loadQueue("course-1"), []);
    assert.deepEqual(keysOf(storage), [], "every blob went with its row");
  });
});

test("a damaged manifest is ignored rather than guessed at", async () => {
  const storage = new FakeCacheStorage();
  await withCaches(storage, async () => {
    const cache = await storage.open("oyevolve-uploads-v1");
    await cache.put("/queued-uploads/course-1", new Response("{not json"));
    assert.deepEqual(await loadQueue("course-1"), []);
  });
});

test("each course has its own queue", async () => {
  const storage = new FakeCacheStorage();
  await withCaches(storage, async () => {
    await rememberUpload("course-1", record({ id: "a", name: "a.md" }), blobFor("a"));
    await rememberUpload("course-2", record({ id: "b", name: "b.md" }), blobFor("b"));

    assert.deepEqual(
      (await loadQueue("course-1")).map((entry) => entry.record.name),
      ["a.md"],
    );
    assert.deepEqual(
      (await loadQueue("course-2")).map((entry) => entry.record.name),
      ["b.md"],
    );
  });
});

test("without a Cache API every call is a safe no-op", async () => {
  // Server rendering, or a browser that has no Cache Storage: nothing may throw,
  // and the caller is told the file was not kept.
  assert.equal(await rememberUpload("course-1", record(), blobFor("hello")), false);
  await updateQueuedUpload("course-1", "upload-1", { state: "sending" });
  await forgetUploads("course-1", ["upload-1"]);
  assert.deepEqual(await loadQueue("course-1"), []);
});
