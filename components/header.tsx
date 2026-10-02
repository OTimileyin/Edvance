"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Logo } from "@/components/logo";

export function AppHeader() {
  const router = useRouter();
  const { data, isPending } = authClient.useSession();
  const signedIn = !isPending && Boolean(data?.user);

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <Link href="/" className="brand" aria-label="Edvance home">
          <Logo idSuffix="header" size={38} />
        </Link>

        <nav aria-label="Primary" className="header-nav">
          <Link href="/#questions">Questions</Link>
          <Link href="/#features">Features</Link>
          <Link href="/#how-it-works">How it works</Link>
        </nav>

        <div className="header-tools">
          <span className="demo-flag">Evidence-first</span>
          {signedIn ? (
            <>
              <Link className="nav-user" href="/account">
                {data?.user.name || data?.user.email}
              </Link>
              <button type="button" className="nav-action" onClick={handleSignOut}>
                Sign out
              </button>
              <Link
                className="icon-btn"
                href="/courses"
                aria-label="Open your course workspaces"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M5 12h14" />
                  <path d="m13 6 6 6-6 6" />
                </svg>
              </Link>
            </>
          ) : (
            <>
              <Link
                className="icon-btn icon-btn--quiet"
                href="/signin"
                aria-label="Sign in"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="8" r="3.4" />
                  <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
                </svg>
              </Link>
              <Link className="btn btn-sm btn-coral" href="/signup">
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
