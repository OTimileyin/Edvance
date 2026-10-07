import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy — Edvance",
  description: "What Edvance stores, why, and how to remove it.",
};

export default function PrivacyPage() {
  return (
    <div className="container page-pad">
      <section className="section">
        <span className="kicker">Legal</span>
        <h1 className="page-title">Privacy</h1>
        <p className="page-lede">
          Edvance is a learning workspace. This page describes, plainly, what it stores and how to
          remove it. It applies to this deployment.
        </p>
      </section>

      <section className="section">
        <h2 className="section-heading">What we store</h2>
        <ul>
          <li>
            <strong>Your account.</strong> Your email address and a securely hashed password,
            managed by Better Auth in the deployment&apos;s PostgreSQL database. Sessions are stored
            as HTTP-only cookies.
          </li>
          <li>
            <strong>Your course content.</strong> The courses, materials, assessment questions and
            practice attempts you create, plus the concepts, evidence and settings derived from
            them.
          </li>
          <li>
            <strong>Uploaded files.</strong> Stored in a private object-storage bucket, only
            reachable through the app. They are never public and are downloaded via short-lived
            signed links.
          </li>
        </ul>
      </section>

      <section className="section">
        <h2 className="section-heading">How your content is used</h2>
        <p>
          Course analysis sends only the evidence your own materials produced to the configured AI
          provider, and only when you explicitly ask for it. Nothing is analysed automatically.
          Source citations are validated before anything is stored, and raw model output is never
          kept.
        </p>
      </section>

      <section className="section">
        <h2 className="section-heading">Removing your data</h2>
        <p>
          You can delete any course, material or question from within the app. Deleting your account
          removes your courses, their materials and their stored files. Deletion is immediate and
          cannot be undone.
        </p>
        <p style={{ marginTop: 16 }}>
          <Link className="btn btn-secondary" href="/account">
            Manage your account
          </Link>
        </p>
      </section>
    </div>
  );
}
