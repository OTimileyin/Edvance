"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { SessionGuard } from "@/components/session-guard";
import { useCourse } from "@/lib/useCourses";

export default function CourseWorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionGuard>
      <WorkspaceShell>{children}</WorkspaceShell>
    </SessionGuard>
  );
}

function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams<{ courseId: string }>();
  const { course, ready } = useCourse(params.courseId);

  if (!ready) {
    return <p aria-live="polite">Loading workspace…</p>;
  }

  if (!course) {
    return (
      <section className="card">
        <h1 className="page-title">Course not found</h1>
        <p className="page-lede">The workspace you opened does not exist in this demo.</p>
        <p className="card-meta" style={{ marginTop: 16 }}>
          <Link className="btn btn-secondary" href="/courses">
            Back to courses
          </Link>
        </p>
      </section>
    );
  }

  const tabs = [
    {
      href: `/courses/${course.id}`,
      label: "Overview",
      active: pathname === `/courses/${course.id}`,
    },
    {
      href: `/courses/${course.id}/sources`,
      label: "Sources",
      active: pathname.startsWith(`/courses/${course.id}/sources`),
    },
    {
      href: `/courses/${course.id}/intelligence`,
      label: "Intelligence",
      active: pathname.startsWith(`/courses/${course.id}/intelligence`),
    },
    {
      href: `/courses/${course.id}/assessments`,
      label: "Assessments",
      active: pathname.startsWith(`/courses/${course.id}/assessments`),
    },
    {
      href: `/courses/${course.id}/mastery`,
      label: "Mastery",
      active: pathname.startsWith(`/courses/${course.id}/mastery`),
    },
    {
      href: `/courses/${course.id}/revision`,
      label: "Revision",
      active: pathname.startsWith(`/courses/${course.id}/revision`),
    },
  ];

  return (
    <>
      <nav className="crumb" aria-label="Breadcrumb">
        <Link href="/courses">Courses</Link>
        <span aria-hidden="true"> / </span>
        <span>{course.name}</span>
      </nav>
      <div className="workspace">
        <nav aria-label="Workspace sections" className="workspace-nav">
          {tabs.map((tab) => (
            <Link key={tab.href} href={tab.href} className={tab.active ? "nav-active" : undefined}>
              {tab.label}
            </Link>
          ))}
        </nav>
        <div className="workspace-content">{children}</div>
      </div>
    </>
  );
}
