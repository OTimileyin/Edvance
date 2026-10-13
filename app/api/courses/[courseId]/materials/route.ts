import { NextResponse, after } from "next/server";
import { getSessionUser } from "@/lib/api-session";
import { rateLimit } from "@/lib/api-rate-limit";
import { RATE_LIMITS } from "@/lib/rate-limit";
import {
  createMaterial,
  getCourseMaterialQuota,
  getMaterial,
  ownsCourse,
} from "@/lib/repo/courses";
import { drainNow } from "@/lib/jobs/worker";
import { enqueueJob } from "@/lib/repo/jobs";
import { deleteObject, isStorageConfigured, putObject } from "@/lib/supabase-storage";
import {
  MAX_COURSE_BYTES,
  MAX_MATERIAL_BYTES,
  MAX_MATERIALS_PER_COURSE,
  acceptedKindLabels,
  formatBytes,
  materialKindFor,
  materialTitle,
  safeMaterialFilename,
} from "@/lib/materials";

/** Duck-typed File check: undici's File may not share the global constructor. */
function asUploadedFile(value: unknown): (File & { arrayBuffer(): Promise<ArrayBuffer> }) | null {
  if (
    typeof value === "object" &&
    value !== null &&
    typeof (value as File).name === "string" &&
    typeof (value as File).size === "number" &&
    typeof (value as File).arrayBuffer === "function"
  ) {
    return value as File;
  }
  return null;
}

/**
 * Uploads a course material and records it on the course.
 *
 * The bytes are sent to private Supabase Storage first, then the
 * `learning_material` row is written with the object key as its
 * `storageReference`. Unsupported or
 * oversized files, an unconfigured bucket, and a failed upload all return a
 * specific status and a message the Sources form can show.
 *
 * Reading the file is *not* done here. It is queued as an `ingest` job and the
 * response returns immediately, which is what lets ten files be dropped in one
 * action without holding ten requests open — and what keeps the promise made by
 * "uploaded": a restart no longer throws away work the learner was told had
 * been accepted.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = rateLimit("upload", user.id, RATE_LIMITS.upload);
  if (limited) return limited;

  const { courseId } = await params;
  if (!(await ownsCourse(user.id, courseId))) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected a file upload (multipart/form-data)." },
      { status: 400 },
    );
  }

  const file = asUploadedFile(form.get("file"));
  if (!file || !file.name) {
    return NextResponse.json({ error: "Attach a file to upload." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "That file is empty." }, { status: 400 });
  }

  const kind = materialKindFor(file.name);
  if (!kind) {
    return NextResponse.json(
      {
        error: `We can't read that file type yet. Accepted materials: ${acceptedKindLabels()}.`,
      },
      { status: 415 },
    );
  }

  if (file.size > MAX_MATERIAL_BYTES) {
    return NextResponse.json(
      {
        error: `That file is ${formatBytes(file.size)}. The limit is ${formatBytes(
          MAX_MATERIAL_BYTES,
        )}.`,
      },
      { status: 413 },
    );
  }

  if (!isStorageConfigured()) {
    return NextResponse.json(
      {
        error:
          "Object storage isn't configured. Add SUPABASE_URL, SUPABASE_SECRET_KEY and SUPABASE_STORAGE_BUCKET to the Infisical dev environment (see README, Secrets (Infisical)), then restart the server.",
      },
      { status: 503 },
    );
  }

  // Per-course quotas: storage is a shared, finite, free-tier resource. The
  // learner is told which limit they would exceed rather than failing vaguely.
  const quota = await getCourseMaterialQuota(user.id, courseId);
  if (quota) {
    if (quota.count >= MAX_MATERIALS_PER_COURSE) {
      return NextResponse.json(
        {
          error: `This course already has ${MAX_MATERIALS_PER_COURSE} materials. Remove one before adding another.`,
        },
        { status: 409 },
      );
    }
    if (quota.bytes + file.size > MAX_COURSE_BYTES) {
      return NextResponse.json(
        {
          error: `Adding this file would take the course past ${formatBytes(
            MAX_COURSE_BYTES,
          )} of stored materials. Remove a file first.`,
        },
        { status: 413 },
      );
    }
  }

  const materialId = `material-${crypto.randomUUID()}`;
  // Owner-scoped key: a bucket listing cannot cross learners, and download or
  // delete authorisation is a join back to the owning course. The filename is
  // sanitised and only ever the final segment, never the whole path.
  const storageReference = `users/${user.id}/courses/${courseId}/materials/${materialId}/${safeMaterialFilename(
    file.name,
  )}`;
  // The stored content type is derived on the server from the accepted format,
  // never taken from the browser: a file named `.pdf` declaring `text/html`
  // would otherwise be served back inline from the bucket domain.
  const contentType = kind.mime;
  // Display name kept for the Sources list; bounded so a client cannot write an
  // arbitrarily long string into the row.
  const displayName = file.name.slice(0, 200);
  const bytes = Buffer.from(await file.arrayBuffer());

  try {
    await putObject(storageReference, bytes, contentType);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Upload to object storage failed. Please try again.",
      },
      { status: 502 },
    );
  }

  const material = await createMaterial(user.id, courseId, {
    id: materialId,
    type: kind.type,
    title: materialTitle(displayName, displayName),
    location: displayName,
    storageReference,
    mimeType: contentType,
    sizeBytes: file.size,
  });

  if (!material) {
    // The course vanished between the ownership check and the insert.
    await deleteObject(storageReference).catch(() => undefined);
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  // The upload has succeeded, so the material is recorded regardless of what
  // reading it does next. A failure there is recorded on the job and shown in the
  // Sources UI; it never deletes the learner's file or fails the upload.
  await enqueueJob({ userId: user.id, courseId, kind: "ingest", targetId: materialId });

  // The response goes out first and the drain runs after it, so the learner never
  // waits for extraction — and progress does not depend on the worker loop's next
  // tick either. If this drain cannot run, the job is already durable.
  after(() => drainNow());

  const refreshed = (await getMaterial(user.id, materialId)) ?? material;
  return NextResponse.json({ material: refreshed }, { status: 201 });
}
