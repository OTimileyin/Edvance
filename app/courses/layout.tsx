"use client";

import { SessionGuard } from "@/components/session-guard";

export default function CoursesLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionGuard>
      <div className="container page-pad">{children}</div>
    </SessionGuard>
  );
}