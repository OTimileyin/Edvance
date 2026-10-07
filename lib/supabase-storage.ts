import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { optionalEnv } from "./env";

/**
 * Server-only Supabase Storage client.
 *
 * Edvance uses Supabase **only** for private object storage. The project keeps
 * PostgreSQL as its database and Better Auth as its authentication system;
 * nothing here touches Supabase Auth or the database. Supabase's own docs and
 * the official server-side guide treat the storage API as the single operation
 * needed, so this module wraps exactly that.
 *
 * The `SUPABASE_SECRET_KEY` is a server secret: it must never be prefixed with
 * `NEXT_PUBLIC_`, imported by a component, or returned to the browser. This
 * module is only ever imported by route handlers.
 *
 * Every function throws a plain `Error` with a user-safe message; callers turn
 * that into an HTTP response. Provider detail is logged on the server only.
 */

export type SupabaseStorageConfig = {
  url: string;
  secretKey: string;
  bucket: string;
};

/** Reads the storage configuration, or null when any of the three names is unset. */
export function supabaseStorageConfig(): SupabaseStorageConfig | null {
  const url = optionalEnv("SUPABASE_URL");
  const secretKey = optionalEnv("SUPABASE_SECRET_KEY");
  const bucket = optionalEnv("SUPABASE_STORAGE_BUCKET");
  if (!url || !secretKey || !bucket) return null;
  return { url, secretKey, bucket };
}

export function isStorageConfigured(): boolean {
  return supabaseStorageConfig() !== null;
}

let cachedClient: SupabaseClient | null = null;

/**
 * A memoised server client. Session persistence and token refresh are disabled:
 * this client authenticates with the secret key on every request and holds no
 * user session, so it must not read or write cookies.
 */
function client(): SupabaseClient {
  const config = supabaseStorageConfig();
  if (!config) {
    throw new Error(
      "Object storage is not configured. Add SUPABASE_URL, SUPABASE_SECRET_KEY and " +
        "SUPABASE_STORAGE_BUCKET to the Infisical dev environment (see README, " +
        "Secrets (Infisical)), then restart the server.",
    );
  }
  if (!cachedClient) {
    cachedClient = createClient(config.url, config.secretKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return cachedClient;
}

function bucket(): string {
  const config = supabaseStorageConfig();
  if (!config) throw new Error("Object storage is not configured.");
  return config.bucket;
}

/** Logs a sanitized diagnostic server-side; never surfaces provider bodies. */
function logFailure(operation: string, key: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[storage] ${operation} ${key} failed: ${message}`);
}

/** Uploads bytes under `key` with the server-derived content type. Throws on failure. */
export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  const { error } = await client()
    .storage.from(bucket())
    .upload(key, body, { contentType, upsert: false });

  if (error) {
    logFailure("put", key, error);
    throw new Error("File storage is temporarily unavailable. Please try again.");
  }
}

/** Removes an object. Idempotent at the provider; throws only on a real failure. */
export async function deleteObject(key: string): Promise<void> {
  const { error } = await client().storage.from(bucket()).remove([key]);
  if (error) {
    logFailure("delete", key, error);
    throw new Error("File storage could not remove the object.");
  }
}

/**
 * Downloads an object's bytes for server-side processing (text extraction).
 * The bucket stays private: nothing is exposed to the browser here.
 */
export async function downloadObject(key: string): Promise<Buffer> {
  const { data, error } = await client().storage.from(bucket()).download(key);

  if (error || !data) {
    logFailure("download", key, error ?? new Error("no object returned"));
    throw new Error("File storage is temporarily unavailable. Please try again.");
  }
  return Buffer.from(await data.arrayBuffer());
}

/**
 * Mints a short-lived signed URL for a private object. The bucket stays private;
 * only someone holding the signed URL for its lifetime can read the file. The
 * URL (and its token) is never logged.
 */
export async function createDownloadUrl(key: string, expiresInSeconds = 300): Promise<string> {
  const { data, error } = await client()
    .storage.from(bucket())
    .createSignedUrl(key, expiresInSeconds);

  if (error || !data?.signedUrl) {
    logFailure("sign", key, error ?? new Error("no signed URL returned"));
    throw new Error("File storage is temporarily unavailable. Please try again.");
  }
  return data.signedUrl;
}
