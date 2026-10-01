import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { isAiConfigured } from "@/lib/ai/gemini";
import { isStorageConfigured } from "@/lib/supabase-storage";
import { isEmailConfigured } from "@/lib/email";

/**
 * A liveness and readiness probe.
 *
 * It reports the database as the one hard dependency (a failure is a 503), and
 * the optional integrations as *configured or not* rather than pretending they
 * work. It never returns secrets, counts, or contents.
 */
export async function GET() {
  let database = "ok";
  try {
    await pool.query("select 1");
  } catch {
    database = "error";
  }

  const healthy = database === "ok";
  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      database,
      integrations: {
        ai: isAiConfigured() ? "configured" : "not-configured",
        storage: isStorageConfigured() ? "configured" : "not-configured",
        email: isEmailConfigured() ? "configured" : "not-configured",
      },
      time: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503, headers: { "cache-control": "no-store" } },
  );
}
