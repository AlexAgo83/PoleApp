import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: { id: string };
  searchParams?: { from?: string };
};

export const dynamic = "force-dynamic";

export default async function TeacherCourseDetailPage({
  params,
  searchParams,
}: PageProps) {
  const id = params?.id;
  const session = await getServerSession(authOptions);
  if (!session?.user?.schoolId) {
    return notFound();
  }

  if (!id) {
    return notFound();
  }

  const course = await prisma.course.findUnique({
    where: { id, schoolId: session.user.schoolId },
    include: {
      teacher: { select: { name: true, email: true } },
      attendances: {
        include: { student: { select: { name: true, email: true } } },
      },
      positions: { include: { position: true } },
      notes: {
        include: {
          student: { select: { name: true, email: true } },
          position: true,
        },
      },
    },
  });

  if (!course) {
    return notFound();
  }

  const teacherName =
    course.teacher?.name ?? course.teacher?.email ?? "Professeur";
  const rawFrom = searchParams?.from;
  const safeFrom =
    rawFrom && rawFrom.startsWith("/") && !rawFrom.startsWith("//")
      ? rawFrom
      : undefined;
  const backHref = safeFrom ?? "/app/teacher/courses";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="panel flex flex-wrap items-center justify-between gap-3 p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">
            Professeur / Admin
          </p>
          <h1 className="text-3xl font-semibold text-white">
            {course.title ?? "Cours sans titre"}
          </h1>
          <p className="text-sm text-slate-300">
            {new Date(course.date).toLocaleString()} · {teacherName}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/app/teacher/courses/new"
            className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-400"
          >
            Nouveau cours
          </Link>
          <Link
            href={`/app/teacher/courses/${course.id}/edit${
              safeFrom ? `?from=${encodeURIComponent(safeFrom)}` : ""
            }`}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            Éditer
          </Link>
          <Link
            href={backHref}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            Retour liste
          </Link>
        </div>
      </header>

      <section className="panel p-6">
        <h2 className="text-lg font-semibold text-white">Positions</h2>
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          {course.positions.map((cp) => (
            <li
              key={cp.id}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-slate-200"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-white">
                  {cp.position.name}
                </span>
                {cp.position.type ? (
                  <span className="text-xs uppercase tracking-[0.12em] text-cyan-200">
                    {cp.position.type}
                  </span>
                ) : null}
              </div>
            </li>
          ))}
          {course.positions.length === 0 && (
            <li className="text-slate-300">Aucune position associée.</li>
          )}
        </ul>
      </section>

      <section className="panel p-6">
        <h2 className="text-lg font-semibold text-white">Participants</h2>
        <ul className="mt-3 space-y-2">
          {course.attendances.map((attendance) => (
            <li
              key={attendance.id}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-slate-200"
            >
              {attendance.student?.name ?? attendance.student?.email ?? "Élève"}
            </li>
          ))}
          {course.attendances.length === 0 && (
            <li className="text-slate-300">Aucun élève rattaché.</li>
          )}
        </ul>
      </section>

      <section className="panel p-6">
        <h2 className="text-lg font-semibold text-white">Notes</h2>
        {course.notes.length === 0 ? (
          <p className="text-slate-300">Aucune note pour ce cours.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm text-slate-200">
            {course.notes.map((note) => (
              <li
                key={note.id}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-white">
                      {note.student?.name ?? note.student?.email ?? "Élève"}
                    </p>
                    <p className="text-xs text-slate-300">
                      {note.position.name}
                    </p>
                  </div>
                  <span className="text-xs uppercase tracking-[0.12em] text-cyan-200">
                    {note.masteryLevel}
                  </span>
                </div>
                {note.comment && (
                  <p className="mt-1 text-slate-300">{note.comment}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
