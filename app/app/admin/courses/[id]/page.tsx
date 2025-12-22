import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CourseNotesEditor } from "../../../teacher/courses/[id]/CourseNotesEditor";
import { updateCourseNotesOnlyAction } from "../../../teacher/courses/[id]/actions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { id: string } | Promise<{ id?: string }>;
  searchParams?: Promise<{ from?: string }>;
};

export default async function AdminCourseDetailPage({ params, searchParams }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const id = resolvedParams?.id;
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SCHOOL_ADMIN" || !session.user.schoolId) {
    redirect("/access-denied");
  }
  if (!id) {
    return notFound();
  }

  const course = await prisma.course.findFirst({
    where: { id, schoolId: session.user.schoolId },
    include: {
      teacher: { select: { id: true, name: true, email: true } },
      studio: { select: { name: true, address: true } },
      attendances: {
        include: { student: { select: { id: true, name: true, email: true } } },
      },
      positions: { include: { position: true } },
      notes: {
        include: {
          student: { select: { id: true, name: true, email: true } },
          position: true,
        },
      },
      _count: { select: { attendances: true } },
    },
  });

  if (!course) {
    return notFound();
  }

  const resolvedSearch = (await searchParams) ?? {};
  const rawFrom = resolvedSearch.from;
  const safeFrom = rawFrom && rawFrom.startsWith("/") && !rawFrom.startsWith("//") ? rawFrom : undefined;
  const backHref = safeFrom ?? "/app/admin";
  const formattedDate = new Date(course.date).toLocaleString("fr-FR", {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const teacherName = course.teacher?.name ?? course.teacher?.email ?? "Professeur";
  const cost = course.costCredits ?? 100;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-3 px-0 py-6 md:gap-6 md:px-8 md:py-10">
      <header className="panel space-y-3 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Admin école</p>
            <h1 className="text-3xl font-semibold text-white">
              {course.title ?? "Cours"} · {formattedDate}
            </h1>
            <p className="text-sm text-slate-300">
              {teacherName} · {course.studio?.name ?? "Studio non renseigné"} · {course._count.attendances} élève(s) · {cost} crédits
            </p>
          </div>
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            ← Retour admin
          </Link>
        </div>
      </header>

      <section className="panel border-indigo-400/15 p-6">
        <h2 className="text-lg font-semibold text-white">Participants</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-200">
          {course.attendances.map((attendance) => (
            <li key={attendance.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <span className="font-semibold text-white">
                {attendance.student?.name ?? attendance.student?.email ?? "Élève"}
              </span>
              {attendance.student?.id && (
                <Link
                  href={`/app/teacher/students/${attendance.student.id}?from=/app/admin/courses/${course.id}`}
                  className="text-xs text-cyan-100 underline underline-offset-2"
                >
                  Fiche élève
                </Link>
              )}
            </li>
          ))}
          {course.attendances.length === 0 && <li className="text-slate-300">Aucun élève rattaché.</li>}
        </ul>
      </section>

      <section className="panel border-indigo-400/15 p-6">
        <h2 className="text-lg font-semibold text-white">Notes (admin)</h2>
        <p className="text-sm text-slate-300">
          Met à jour les niveaux/commentaires par élève × position. La progression est synchronisée automatiquement.
        </p>
        <div className="mt-3">
          <CourseNotesEditor
            students={course.attendances
              .filter((a) => a.student?.id)
              .map((a) => ({
                id: a.student!.id,
                name: a.student?.name ?? a.student?.email ?? "Élève",
                email: a.student?.email ?? null,
              }))}
            positions={course.positions
              .filter((p) => p.position.id)
              .map((p) => ({
                id: p.position.id,
                name: p.position.name,
                type: p.position.type ?? null,
              }))}
            existingNotes={course.notes.map((n) => ({
              studentId: n.studentId,
              positionId: n.positionId,
              masteryLevel: n.masteryLevel,
              comment: n.comment,
            }))}
            courseId={course.id}
            action={updateCourseNotesOnlyAction}
          />
        </div>
      </section>
    </main>
  );
}
