import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/api-session";
import { rateLimit } from "@/lib/api-rate-limit";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { deleteCourse, ensureSeeded, getCourse, updateCourse } from "@/lib/repo/courses";
import { deleteObject } from "@/lib/supabase-storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { courseId } = await params;
  await ensureSeeded(user.id);
  const course = await getCourse(user.id, courseId);
  if (!course) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }
  return NextResponse.json({ course });
}

/** Renames / re-labels a course. Only presentation fields change. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }
  const { name, institution, lesson } = (body ?? {}) as Record<string, unknown>;
  if (name !== undefined && (typeof name !== "string" || !name.trim())) {
    return NextResponse.json({ error: "A course name cannot be empty." }, { status: 400 });
  }

  const { courseId } = await params;
  const course = await updateCourse(user.id, courseId, {
    name: typeof name === "string" ? name : undefined,
    institution: typeof institution === "string" ? institution : undefined,
    lesson: typeof lesson === "string" ? lesson : undefined,
  });
  if (!course) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }
  return NextResponse.json({ course });
}

/**
 * Deletes a course with everything it owns, then removes its stored files.
 * The database delete cascades first; storage cleanup is best-effort and never
 * resurrects the deleted rows.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = rateLimit("course-delete", user.id, RATE_LIMITS.account);
  if (limited) return limited;

  const { courseId } = await params;
  const result = await deleteCourse(user.id, courseId);
  if (!result) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  for (const key of result.storageReferences) {
    await deleteObject(key).catch(() => undefined);
  }
  return NextResponse.json({ deleted: true });
}
