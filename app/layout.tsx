import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { AppHeader } from "@/components/header";
import { AppUpdateBanner } from "@/components/app-update-banner";
import { Logo } from "@/components/logo";
import { PwaRegister } from "@/components/pwa-register";

const nunito = Nunito({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-nunito-stack",
});

const fredoka = Fredoka({
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
  variable: "--font-fredoka-stack",
});

export const metadata: Metadata = {
  title: "Oyevolve — Course Intelligence",
  description:
    "Evidence-first assessment intelligence: every question mapped to the lesson that taught it, every inconsistency flagged, every concept scored.",
  metadataBase: new URL("https://white-whale.spcf.app"),
  openGraph: {
    type: "website",
    siteName: "Oyevolve",
    title: "Oyevolve — Course Intelligence",
    description:
      "Evidence-first assessment intelligence: every question mapped to the lesson that taught it, every inconsistency flagged, every concept scored.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Oyevolve — evidence-first assessment intelligence",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Oyevolve — Course Intelligence",
    description:
      "Evidence-first assessment intelligence: every question mapped to the lesson that taught it, every inconsistency flagged, every concept scored.",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#1E2A6B",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${nunito.variable} ${fredoka.variable}`}>
      <body>
        <PwaRegister />
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <AppHeader />
        <main id="main">
          {/*
            Renders only inside the Android app, and only when its installed
            build is older than the published one. Everywhere else — browser,
            installed web app — it is null.
          */}
          <AppUpdateBanner />
          {children}
        </main>
        <footer className="app-footer">
          <div className="app-footer-inner">
            <Link href="/" className="brand" aria-label="Oyevolve home">
              <Logo idSuffix="footer" size={32} />
            </Link>
            <p className="footer-note">
              Evidence-first course intelligence. Accounts, private file storage and analysis are
              real — PostgreSQL, object storage, and an AI provider called only from the server.
              Seeded demo content is labelled as demo.
            </p>
            <nav className="footer-links" aria-label="Legal">
              <Link href="/privacy">Privacy</Link>
              <span aria-hidden="true"> · </span>
              <Link href="/terms">Terms</Link>
              <span aria-hidden="true"> · </span>
              <Link href="/account">Account</Link>
            </nav>
            <div className="footer-tools">
              <Link
                className="icon-btn icon-btn--quiet"
                href="/#questions"
                aria-label="The four questions Oyevolve answers"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M9.6 9a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.8-.9 1.4v.4" />
                  <path d="M12 17h.01" />
                </svg>
              </Link>
              <Link className="icon-btn icon-btn--quiet" href="/signin" aria-label="Sign in">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="8" r="3.4" />
                  <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
                </svg>
              </Link>
              <Link className="icon-btn" href="/signup" aria-label="Create an account">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
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
