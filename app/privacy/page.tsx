import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy — Oyevolve",
  description: "What Oyevolve stores, why, and how to remove it.",
};

export default function PrivacyPage() {
  return (
    <div className="container page-pad">
      <section className="section">
        <span className="kicker">Legal</span>
        <h1 className="page-title">Privacy</h1>
        <p className="page-lede">
          Oyevolve is a learning workspace. This page describes, plainly, what it stores and how to
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
          Course analysis runs automatically after an uploaded batch has finished reading, and you
          can also request it again. Analysis sends the configured AI provider the course name,
          lesson, evidence chunks extracted from your materials, and existing concept IDs, names,
          and definitions, including archived concepts. Reading a file you upload — extracting its
          text and locating it for citations — does happen automatically on Oyevolve&rsquo;s servers
          once the upload is stored, and it stays inside Oyevolve until analysis sends its inputs to
          the provider. Citation IDs are checked against the evidence supplied for analysis before
          results are saved; model interpretations still need your review. Raw model output is not
          retained.
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
