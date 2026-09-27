"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { clearSession, getSession } from "@/lib/session";

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [name, setName] = useState<string | null>(null);

  // Re-check the session on every route change so sign-in/sign-out from
  // client-side navigations is reflected immediately.
  useEffect(() => {
    setName(getSession()?.name ?? null);
  }, [pathname]);

  function handleSignOut() {
    clearSession();
    setName(null);
    router.push("/");
  }

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <Link href="/" className="brand">
          <span className="brand-seal" aria-hidden="true">e</span>
          <span className="brand-mark">Edvance</span>
          <span className="brand-accent">Course Intelligence</span>
        </Link>
        <nav aria-label="Primary" className="header-nav">
          {name ? (
            <>
              <span className="nav-user">{name}</span>
              <button type="button" className="nav-action" onClick={handleSignOut}>
                Sign out
              </button>
            </>
          ) : (
            <Link href="/signin">Sign in</Link>
          )}
          <span className="demo-flag">Demo · mock data</span>
        </nav>
      </div>
    </header>
  );
}
