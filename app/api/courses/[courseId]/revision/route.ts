import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/api-session";
import { rateLimit } from "@/lib/api-rate-limit";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { isAiConfigured, isMockProvider } from "@/lib/ai/gemini";
import { generateTargetedPractice } from "@/lib/ai/revision-intelligence";
import { AiProviderError, ModelOutputError } from "@/lib/ai/types";
import { revisionFingerprint } from "@/lib/revision";
import {
  failRevisionPlan,
  getConceptEvidenceChunks,
  getCourse,
  markRevisionAnalyzing,
  saveTargetedPractice,
} from "@/lib/repo/courses";

/**
 * Generates targeted practice for the learner's weakest concepts.
 *
 *   authenticate → authorise → require a ready course → pick the weak areas
 *   (deterministic) → Gemini → validate → persist grounded practice
 *
 * The recommendation itself is derived from mastery and needs no model; this
 * endpoint only writes practice. It is always an explicit learner action. The
 * model is given just the weak concepts and the evidence that teaches them, so a
 * question can only ever be written for a real weak area and cite real evidence;
 * a fabricated concept or citation rejects the whole response. When there is
 * nothing to revise — or no evidence to ground a question — Edvance records that
 * honestly, with no model call.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = rateLimit("revision", user.id, RATE_LIMITS.ai);
  if (limited) return limited;

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
          "Practice generation is not configured. Add GEMINI_API_KEY to the Infisical dev environment (see README, Secrets), then restart the server.",
      },
      { status: 503 },
    );
  }

  if (course.revision.status === "analyzing") {
    return NextResponse.json(
      { error: "Practice is already being generated. Please wait for it to finish." },
      { status: 409 },
    );
  }

  const focus = course.revision.focus;
  const conceptIds = focus.map((entry) => entry.conceptId);
  const fingerprint = revisionFingerprint(focus);

  // A recommendation can only be built from concepts the course evidence
  // established, so an un-analysed course has to be analysed first.
  if (course.intelligence.concepts.length === 0) {
    if (
      course.intelligence.status === "not-analyzed" ||
      course.intelligence.status === "analyzing" ||
      course.intelligence.status === "needs-reanalysis"
    ) {
      return NextResponse.json(
        {
          error:
            "Analyse the course first — practice is generated for the concepts your materials taught.",
        },
        { status: 409 },
      );
    }

    await saveTargetedPractice(courseId, fingerprint, {
      status: "insufficient-evidence",
      questions: [],
      usage: { model: "none" },
    });
    const refreshed = await getCourse(user.id, courseId);
    return NextResponse.json({ course: refreshed, outcome: "insufficient-evidence" });
  }

  // Cost control: an up-to-date generation is not recomputed.
  if (course.revision.status === "ready") {
    return NextResponse.json({ course, outcome: "up-to-date" });
  }

  // Nothing is weak or untested: record that honestly without a model call.
  if (focus.length === 0) {
    await saveTargetedPractice(courseId, fingerprint, {
      status: "ready",
      questions: [],
      usage: { model: "none" },
    });
    const refreshed = await getCourse(user.id, courseId);
    return NextResponse.json({ course: refreshed, outcome: "nothing-to-revise" });
  }

  const evidence = await getConceptEvidenceChunks(user.id, courseId, conceptIds);
  if (evidence.length === 0) {
    await saveTargetedPractice(courseId, fingerprint, {
      status: "insufficient-evidence",
      questions: [],
      usage: { model: "none" },
    });
    const refreshed = await getCourse(user.id, courseId);
    return NextResponse.json({ course: refreshed, outcome: "insufficient-evidence" });
  }

  await markRevisionAnalyzing(courseId, fingerprint);

  const conceptById = new Map(course.intelligence.concepts.map((concept) => [concept.id, concept]));

  let outcome = "generated";
  try {
    const result = await generateTargetedPractice({
      courseName: course.name,
      lesson: course.lesson,
      concepts: focus.map((entry) => ({
        id: entry.conceptId,
        name: entry.name,
        status: entry.status,
        definition: conceptById.get(entry.conceptId)?.definition ?? null,
        locations: entry.evidence.map(
          (reference) => `${reference.materialTitle} (${reference.sourceLocation})`,
        ),
      })),
      evidence,
      mockScenario,
    });
    await saveTargetedPractice(courseId, fingerprint, result);
    if (result.status === "insufficient-evidence") outcome = "insufficient-evidence";
  } catch (error) {
    if (error instanceof AiProviderError) {
      await failRevisionPlan(courseId, error.code, error.message);
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    if (error instanceof ModelOutputError) {
      await failRevisionPlan(
        courseId,
        "unverified-output",
        "The generation service returned a response Edvance could not verify. Please try again.",
      );
      return NextResponse.json(
        {
          error:
            "The generation service returned a response Edvance could not verify. Please try again.",
        },
        { status: 502 },
      );
    }
    // Never log course contents; the error type is enough to diagnose this.
    console.error(`[ai] revision ${courseId} generation failed`);
    await failRevisionPlan(
      courseId,
      "generation-failed",
      "Practice generation did not finish. Please try again.",
    );
    return NextResponse.json(
      { error: "Practice generation did not finish. Please try again." },
      { status: 502 },
    );
  }

  const refreshed = await getCourse(user.id, courseId);
  return NextResponse.json({ course: refreshed, outcome });
}
