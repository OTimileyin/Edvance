import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/api-session";
import { rateLimit } from "@/lib/api-rate-limit";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { deleteAccount } from "@/lib/repo/courses";
import { deleteObject } from "@/lib/supabase-storage";
import { isEmailConfigured, sendEmail } from "@/lib/email";

/**
 * Deletes the signed-in learner's account and everything it owns.
 *
 * The database delete cascades first; stored objects are then removed
 * best-effort. A confirmation email is sent when Resend is configured (using the
 * address captured before deletion) — and when it is not, Edvance simply does
 * not pretend one was sent.
 */
export async function DELETE() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = rateLimit("account-delete", user.id, RATE_LIMITS.account);
  if (limited) return limited;

  const result = await deleteAccount(user.id);
  if (!result) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  for (const key of result.storageReferences) {
    await deleteObject(key).catch(() => undefined);
  }

  let emailSent = false;
  if (result.email && isEmailConfigured()) {
    const sent = await sendEmail({
      to: result.email,
      subject: "Your Edvance account was deleted",
      text: [
        "Your Edvance account and all of its courses, materials and practice records have been deleted.",
        "",
        "If you did not request this, contact the operator of this deployment immediately.",
      ].join("\n"),
    });
    emailSent = sent.sent;
  }

  // The session cookie is now invalid; the client returns to the landing page.
  return NextResponse.json({ deleted: true, emailSent });
}
