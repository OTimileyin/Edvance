import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/api-session";
import { deleteAssessment, updateAssessment } from "@/lib/repo/courses";

/**
 * Edits or deletes one assessment question.
 *
 * Editing a question invalidates its stored analysis — the verdict was about the
 * old wording — so the question returns to "not checked" and must be checked
 * again against the evidence. Deleting removes the question and its findings,
 * mappings and signature by cascade.
 */

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ courseId: string; assessmentId: string }> },
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
  const { question, lesson } = (body ?? {}) as Record<string, unknown>;
  if (question !== undefined && (typeof question !== "string" || !question.trim())) {
    return NextResponse.json({ error: "A question cannot be empty." }, { status: 400 });
  }

  const { courseId, assessmentId } = await params;
  const course = await updateAssessment(user.id, courseId, assessmentId, {
    question: typeof question === "string" ? question : undefined,
    lesson: typeof lesson === "string" ? lesson : undefined,
  });
  if (!course) {
    return NextResponse.json({ error: "Assessment question not found." }, { status: 404 });
  }
  return NextResponse.json({ course });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ courseId: string; assessmentId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { courseId, assessmentId } = await params;
  const course = await deleteAssessment(user.id, courseId, assessmentId);
  if (!course) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }
  return NextResponse.json({ course });
}
