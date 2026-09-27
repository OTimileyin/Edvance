"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSession } from "@/lib/session";

export function SessionGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace(`/signin?next=${encodeURIComponent(pathname)}`);
      return;
    }
    setChecked(true);
  }, [pathname, router]);

  if (!checked) {
    return <p className="page-lede" aria-live="polite">Loading…</p>;
  }

  return <>{children}</>;
}