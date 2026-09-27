"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { setSession } from "@/lib/session";

function nextPath(): string {
  if (typeof window === "undefined") return "/courses";
  return new URLSearchParams(window.location.search).get("next") || "/courses";
}

export function AuthForest() {
  return (
    <aside className="auth-forest">
      <p className="auth-brand">Edvance</p>
      <p className="auth-quote">
        Never study a <em className="em-coral">contradiction</em> blind again.
      </p>
      <p className="auth-sub-line">
        Sign in to open your course workspaces — every question mapped to the
        evidence that taught it.
      </p>
      <div className="auth-glass">
        <span className="badge badge-error">Possible inconsistency</span>
        <p>
          &ldquo;The question says <strong>five</strong> components — the lesson
          evidence names <strong>six</strong>.&rdquo;
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

  function enter(name: string, mail: string) {
    setSession({ name, email: mail });
    router.replace(nextPath());
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Enter an email and password to continue.");
      return;
    }
    const name = email.trim().split("@")[0] || "Demo learner";
    enter(name, email.trim());
  }

  return (
    <div className="auth-split">
      <AuthForest />
      <div className="auth-paper">
        <div className="auth-card" aria-live="polite">
          <h1>Sign in</h1>
          <p className="auth-sub">
            Demo account — any email and password are accepted locally.
          </p>
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
            <button className="btn btn-primary" type="submit">
              Sign in
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => enter("Demo learner", "demo@edvance.app")}
            >
              Continue with a demo account
            </button>
          </form>
          <p className="auth-alt">
            New here?{" "}
            <Link href={`/signup?next=${encodeURIComponent(nextPath())}`}>
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
