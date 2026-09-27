import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { AppHeader } from "@/components/header";
import { Logo } from "@/components/logo";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter-stack",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
  variable: "--font-fraunces-stack",
});

export const metadata: Metadata = {
  title: "Edvance — Course Intelligence",
  description:
    "Evidence-first assessment intelligence: every question mapped to the lesson that taught it, every inconsistency flagged, every concept scored.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <AppHeader />
        <main id="main">{children}</main>
        <footer className="app-footer">
          <div className="app-footer-inner">
            <Link href="/" className="brand" aria-label="Edvance home">
              <Logo idSuffix="footer" size={32} />
            </Link>
            <p className="footer-note">
              Evidence-first course intelligence. Accounts and sessions are real
              — stored in local PostgreSQL. Course analysis still runs on mock
              data until live AI processing lands.
            </p>
            <div className="footer-tools">
              <Link
                className="icon-btn icon-btn--quiet"
                href="/#questions"
                aria-label="The four questions Edvance answers"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M9.6 9a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.8-.9 1.4v.4" />
                  <path d="M12 17h.01" />
                </svg>
              </Link>
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
              <Link
                className="icon-btn"
                href="/signup"
                aria-label="Create an account"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M5 12h14" />
                  <path d="m13 6 6 6-6 6" />
                </svg>
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
