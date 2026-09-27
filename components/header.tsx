"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function AppHeader() {
  const router = useRouter();
  const { data, isPending } = authClient.useSession();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
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
          {!isPending && data?.user ? (
            <>
              <span className="nav-user">{data.user.name || data.user.email}</span>
              <button type="button" className="nav-action" onClick={handleSignOut}>
                Sign out
              </button>
            </>
          ) : null}
          {!isPending && !data?.user ? <Link href="/signin">Sign in</Link> : null}
          <span className="demo-flag">Demo · mock data</span>
        </nav>
      </div>
    </header>
  );
}
