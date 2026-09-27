"use client";

import { useEffect, useRef, useState } from "react";
import { createCourse, getCourses } from "@/lib/store";
import { DEMO_COURSES } from "@/lib/demo-data";

const SEED_FLAG = "edvance.seeded.v1";

/**
 * The courses layout guarantees a Better Auth session, so children can rely
 * on the signed-in user. On first visit we seed the demo workspaces.
 */
export function UserBootstrapper({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const didSeed = useRef(false);

  useEffect(() => {
    if (didSeed.current) return;
    didSeed.current = true;
    const seeded = window.localStorage.getItem(SEED_FLAG);
    if (!seeded || !seeded.includes(email)) {
      if (getCourses(email).length === 0) {
        for (const demo of DEMO_COURSES) {
          createCourse(email, demo);
        }
      }
      window.localStorage.setItem(SEED_FLAG, JSON.stringify([email]));
    }
    setReady(true);
  }, [email]);

  if (!ready) {
    return <p className="page-lede" aria-live="polite">Preparing your workspaces…</p>;
  }

  return <div className="container page-pad">{children}</div>;
}
