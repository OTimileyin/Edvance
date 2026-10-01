import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/api-session";
import { addAssessment } from "@/lib/repo/courses";

export async function POST(
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

  const { courseId } = await params;
  const { question, lesson } = (body ?? {}) as Record<string, unknown>;
  if (typeof question !== "string" || !question.trim()) {
    return NextResponse.json({ error: "An assessment question is required." }, { status: 400 });
  }

  const course = await addAssessment(
    user.id,
    courseId,
    typeof lesson === "string" ? lesson : "",
    question,
  );
  if (!course) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }
  return NextResponse.json({ course }, { status: 201 });
}
