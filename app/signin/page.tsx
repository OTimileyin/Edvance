"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Logo } from "@/components/logo";

function nextPath(): string {
  if (typeof window === "undefined") return "/courses";
  return new URLSearchParams(window.location.search).get("next") || "/courses";
}

export function AuthForest() {
  return (
    <aside className="auth-forest">
      <span className="auth-brand">
        <Logo idSuffix="auth" size={44} tag="Course Intelligence" />
      </span>
      <p className="auth-quote">
        Never study a <em className="em-coral">contradiction</em> blind again.
      </p>
      <p className="auth-sub-line">
        Sign in to open your course workspaces — every question mapped to the evidence that taught
        it.
      </p>
      <div className="auth-glass">
        <span className="badge badge-error">Possible inconsistency</span>
        <p>
          &ldquo;The question says <strong>five</strong> components — the lesson evidence names{" "}
          <strong>six</strong>.&rdquo;
        </p>
      </div>
    </aside>
  );
}

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function navigate() {
    router.replace(nextPath());
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Enter an email and password to continue.");
      return;
    }
    setBusy(true);
    const result = await authClient.signIn.email({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (result.error) {
      setError(
        result.error.status === 401
          ? "That email and password don't match an account. Create one below."
          : (result.error.message ?? "Sign-in failed. Try again."),
      );
      return;
    }
    navigate();
  }

  async function handleDemo() {
    setBusy(true);
    // Provision the shared local demo account on the fly.
    await authClient.signUp.email({
      name: "Demo learner",
      email: "demo@edvance.app",
      password: "demo-password-123",
    });
    const result = await authClient.signIn.email({
      email: "demo@edvance.app",
      password: "demo-password-123",
    });
    setBusy(false);
    if (result.error) {
      setError(result.error.message ?? "Demo sign-in failed. Try again.");
      return;
    }
    navigate();
  }

  return (
    <div className="auth-split">
      <AuthForest />
      <div className="auth-paper">
        <div className="auth-card" aria-live="polite">
          <h1>Sign in</h1>
          <p className="auth-sub">Real local account — stored in PostgreSQL on this machine.</p>
          <form className="form" onSubmit={handleSubmit} style={{ maxWidth: "none" }}>
            <div className="field">
              <label className="field-label" htmlFor="email">
                Email
              </label>
              <input
                className="input"
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="password">
                Password
              </label>
              <input
                className="input"
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error ? (
              <p className="alert alert-error" role="alert">
                {error}
              </p>
            ) : null}
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={handleDemo}
              disabled={busy}
            >
              Continue with a demo account
            </button>
          </form>
          <p className="auth-alt">
            New here?{" "}
            <Link href={`/signup?next=${encodeURIComponent(nextPath())}`}>Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
