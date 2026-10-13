// A local stand-in for Supabase Storage, used by the end-to-end suite.
//
// The drop path is only proved end to end if the bytes actually leave the
// request and come back: `putObject` → `createMaterial` → ingestion downloads
// the object and extracts text from it. That needs a storage provider, and CI
// has no cloud credentials. Rather than keep the object store empty with no
// credentials, the suite points the app at this process, which implements
// exactly the four operations `lib/supabase-storage.ts` performs — upload,
// download, remove and signed URL — and nothing else.
//
// What is real here: the browser, the form, the route handler, the ownership
// checks, the database, the extraction pipeline and the delete-on-remove path.
// What is faked: the third-party object store. Point the app at the real
// provider instead with `E2E_STORAGE=real` to check the provider itself.
//
// Objects live in memory for the lifetime of the run, and two read-only
// endpoints let a spec assert what a learner cannot see:
//
//   GET /__health   → { status, objects }
//   GET /__objects  → { objects: [{ key, size, contentType }] }
//   POST /__reject?key=<substring>&where=upload|download&count=<n>
//                                   → work whose key contains that substring is
//                                     refused, `count` times (default 1)
//   DELETE /__reject                → clears both
//
// The keys are the app's own (owner-scoped) keys, so a spec can also prove that
// one learner's file is stored under their course and nowhere else.

import { createServer } from "node:http";

const PORT = Number(process.env.E2E_STORAGE_PORT ?? 3410);
const PREFIX = "/storage/v1/object/";

/**
 * How long an upload takes, before anything is stored.
 *
 * Real uploads take seconds, and that is the window the batch's survival
 * depends on: a learner reloads, or leaves the tab, while files are in flight.
 * With an instant double every upload would finish before a test could reload,
 * so the resume specs would have nothing to interrupt. The delay is spent before
 * the bytes are kept, which is also the honest model of an upload that never
 * arrives: a request abandoned in transit stores nothing.
 */
const DELAY_MS = Number(process.env.E2E_STORAGE_DELAY_MS ?? 0);

/**
 * How much longer a refused upload takes than an accepted one.
 *
 * A spec arms a refusal before dropping its files, and needs the refusal to
 * arrive after the page has gone — otherwise the browser would see the failure
 * and label the file "not uploaded", and the state being tested (a file whose
 * fate the page could not learn) would not exist. The allowance is generous
 * because the alternative is a test that passes for the wrong reason.
 */
const REFUSAL_GRACE_MS = 1500;

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The key substring of the next upload that must not arrive, or null.
 *
 * This is what makes "an interrupted file that really did not arrive" a state a
 * spec can produce on purpose, instead of one it has to hope for: a learner who
 * chooses Retry has to be able to fix exactly that file.
 */
let refuseNext = null;

/**
 * The same for reads: an object the app cannot fetch for the next `n` attempts.
 *
 * This is what makes a *transient* background failure something a spec can
 * produce — a job that fails, is retried by the queue, and succeeds without a
 * learner pressing anything. Refusing twice widens the window in which the
 * honest "failed, a retry is queued" state is visible, so a spec can assert it
 * rather than racing it.
 */
let refuseRead = null;
let refuseReadTimes = 0;

/** key → { body, contentType } */
const objects = new Map();

function sendJson(response, status, value) {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(body),
  });
  response.end(body);
}

/**
 * The request body, or null when the caller went away before sending all of it.
 *
 * An abandoned upload never ends, so waiting for `end` alone would hold this
 * request — and its handler — for as long as the process lives. This suite
 * abandons uploads on purpose (that is what the resume specs are about), so the
 * honest model is the one the real world has: a request that does not finish
 * stores nothing. Nothing here rejects: a rejection out of an `async` handler is
 * not awaited by the HTTP server, and an uncaught one ends the process.
 */
function readBody(request) {
  return new Promise((resolve) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("aborted", () => resolve(null));
    request.on("error", () => resolve(null));
  });
}

function sendObject(response, key) {
  if (refuseRead && refuseReadTimes > 0 && key.includes(refuseRead)) {
    refuseReadTimes -= 1;
    console.log(`refused read of ${key} (${refuseReadTimes} refusal(s) left)`);
    sendJson(response, 502, {
      statusCode: "502",
      error: "InternalError",
      message: "The object store did not return the object.",
    });
    return;
  }

  const object = objects.get(key);
  if (!object) {
    // The shape supabase-js expects from a missing object.
    sendJson(response, 404, {
      statusCode: "404",
      error: "not_found",
      message: "Object not found",
    });
    return;
  }
  response.writeHead(200, {
    "content-type": object.contentType,
    "content-length": object.body.length,
  });
  response.end(object.body);
}

const server = createServer((request, response) => {
  // A learner abandoning an upload is normal here — half these specs are built
  // on it — and Node surfaces that as a rejected promise out of an `async`
  // handler, which nothing awaits. Left unhandled it took the whole double down
  // in the middle of a run, which is indistinguishable from a real outage and
  // sends every later upload and read in the suite to a dead port.
  handle(request, response).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`request failed: ${message}`);
    if (!response.headersSent) {
      sendJson(response, 500, { statusCode: "500", message: "The double could not answer." });
      return;
    }
    response.destroy();
  });
  request.on("error", () => undefined);
  response.on("error", () => undefined);
});

async function handle(request, response) {
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${PORT}`);
  const path = decodeURIComponent(url.pathname);
  console.log(`${request.method} ${path}`);

  // The suite's own window into the store; never part of the storage API.
  if (path === "/__health") {
    sendJson(response, 200, { status: "ok", objects: objects.size });
    return;
  }
  if (path === "/__objects") {
    sendJson(response, 200, {
      objects: [...objects].map(([key, object]) => ({
        key,
        size: object.body.length,
        contentType: object.contentType,
      })),
    });
    return;
  }
  if (path === "/__reject") {
    if (request.method === "DELETE") {
      refuseNext = null;
      refuseRead = null;
      refuseReadTimes = 0;
    } else {
      const key = url.searchParams.get("key") || null;
      const count = Math.max(1, Number(url.searchParams.get("count") ?? 1));
      if (url.searchParams.get("where") === "download") {
        refuseRead = key;
        refuseReadTimes = count;
      } else {
        refuseNext = key;
      }
    }
    sendJson(response, 200, {
      refusingUpload: refuseNext,
      refusingRead: refuseRead,
      times: refuseReadTimes,
    });
    return;
  }

  if (!path.startsWith(PREFIX)) {
    sendJson(response, 404, { statusCode: "404", message: "Not a storage route." });
    return;
  }

  const segments = path.slice(PREFIX.length).split("/");
  const method = request.method ?? "GET";

  // A signed URL is minted by a POST and then read by the browser.
  if (segments[0] === "sign") {
    if (method === "POST") {
      await readBody(request);
      const signed = segments.slice(1).join("/"); // bucket/key
      sendJson(response, 200, { signedURL: `/object/sign/${signed}?token=stub-token` });
      return;
    }
    // Reading a signed URL: the bucket is part of the path, the key is not.
    sendObject(response, segments.slice(2).join("/"));
    return;
  }

  // Upload: POST (or PUT when replacing) /object/{bucket}/{key}.
  if (method === "POST" || method === "PUT") {
    const body = await readBody(request);
    if (DELAY_MS > 0) await pause(DELAY_MS);
    if (!body) {
      // The upload did not finish arriving, so there is nothing to keep. This is
      // the state an interrupted upload leaves behind on a real provider too.
      sendJson(response, 400, { statusCode: "400", message: "The upload did not finish." });
      return;
    }
    const [bucket, ...rest] = segments;
    const key = rest.join("/");
    if (!bucket || !key) {
      sendJson(response, 400, { statusCode: "400", message: "An object key is required." });
      return;
    }
    // Claimed rather than merely tested, so a refusal is spent by the first
    // attempt: the learner's Retry has to be able to succeed.
    if (refuseNext && key.includes(refuseNext)) {
      refuseNext = null;
      await pause(REFUSAL_GRACE_MS);
      console.log(`refused ${key}`);
      sendJson(response, 502, {
        statusCode: "502",
        error: "InternalError",
        message: "The object store did not keep the upload.",
      });
      return;
    }
    objects.set(key, {
      body,
      contentType: request.headers["content-type"] ?? "application/octet-stream",
    });
    sendJson(response, 200, { Id: key, Key: `${bucket}/${key}` });
    return;
  }

  // Remove: DELETE /object/{bucket} with { prefixes: [...] }.
  if (method === "DELETE") {
    const body = await readBody(request);
    let prefixes = [];
    try {
      const parsed = JSON.parse(body?.toString("utf8") ?? "");
      if (Array.isArray(parsed?.prefixes)) prefixes = parsed.prefixes;
    } catch {
      // A malformed body removes nothing, exactly as the provider would.
    }
    for (const prefix of prefixes) objects.delete(prefix);
    sendJson(response, 200, { message: "Successfully deleted" });
    return;
  }

  // Download: GET /object/{bucket}/{key} (or its signed equivalent above).
  const key = segments.slice(1).join("/");
  sendObject(response, key);
}

server.listen(PORT, "127.0.0.1", () => {
  console.log(`e2e storage double listening on http://127.0.0.1:${PORT}`);
});
