import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/api-session";
import { ensureSeeded, getCourse } from "@/lib/repo/courses";

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
