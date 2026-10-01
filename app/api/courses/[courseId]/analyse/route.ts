import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/api-session";
import { isAiConfigured, isMockProvider } from "@/lib/ai/gemini";
import { analyseCourseEvidence } from "@/lib/ai/course-intelligence";
import { AiProviderError, ModelOutputError } from "@/lib/ai/types";
import {
  evidenceFingerprint,
  failCourseAnalysis,
  getCourse,
  getCourseEvidence,
  markCourseAnalysisAnalyzing,
  saveCourseIntelligence,
} from "@/lib/repo/courses";

/**
 * Analyses one of the signed-in learner's courses against its own evidence.
 *
 *   authenticate → authorise → load evidence → bound → Gemini → validate →
 *   resolve references → persist concepts, relationships and analysis state
 *
 * The route is the only place the AI provider is reached from, and it is only
 * reached by an explicit learner action: nothing here runs on a page refresh.
 * If a course has no evidence, the analysis is recorded as
 * `insufficient-evidence` — a valid outcome, not an error.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // A header can pick a mock scenario only while the deterministic test
  // provider is active, which is impossible in production. It never reaches a
  // real provider call.
  const mockScenario = isMockProvider()
    ? (request.headers.get("x-edvance-mock-scenario") ?? undefined)
    : undefined;

  const { courseId } = await params;
  const course = await getCourse(user.id, courseId);
  if (!course) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  if (!isAiConfigured()) {
    return NextResponse.json(
      {
        error:
          "Course analysis is not configured. Add GEMINI_API_KEY to the Infisical dev environment (see README, Secrets), then restart the server.",
      },
      { status: 503 },
    );
  }

  const evidence = (await getCourseEvidence(user.id, courseId)) ?? [];
  const fingerprint = evidenceFingerprint(course.sources);

  // No real evidence yet: record the honest outcome and stop. This never calls
  // the model, so an empty workspace costs nothing.
  if (evidence.length === 0) {
    await saveCourseIntelligence(
      courseId,
      fingerprint,
      { status: "insufficient-evidence", concepts: [], relationships: [], usage: { model: "none" } },
      evidence,
    );
    const refreshed = await getCourse(user.id, courseId);
    return NextResponse.json({ course: refreshed, outcome: "insufficient-evidence" });
  }

  // A light lock: refuse a second analysis while one is already running.
  if (course.intelligence.status === "analyzing") {
    return NextResponse.json(
      { error: "This course is already being analysed. Please wait for it to finish." },
      { status: 409 },
    );
  }

  // Cost control: if the stored intelligence is up to date with the current
  // evidence, do not spend another model call.
  if (course.intelligence.status === "ready") {
    return NextResponse.json({ course, outcome: "up-to-date" });
  }

  await markCourseAnalysisAnalyzing(courseId, fingerprint);

  try {
    const result = await analyseCourseEvidence({
      courseName: course.name,
      lesson: course.lesson,
      evidence,
      mockScenario,
    });
    await saveCourseIntelligence(courseId, fingerprint, result, evidence);
  } catch (error) {
    if (error instanceof AiProviderError) {
      await failCourseAnalysis(courseId, error.code, error.message);
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    if (error instanceof ModelOutputError) {
      // A response Edvance could not verify is rejected whole — nothing partial
      // is ever stored, and the raw output is never surfaced.
      await failCourseAnalysis(
        courseId,
        "unverified-output",
        "The analysis service returned a response Edvance could not verify. Please try again.",
      );
      return NextResponse.json(
        { error: "The analysis service returned a response Edvance could not verify. Please try again." },
        { status: 502 },
      );
    }
    // Never log course contents; the error type is enough to diagnose this.
    console.error(`[ai] course ${courseId} analysis failed`);
    await failCourseAnalysis(
      courseId,
      "analysis-failed",
      "Course analysis did not finish. Please try again.",
    );
    return NextResponse.json({ error: "Course analysis did not finish. Please try again." }, { status: 502 });
  }

  const refreshed = await getCourse(user.id, courseId);
  return NextResponse.json({ course: refreshed, outcome: "analysed" });
}
