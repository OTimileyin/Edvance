import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/** The signed-in Better Auth user, or null. Server-only (route handlers, RSC). */
export async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}
