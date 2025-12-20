import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function formatDuration(minutes: number) {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0) {
    return `${hrs}h${mins.toString().padStart(2, "0")}`;
  }
  return `${mins} min`;
}

type PageProps =
  | { params: { id: string }; searchParams?: Promise<{ from?: string }> }
  | { params: Promise<{ id?: string }>; searchParams?: Promise<{ from?: string }> };

export const dynamic = "force-dynamic";

export default async function StudentCourseDetailPage({
  params,
  searchParams,
}: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const id = resolvedParams?.id;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return notFound();
  }

  if (!id || !session.user.schoolId) {
    return notFound();
  }

  const course = await prisma.course.findUnique({
    where: {
      id,
      schoolId: session.user.schoolId,
      attendances: { some: { studentId: session.user.id } },
    },
    include: {
      teacher: { select: { name: true, email: true } },
      studio: { select: { name: true, address: true } },
      positions: { include: { position: true } },
      notes: {
        where: { studentId: session.user.id },
        include: { position: true },
      },
    },
  });

  if (!course) {
    return notFound();
  }

  const teacherName =
    course.teacher?.name ?? course.teacher?.email ?? "Professeur";
  const resolvedSearch = (await searchParams) ?? {};
  const rawFrom = resolvedSearch.from;
  const safeFrom =
    rawFrom && rawFrom.startsWith("/") && !rawFrom.startsWith("//")
      ? rawFrom
      : undefined;
  const backHref = safeFrom ?? "/app/student/courses";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="panel flex flex-wrap items-center justify-between gap-3 border-indigo-400/25 p-6 shadow-indigo-900/30">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-indigo-100">
            Élève
          </p>
          <h1 className="text-3xl font-semibold text-white">
            {course.title ?? "Cours"}
          </h1>
          <p className="text-sm text-slate-200">
            {teacherName}
          </p>
          <p className="text-sm text-slate-200">
            {new Date(course.date).toLocaleString()}
          </p>
          <p className="text-sm text-slate-200">
            Durée : {formatDuration(course.durationMinutes ?? 60)}
          </p>
          {course.studio?.name && (
            <p className="mt-1 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-cyan-100">
              Studio · {course.studio.name}
              {course.studio.address ? (
                <span className="text-[11px] text-slate-200">({course.studio.address})</span>
              ) : null}
            </p>
          )}
        </div>
        <Link
          href={backHref}
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-indigo-300/70 hover:bg-white/10"
        >
          Retour à mes cours
        </Link>
      </header>

      <section className="panel border-indigo-400/15 p-6">
        <h2 className="text-lg font-semibold text-white">Positions couvertes</h2>
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          {course.positions.map((cp) => (
            <li
              key={cp.id}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-slate-200"
            >
              <span className="font-semibold text-white">{cp.position.name}</span>
              {cp.position.type ? (
                <span className="ml-2 text-xs uppercase tracking-[0.12em] text-cyan-200">
                  {cp.position.type}
                </span>
              ) : null}
            </li>
          ))}
          {course.positions.length === 0 && (
            <li className="text-slate-300">Aucune position associée.</li>
          )}
        </ul>
      </section>

      <section className="panel border-indigo-400/15 p-6">
        <h2 className="text-lg font-semibold text-white">Notes / progression</h2>
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
                  <span className="font-semibold text-white">
                    {note.position.name}
                  </span>
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
