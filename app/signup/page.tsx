"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { AuthForest } from "@/app/signin/page";

function nextPath(): string {
  if (typeof window === "undefined") return "/courses";
  return new URLSearchParams(window.location.search).get("next") || "/courses";
}

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Fill in your name, email, and password to continue.");
      return;
    }
    if (password.length < 8) {
      setError("Choose a password with at least 8 characters.");
      return;
    }
    setBusy(true);
    const result = await authClient.signUp.email({
      name: name.trim(),
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (result.error) {
      setError(
        result.error.status === 422
          ? "An account with that email already exists — sign in instead."
          : result.error.message ?? "Sign-up failed. Try again.",
      );
      return;
    }
    router.replace(nextPath());
    router.refresh();
  }

  return (
    <div className="auth-split">
      <AuthForest />
      <div className="auth-paper">
        <div className="auth-card" aria-live="polite">
          <h1>Create your account</h1>
          <p className="auth-sub">
            Real local account — name, email, and a hashed password are stored in
            PostgreSQL on this machine.
          </p>
          <form className="form" onSubmit={handleSubmit} style={{ maxWidth: "none" }}>
            <div className="field">
              <label className="field-label" htmlFor="name">
                Name
              </label>
              <input
                className="input"
                id="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
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
                autoComplete="new-password"
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
              {busy ? "Creating account…" : "Create account"}
            </button>
          </form>
          <p className="auth-alt">
            Already have an account?{" "}
            <Link href={`/signin?next=${encodeURIComponent(nextPath())}`}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
