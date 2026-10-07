import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms — Edvance",
  description: "The terms of use for this Edvance deployment.",
};

export default function TermsPage() {
  return (
    <div className="container page-pad">
      <section className="section">
        <span className="kicker">Legal</span>
        <h1 className="page-title">Terms of use</h1>
        <p className="page-lede">
          These terms cover this deployment of Edvance. By using it, you agree to them.
        </p>
      </section>

      <section className="section">
        <h2 className="section-heading">Your responsibilities</h2>
        <ul>
          <li>
            <strong>Upload what you have the right to.</strong> Only add course materials you are
            permitted to store and process. Do not upload other people&apos;s copyrighted material
            without permission.
          </li>
          <li>
            <strong>Keep your account secure.</strong> You are responsible for your password and for
            the activity on your account.
          </li>
          <li>
            <strong>Use it fairly.</strong> Do not attempt to disrupt the service or exceed its
            stated limits.
          </li>
        </ul>
      </section>

      <section className="section">
        <h2 className="section-heading">What Edvance is, and is not</h2>
        <p>
          Edvance identifies the concepts your own materials teach and how they relate to your
          assessments. It is a study aid, not an authority: it reports uncertainty rather than
          guessing, and it may be wrong. Always check its findings against your own course.
        </p>
      </section>

      <section className="section">
        <h2 className="section-heading">Availability</h2>
        <p>
          This is a demonstration deployment and is provided as-is, without warranty, and may be
          changed or taken offline. Do not rely on it as your only copy of anything important.
        </p>
      </section>
    </div>
  );
}
