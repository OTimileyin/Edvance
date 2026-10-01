import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/api-session";
import { isAiConfigured, isMockProvider } from "@/lib/ai/gemini";
import { analyseAssessment } from "@/lib/ai/assessment-intelligence";
import { AiProviderError, ModelOutputError } from "@/lib/ai/types";
import {
  evidenceFingerprint,
  failAssessmentAnalysis,
  getCourse,
  markAssessmentAnalysisAnalyzing,
  saveAssessmentIntelligence,
} from "@/lib/repo/courses";

/**
 * Judges one assessment question against the course's own extracted concepts.
 *
 *   authenticate → authorise → require a ready course → Gemini → validate →
 *   resolve concept ids → persist source mappings, consistency and state
 *
 * Like course analysis, this is only ever reached by an explicit learner action
 * and never runs on a page refresh. A question is judged against the concepts
 * the course evidence already established — never against the raw material and
 * never against seed concepts — so a course must be analysed first. When the
 * course cannot support a judgement, the honest `insufficient-evidence` state is
 * recorded without spending a model call.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ courseId: string; assessmentId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // A header can pick a mock scenario only while the deterministic test
  // provider is active, which is impossible in production.
  const mockScenario = isMockProvider()
    ? (request.headers.get("x-edvance-mock-scenario") ?? undefined)
    : undefined;

  const { courseId, assessmentId } = await params;
  const course = await getCourse(user.id, courseId);
  if (!course) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  const assessment = course.assessments.find((item) => item.id === assessmentId);
  if (!assessment) {
    return NextResponse.json({ error: "Assessment question not found." }, { status: 404 });
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

  // A light lock, mirroring course analysis.
  if (assessment.signature.status === "analyzing") {
    return NextResponse.json(
      { error: "This question is already being analysed. Please wait for it to finish." },
      { status: 409 },
    );
  }

  const concepts = course.intelligence.concepts;
  const fingerprint = evidenceFingerprint(course.sources);

  // A question can only be judged against concepts the course evidence actually
  // established. Without them, say so rather than guessing.
  if (course.intelligence.status !== "ready" || concepts.length === 0) {
    if (
      course.intelligence.status === "not-analyzed" ||
      course.intelligence.status === "analyzing" ||
      course.intelligence.status === "needs-reanalysis"
    ) {
      return NextResponse.json(
        {
          error:
            "Analyse the course first — this question is judged against the concepts your materials taught.",
        },
        { status: 409 },
      );
    }

    await saveAssessmentIntelligence(
      courseId,
      assessment.id,
      fingerprint,
      {
        status: "insufficient-evidence",
        consistency: "INSUFFICIENT_EVIDENCE",
        reason:
          "The course has not established any concepts yet, so this question cannot be checked against evidence.",
        nextAction: "Upload material that covers this question, analyse the course, then try again.",
        testedConceptIds: [],
        usage: { model: "none" },
      },
      [],
    );
    const refreshed = await getCourse(user.id, courseId);
    return NextResponse.json({ course: refreshed, outcome: "insufficient-evidence" });
  }

  // Cost control: an up-to-date signature is not recomputed.
  if (assessment.signature.status === "ready") {
    return NextResponse.json({ course, outcome: "up-to-date" });
  }

  await markAssessmentAnalysisAnalyzing(assessment.id, fingerprint);

  try {
    const result = await analyseAssessment({
      courseName: course.name,
      lesson: assessment.lesson || course.lesson,
      question: assessment.question,
      concepts: concepts.map((concept) => ({
        id: concept.id,
        name: concept.name,
        instructorTerm: concept.instructorTerm,
        evidenceStatus: concept.evidenceStatus,
        definition: concept.definition,
        locations: concept.evidence.map(
          (reference) => `${reference.materialTitle} (${reference.sourceLocation})`,
        ),
      })),
      mockScenario,
    });
    await saveAssessmentIntelligence(courseId, assessment.id, fingerprint, result, concepts);
  } catch (error) {
    if (error instanceof AiProviderError) {
      await failAssessmentAnalysis(assessment.id, error.code, error.message);
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    if (error instanceof ModelOutputError) {
      await failAssessmentAnalysis(
        assessment.id,
        "unverified-output",
        "The analysis service returned a response Edvance could not verify. Please try again.",
      );
      return NextResponse.json(
        {
          error:
            "The analysis service returned a response Edvance could not verify. Please try again.",
        },
        { status: 502 },
      );
    }
    // Never log course contents; the error type is enough to diagnose this.
    console.error(`[ai] assessment ${assessment.id} analysis failed`);
    await failAssessmentAnalysis(
      assessment.id,
      "analysis-failed",
      "Question analysis did not finish. Please try again.",
    );
    return NextResponse.json(
      { error: "Question analysis did not finish. Please try again." },
      { status: 502 },
    );
  }

  const refreshed = await getCourse(user.id, courseId);
  return NextResponse.json({ course: refreshed, outcome: "analysed" });
}
