import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container page-pad">
      <section className="section">
        <span className="kicker">404</span>
        <h1 className="page-title">We could not find that page</h1>
        <p className="page-lede">
          The address does not match anything in Edvance. It may have been removed, or the link may
          be out of date.
        </p>
        <p style={{ marginTop: 20 }}>
          <Link className="btn btn-primary" href="/courses">
            Go to your courses
          </Link>
        </p>
      </section>
    </div>
  );
}
