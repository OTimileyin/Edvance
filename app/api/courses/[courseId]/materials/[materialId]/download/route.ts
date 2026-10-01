import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/api-session";
import { getMaterialStorage } from "@/lib/repo/courses";
import { createDownloadUrl, isStorageConfigured } from "@/lib/supabase-storage";

/**
 * Redirects the signed-in learner to their stored material.
 *
 * Ownership is checked against the owning course, so a learner can only ever
 * retrieve their own files. The bucket is private, so a short-lived signed URL
 * is minted on each request for the authorised learner and the browser is
 * redirected to it.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ courseId: string; materialId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { materialId } = await params;
  const material = await getMaterialStorage(user.id, materialId);
  if (!material) {
    return NextResponse.json({ error: "Material not found." }, { status: 404 });
  }

  if (!isStorageConfigured()) {
    return NextResponse.json({ error: "Object storage is not configured." }, { status: 503 });
  }

  const url = await createDownloadUrl(material.storageReference);
  return NextResponse.redirect(url, 307);
}
