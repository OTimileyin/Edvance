import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/api-session";
import { createCourse, ensureSeeded, listCourses } from "@/lib/repo/courses";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureSeeded(user.id);
  return NextResponse.json({ courses: await listCourses(user.id) });
}

export async function POST(request: Request) {
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
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "A course name is required." }, { status: 400 });
  }

  const course = await createCourse(user.id, {
    name,
    institution: typeof institution === "string" ? institution : "",
    lesson: typeof lesson === "string" ? lesson : "",
  });
  return NextResponse.json({ course }, { status: 201 });
}
