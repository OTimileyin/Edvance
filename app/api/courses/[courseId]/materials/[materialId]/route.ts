import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/api-session";
import { deleteMaterial } from "@/lib/repo/courses";
import { deleteObject, isStorageConfigured } from "@/lib/supabase-storage";

/**
 * Removes a material from a course the signed-in learner owns.
 *
 * The database row is deleted first and is authoritative, then the stored
 * object is cleaned up on a best-effort basis: an object left behind in the
 * bucket is invisible to the learner, whereas a row pointing at a deleted
 * object would be a broken record they can see and click.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ courseId: string; materialId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { courseId, materialId } = await params;
  const removed = await deleteMaterial(user.id, courseId, materialId);
  if (!removed) {
    return NextResponse.json({ error: "Material not found." }, { status: 404 });
  }

  // Seeded or cited sources have no object behind them, and an unconfigured
  // bucket has nothing to clean up. Both are a successful deletion.
  if (removed.storageReference && isStorageConfigured()) {
    try {
      await deleteObject(removed.storageReference);
    } catch (error) {
      // The learner's view is already correct, so the request succeeded. Log
      // the orphan rather than failing a delete that did its job.
      console.error(
        `[materials] could not remove the stored object for ${materialId}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  return NextResponse.json({ removed: materialId });
}
