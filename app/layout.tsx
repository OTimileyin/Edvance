import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { AppHeader } from "@/components/header";

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
  description: "Evidence-first assessment intelligence for learners.",
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
            <span className="brand">
              <span className="brand-seal" aria-hidden="true">
                e
              </span>
              <span className="brand-mark">Edvance</span>
            </span>
            <span>
              Evidence-first course intelligence · demo build with mock data — no
              backend or live AI involved.
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
