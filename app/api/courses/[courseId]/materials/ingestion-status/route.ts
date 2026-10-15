import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/api-session";
import { getMaterialIngestionStatuses, ownsCourse } from "@/lib/repo/courses";

const MAX_BATCH_FILES = 10;

export async function GET(request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { courseId } = await params;
  if (!(await ownsCourse(user.id, courseId))) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  const ids = new URL(request.url).searchParams.get("ids")?.split(",") ?? [];
  if (ids.length === 0 || ids.length > MAX_BATCH_FILES || ids.some((id) => !id.trim())) {
    return NextResponse.json({ error: "Provide between 1 and 10 material IDs." }, { status: 400 });
  }

  const result = await getMaterialIngestionStatuses(user.id, courseId, ids);
  return NextResponse.json(result);
}
