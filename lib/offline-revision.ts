import type { PracticeQuestion, RevisionFocus, RevisionPlan } from "@/lib/types";

/**
 * Offline revision snapshots — saved revision lists for study without a
 * connection.
 *
 * This is a deliberate, learner-visible cache of the revision tab's lists,
 * kept in its own Cache Storage bucket so the service worker never has to
 * cache authenticated API traffic. Only what a learner needs to revise is
 * stored: the next action, the focus concepts with their evidence locations,
 * and the generated practice questions. No sessions, no signed storage URLs,
 * no model traffic.
 *
 * The service worker preserves this bucket on activation (it only clears its
 * own `edvance-shell-*` caches), and the learner can wipe it from the
 * offline revision page at any time.
 */

const CACHE_NAME = "edvance-revision-v1";
const KEY_PREFIX = "/offline-revision-data/";

/** The parts of a revision plan worth studying offline. */
export interface RevisionSnapshot {
  courseId: string;
  courseName: string;
  /** When this copy was saved on the device (ISO timestamp). */
  savedAt: string;
  nextAction: string;
  generatedAt: string | null;
  focus: RevisionFocus[];
  practiceQuestions: PracticeQuestion[];
}

function supported(): boolean {
  return typeof window !== "undefined" && "caches" in window;
}

/** Save (or overwrite) this course's revision list on the device. */
export async function saveRevisionSnapshot(
  courseId: string,
  courseName: string,
  plan: RevisionPlan,
): Promise<void> {
  if (!supported()) return;
  const snapshot: RevisionSnapshot = {
    courseId,
    courseName,
    savedAt: new Date().toISOString(),
    nextAction: plan.nextAction,
    generatedAt: plan.generatedAt,
    focus: plan.focus,
    practiceQuestions: plan.practiceQuestions,
  };
  const cache = await caches.open(CACHE_NAME);
  await cache.put(
    KEY_PREFIX + courseId,
    new Response(JSON.stringify(snapshot), {
      headers: { "content-type": "application/json" },
    }),
  );
}

/** Every revision list saved on this device, most recently saved first. */
export async function loadRevisionSnapshots(): Promise<RevisionSnapshot[]> {
  if (!supported()) return [];
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  const snapshots: RevisionSnapshot[] = [];
  for (const request of keys) {
    const response = await cache.match(request);
    if (!response) continue;
    try {
      snapshots.push((await response.json()) as RevisionSnapshot);
    } catch {
      // A damaged entry is simply not shown; saving again replaces it.
    }
  }
  return snapshots.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

/** Wipe every saved revision list from this device. */
export async function clearRevisionSnapshots(): Promise<void> {
  if (!supported()) return;
  await caches.delete(CACHE_NAME);
}
