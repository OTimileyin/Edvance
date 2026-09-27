import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { UserBootstrapper } from "@/components/user-bootstrapper";

export default async function CoursesLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/signin?next=/courses");
  }

  return <UserBootstrapper email={session.user.email}>{children}</UserBootstrapper>;
}
