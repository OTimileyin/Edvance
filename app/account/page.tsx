"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { deleteAccount } from "@/lib/useCourses";

/**
 * Account lifecycle: see who you are signed in as, change your password, and
 * delete your account.
 *
 * Deleting is deliberately hard to do by accident: it needs the word DELETE
 * typed, and it removes every course, material and practice record. A
 * confirmation email is sent when the deployment has email configured.
 */
export default function AccountPage() {
  const router = useRouter();
  const { data, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="container page-pad">
        <p className="page-lede" aria-live="polite">
          Loading your account…
        </p>
      </div>
    );
  }

  if (!data?.user) {
    return (
      <div className="container page-pad">
        <section className="section">
          <h1 className="page-title">You are not signed in</h1>
          <p className="page-lede">Sign in to manage your account.</p>
          <p style={{ marginTop: 20 }}>
            <Link className="btn btn-primary" href="/signin">
              Sign in
            </Link>
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="container page-pad">
      <section className="section">
        <span className="kicker">Account</span>
        <h1 className="page-title">Your account</h1>
        <p className="page-lede">
          Signed in as <strong>{data.user.email}</strong>
          {data.user.name ? ` (${data.user.name})` : ""}.
        </p>
      </section>

      <ChangePasswordForm />

      <DangerZone
        onDeleted={() => {
          router.push("/");
          router.refresh();
        }}
      />
    </div>
  );
}

function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setDone(false);
    if (newPassword.length < 8) {
      setError("Choose a new password of at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (result.error) {
        setError(result.error.message ?? "Could not change your password.");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setDone(true);
    } catch {
      setError("Could not change your password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="section" aria-labelledby="password-heading">
      <h2 className="section-heading" id="password-heading">
        Change password
      </h2>
      <form className="form" onSubmit={handleSubmit}>
        <div className="field">
          <label className="field-label" htmlFor="current-password">
            Current password
          </label>
          <input
            id="current-password"
            className="input"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="new-password">
            New password
          </label>
          <input
            id="new-password"
            className="input"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
          />
        </div>
        {error && (
          <p role="alert" className="alert alert-warning">
            {error}
          </p>
        )}
        {done && <p className="form-hint">Password changed. Other sessions were signed out.</p>}
        <div>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Saving…" : "Change password"}
          </button>
        </div>
      </form>
    </section>
  );
}

function DangerZone({ onDeleted }: { onDeleted: () => void }) {
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (confirmText !== "DELETE") {
      setError("Type DELETE to confirm.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await deleteAccount();
      onDeleted();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete your account.");
      setBusy(false);
    }
  }

  return (
    <section className="section" aria-labelledby="danger-heading">
      <h2 className="section-heading" id="danger-heading">
        Delete account
      </h2>
      <div className="alert alert-warning">
        <p className="alert-title">This cannot be undone</p>
        <p>
          Deleting your account removes every course, material, question and practice record you
          have created, and their stored files. This is immediate.
        </p>
      </div>
      <div className="field" style={{ marginTop: 16, maxWidth: 360 }}>
        <label className="field-label" htmlFor="confirm-delete">
          Type DELETE to confirm
        </label>
        <input
          id="confirm-delete"
          className="input"
          type="text"
          value={confirmText}
          onChange={(event) => setConfirmText(event.target.value)}
          placeholder="DELETE"
        />
      </div>
      {error && (
        <p role="alert" className="alert alert-warning">
          {error}
        </p>
      )}
      <p style={{ marginTop: 12 }}>
        <button
          type="button"
          className="btn btn-coral"
          onClick={() => void handleDelete()}
          disabled={busy || confirmText !== "DELETE"}
        >
          {busy ? "Deleting…" : "Delete my account"}
        </button>
      </p>
    </section>
  );
}
