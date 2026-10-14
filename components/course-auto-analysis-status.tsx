"use client";

import { useEffect, useState } from "react";
import { resumeAutomaticAnalysis } from "@/lib/automatic-analysis";

interface AutoAnalysisEvent {
  courseId: string;
  state: "waiting" | "analysing" | "ready" | "failed";
  message: string;
}

export function CourseAutoAnalysisStatus({ courseId }: { courseId: string }) {
  const [status, setStatus] = useState<AutoAnalysisEvent | null>(null);

  useEffect(() => {
    function onStatus(event: Event) {
      const detail = (event as CustomEvent<AutoAnalysisEvent>).detail;
      if (detail?.courseId === courseId) setStatus(detail);
    }
    window.addEventListener("oyevolve:auto-analysis", onStatus);
    void resumeAutomaticAnalysis(courseId);
    return () => window.removeEventListener("oyevolve:auto-analysis", onStatus);
  }, [courseId]);

  useEffect(() => {
    if (status?.state !== "ready") return;
    const timer = setTimeout(() => setStatus(null), 8_000);
    return () => clearTimeout(timer);
  }, [status]);

  if (!status) return null;
  const className = status.state === "failed" ? "alert alert-warning" : "alert alert-neutral";
  return (
    <p className={className} role={status.state === "failed" ? "alert" : "status"}>
      {status.message}
    </p>
  );
}
