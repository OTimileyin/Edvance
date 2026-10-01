import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/api-session";
import { getMaterial } from "@/lib/repo/courses";
import { ingestMaterial } from "@/lib/ingestion";
import { isStorageConfigured } from "@/lib/supabase-storage";

/**
 * Re-runs text extraction for one of the signed-in learner's materials.
 *
 * Used by the Sources "Retry" action after a failed ingestion. Ownership is
 * enforced by `ingestMaterial`, which resolves the material through the owning
 * course, so another learner can never trigger or observe this work.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ courseId: string; materialId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { materialId } = await params;
  if (!isStorageConfigured()) {
    return NextResponse.json(
      { error: "Object storage is not configured." },
      { status: 503 },
    );
  }

  const outcome = await ingestMaterial(user.id, materialId);
  if (!outcome.found) {
    return NextResponse.json({ error: "Material not found." }, { status: 404 });
  }

  const material = await getMaterial(user.id, materialId);
  return NextResponse.json({ material });
}
