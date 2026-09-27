"use client";

import { useParams } from "next/navigation";
import { useCourse } from "@/lib/useCourses";
import { ConceptBadge } from "@/components/badges";

export default function CourseMastery() {
  const params = useParams<{ courseId: string }>();
  const { course, ready } = useCourse(params.courseId);

  if (!ready) return null;
  if (!course) return null;

  const mastered = course.concepts.filter((concept) => concept.status === "Mastered").length;
  const developing = course.concepts.filter((concept) => concept.status === "Developing").length;
  const weak = course.concepts.filter((concept) => concept.status === "Weak").length;

  return (
    <>
      <section className="section">
        <span className="kicker">Learner state</span>
        <h1 className="page-title">Mastery</h1>
        <p className="page-lede">
          Per-concept status for {course.name}, based on practice performance and self-assessment
          (demo data).
        </p>
      </section>

      {course.concepts.length === 0 ? (
        <div className="empty-state">
          No concepts in this workspace yet. Concepts are extracted from course materials in a
          later phase.
        </div>
      ) : (
        <>
          <section className="section" aria-label="Mastery summary">
            <div className="chip-row">
              <span className="chip">Mastered · {mastered}</span>
              <span className="chip">Developing · {developing}</span>
              <span className="chip">Weak · {weak}</span>
            </div>
          </section>

          <section className="section" aria-labelledby="mastery-table-heading">
            <h2 className="section-heading" id="mastery-table-heading">
              Concept breakdown
            </h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Concept</th>
                    <th scope="col">Status</th>
                    <th scope="col">Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {course.concepts.map((concept) => (
                    <tr key={concept.name}>
                      <td>{concept.name}</td>
                      <td>
                        <ConceptBadge status={concept.status} />
                      </td>
                      <td>
                        <div className="goal">
                          <span className="progress-track">
                            <span
                              className={`progress-fill ${fillClass(concept.status)}`}
                              style={{ width: `${concept.score}%` }}
                            />
                          </span>
                          <span className="sr-only">{concept.score}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
}

function fillClass(status: string): string {
  if (status === "Mastered") return "progress-mastered";
  if (status === "Developing") return "progress-developing";
  return "progress-weak";
}