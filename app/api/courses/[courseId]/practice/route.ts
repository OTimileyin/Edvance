import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/api-session";
import { rateLimit } from "@/lib/api-rate-limit";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { recordPractice } from "@/lib/repo/courses";

/**
 * Records one real practice attempt for the signed-in learner and returns the
 * refreshed course.
 *
 * This is the only write path behind mastery, and it is always an explicit
 * learner action. A learner practises either an assessment question (attributed
 * to every concept the question was checked against) or a single concept
 * directly. Mastery is then derived from the attempt history — never set here.
 */

/** An answer is a note to self, not an essay; keep the stored trail bounded. */
const MAX_ANSWER_CHARS = 2000;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = rateLimit("practice", user.id, RATE_LIMITS.practice);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const { courseId } = await params;
  const { assessmentId, conceptId, answer, correct } = (body ?? {}) as Record<string, unknown>;

  if (typeof correct !== "boolean") {
    return NextResponse.json(
      { error: "Expected `correct` to be true or false." },
      { status: 400 },
    );
  }
  const hasQuestion = typeof assessmentId === "string" && assessmentId.trim().length > 0;
  const hasConcept = typeof conceptId === "string" && conceptId.trim().length > 0;
  if (!hasQuestion && !hasConcept) {
    return NextResponse.json(
      { error: "Provide an assessment question or a concept to practise." },
      { status: 400 },
    );
  }
  if (hasQuestion && hasConcept) {
    return NextResponse.json(
      { error: "Practise one thing at a time: a question or a concept." },
      { status: 400 },
    );
  }
  if (answer !== undefined && (typeof answer !== "string" || answer.length > MAX_ANSWER_CHARS)) {
    return NextResponse.json(
      { error: `An answer must be text of at most ${MAX_ANSWER_CHARS} characters.` },
      { status: 400 },
    );
  }

  const result = await recordPractice(user.id, courseId, {
    assessmentId: hasQuestion ? (assessmentId as string) : undefined,
    conceptId: hasConcept ? (conceptId as string) : undefined,
    answer: typeof answer === "string" ? answer : "",
    correct,
  });

  if (!result.ok) {
    switch (result.reason) {
      case "not-found":
        return NextResponse.json({ error: "Course not found." }, { status: 404 });
      case "question-not-found":
        return NextResponse.json({ error: "Assessment question not found." }, { status: 404 });
      case "question-not-checked":
        return NextResponse.json(
          {
            error:
              "Check this question against your materials first (see the Assessments tab), then record your practice.",
          },
          { status: 409 },
        );
      case "unknown-concept":
        return NextResponse.json(
          { error: "That concept is not part of this course." },
          { status: 400 },
        );
    }
  }

  return NextResponse.json({ course: result.course }, { status: 201 });
}
