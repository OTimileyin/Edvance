"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";

/**
 * Client-side guard used inside the gated workspace. The server layout
 * (app/courses/layout.tsx) already blocks unauthenticated access; this keeps
 * client components honest if a session expires mid-navigation.
 */
export function SessionGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !data?.user) {
      router.replace(`/signin?next=${encodeURIComponent(pathname)}`);
    }
  }, [isPending, data, pathname, router]);

  if (isPending) {
    return (
      <p className="page-lede" aria-live="polite">
        Loading…
      </p>
    );
  }

  if (!data?.user) {
    return (
      <p className="page-lede" aria-live="polite">
        Redirecting to sign in…
      </p>
    );
  }

  return <>{children}</>;
}
