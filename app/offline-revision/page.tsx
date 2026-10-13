"use client";

import { useEffect, useState } from "react";
import { ConceptBadge } from "@/components/badges";
import {
  clearRevisionSnapshots,
  loadRevisionSnapshots,
  type RevisionSnapshot,
} from "@/lib/offline-revision";

/**
 * Saved revision lists, readable without a connection.
 *
 * The revision tab keeps a local copy of each course's revision list on this
 * device; this page is where those copies can be studied offline. Everything
 * shown is a snapshot taken while online — practising, recording attempts and
 * regenerating practice all still need a connection. The learner can wipe
 * every saved list from this page.
 */
export default function OfflineRevisionPage() {
  const [snapshots, setSnapshots] = useState<RevisionSnapshot[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    loadRevisionSnapshots()
      .then((rows) => {
        if (alive) setSnapshots(rows);
      })
      .catch(() => {
        if (alive) setLoadFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  async function handleClear() {
    await clearRevisionSnapshots().catch(() => {});
    setSnapshots([]);
  }

  return (
    <>
      <section className="section">
        <span className="kicker">Offline study</span>
        <h1 className="page-title">Saved revision lists</h1>
        <p className="page-lede">
          The revision lists saved on this device, for studying without a connection. Each copy was
          saved while you were online; nothing here updates until you reconnect.
        </p>
        <div className="alert alert-neutral" style={{ marginTop: "1rem" }}>
          <p>
            Reading works offline. Practising, recording attempts, and generating new practice all
            need a connection — and none of them happen silently in the background.
          </p>
        </div>
      </section>

      {loadFailed && (
        <section className="section">
          <div className="alert alert-warning">
            <p>Saved lists could not be read on this device. Reconnect and try again.</p>
          </div>
        </section>
      )}

      {snapshots !== null && snapshots.length === 0 && (
        <section className="section">
          <div className="empty-state">
            No revision lists are saved on this device yet. Open a course&rsquo;s Revision tab while
            you are online — its list is saved automatically.
          </div>
        </section>
      )}

      {snapshots?.map((snapshot) => (
        <section className="section" key={snapshot.courseId} aria-label={snapshot.courseName}>
          <h2 className="section-heading">{snapshot.courseName}</h2>
          <p className="form-hint">
            Saved {new Date(snapshot.savedAt).toLocaleString()}
            {snapshot.generatedAt &&
              ` · practice generated ${new Date(snapshot.generatedAt).toLocaleString()}`}
          </p>

          <div
            className={snapshot.focus.length > 0 ? "alert alert-warning" : "alert alert-neutral"}
          >
            <p>{snapshot.nextAction}</p>
          </div>

          <h3 className="section-heading" style={{ marginTop: "1.25rem" }}>
            What needs work
          </h3>
          {snapshot.focus.length === 0 ? (
            <div className="empty-state">
              Nothing was weak or untested when this list was saved. Keep practising to hold the
              concepts at Mastered.
            </div>
          ) : (
            <div className="item-list">
              {snapshot.focus.map((entry) => (
                <article key={entry.conceptId} className="item">
                  <div className="item-meta">
                    <ConceptBadge status={entry.status} />
                    <span>{entry.name}</span>
                  </div>
                  <p>{entry.reason}</p>
                  {entry.evidence.length > 0 && (
                    <p className="form-hint">
                      Taught in{" "}
                      {entry.evidence
                        .map(
                          (reference) => `${reference.materialTitle} (${reference.sourceLocation})`,
                        )
                        .join("; ")}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}

          <h3 className="section-heading" style={{ marginTop: "1.25rem" }}>
            Targeted practice
          </h3>
          {snapshot.practiceQuestions.length === 0 ? (
            <div className="empty-state">
              No practice was generated for this list yet. Generate it from the Revision tab while
              you are online.
            </div>
          ) : (
            <div className="item-list">
              {snapshot.practiceQuestions.map((question) => (
                <article key={question.id} className="item">
                  <p>
                    <strong>{question.question}</strong>
                  </p>
                  {question.conceptName && (
                    <p className="form-hint">Concept: {question.conceptName}</p>
                  )}
                  {question.materialTitle && (
                    <p className="form-hint">
                      {question.materialTitle}
                      {question.sourceLocation ? ` (${question.sourceLocation})` : ""}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      ))}

      {snapshots !== null && snapshots.length > 0 && (
        <section className="section">
          <button type="button" className="btn btn-secondary" onClick={handleClear}>
            Clear saved lists from this device
          </button>
        </section>
      )}
    </>
  );
}
