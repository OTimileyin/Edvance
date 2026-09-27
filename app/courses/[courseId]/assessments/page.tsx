"use client";

import { useParams } from "next/navigation";
import { useCourse } from "@/lib/useCourses";
import { AddAssessmentForm } from "@/components/add-assessment-form";

export default function CourseAssessments() {
  const params = useParams<{ courseId: string }>();
  const { course, ready, reload } = useCourse(params.courseId);

  if (!ready) return null;
  if (!course) return null;

  return (
    <>
      <section className="section">
        <span className="kicker">Questions to answer</span>
        <h1 className="page-title">Assessments</h1>
        <p className="page-lede">
          Assessment questions gathered for {course.name}. Each one can later be linked to the
          concepts and sources it tests.
        </p>
      </section>

      <section className="section" aria-labelledby="assessment-list-heading">
        <h2 className="section-heading" id="assessment-list-heading">
          Assessment questions
        </h2>
        {course.assessments.length === 0 ? (
          <div className="empty-state">No assessment questions added yet.</div>
        ) : (
          <div className="item-list">
            {course.assessments.map((assessment) => (
              <article key={assessment.id} className="item">
                <p className="item-title">{assessment.question}</p>
                <div className="item-meta">
                  <span className="badge badge-neutral">Assessment</span>
                  <span>{assessment.lesson}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="section" aria-labelledby="add-assessment-heading">
        <h2 className="section-heading" id="add-assessment-heading">
          Add an assessment question
        </h2>
        <AddAssessmentForm courseId={course.id} onAdded={reload} />
      </section>
    </>
  );
}