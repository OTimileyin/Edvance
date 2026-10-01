import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ensureSeeded } from "@/lib/repo/courses";

export default async function CoursesLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/signin?next=/courses");
  }

  // A learner's first visit gets the demo workspaces so their workspace is
  // never empty. Idempotent, so this is a cheap no-op on every later visit.
  await ensureSeeded(session.user.id);

  return <div className="container page-pad">{children}</div>;
}
