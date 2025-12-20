import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function StudentCoursesPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string }>;
}) {
  const resolvedParams = (await searchParams) ?? {};
  const rawPage = Number(resolvedParams.page ?? "1");
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return null;
  }

  const totalCount = await prisma.courseAttendance.count({
    where: { studentId: session.user.id },
  });
  const totalPages = Math.max(1, Math.ceil(totalCount / 10));
  const currentPage = Math.min(Math.max(1, rawPage || 1), totalPages);
  const skip = (currentPage - 1) * 10;

  const attendances = await prisma.courseAttendance.findMany({
    where: { studentId: session.user.id },
    orderBy: { course: { date: "desc" } },
    skip,
    take: 10,
    include: {
      course: {
        include: {
          teacher: { select: { name: true, email: true } },
          positions: { include: { position: true } },
          notes: {
            where: { studentId: session.user.id },
            include: { position: true },
          },
        },
      },
    },
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="panel border-indigo-400/25 p-6 shadow-indigo-900/30">
        <p className="text-xs uppercase tracking-[0.14em] text-indigo-100">
          Élève
        </p>
        <h1 className="text-3xl font-semibold text-white">Mes cours</h1>
        <p className="text-sm text-slate-200">
          Historique des cours suivis. Page {currentPage} / {totalPages} · {totalCount} entrées
        </p>
      </header>

      <section className="panel border-indigo-400/15 p-6">
        <div className="flex flex-col divide-y divide-white/5">
          {attendances.map((attendance) => {
            const course = attendance.course;
            return (
              <a
                key={attendance.id}
                href={`/app/student/courses/${course.id}?from=${encodeURIComponent(
                  `/app/student/courses?page=${currentPage}`
                )}`}
                className="group block rounded-xl transition hover:-translate-y-0.5 hover:bg-indigo-500/10"
              >
                <article className="flex flex-col gap-2 py-3 px-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-base font-semibold text-white">
                        {course.title ?? "Cours"}
                      </p>
                      <div className="flex flex-col text-sm text-slate-300">
                        <span>{course.teacher?.name ?? course.teacher?.email ?? "Professeur"}</span>
                        <span>{new Date(course.date).toLocaleString()}</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">
                      {course.positions.length} positions
                    </p>
                  </div>
                  {course.notes.length > 0 && (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
                      <p className="text-xs uppercase tracking-[0.08em] text-cyan-200">
                        Notes
                      </p>
                      <ul className="mt-1 space-y-1">
                        {course.notes.map((note) => (
                          <li key={note.id}>
                            {note.position.name}: {note.masteryLevel}
                            {note.comment ? ` — ${note.comment}` : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </article>
              </a>
            );
          })}
          {attendances.length === 0 && (
            <div className="mt-2 rounded-2xl border border-dashed border-white/15 bg-white/5 p-4 text-sm text-slate-200">
              Aucun cours trouvé. Tes prochains cours apparaîtront ici.
            </div>
          )}
        </div>
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <Link
              href={`/app/student/courses?page=${Math.max(1, currentPage - 1)}`}
              className={`rounded-full px-3 py-2 text-sm font-semibold ${
                currentPage === 1
                  ? "cursor-not-allowed border border-white/10 text-slate-500"
                  : "border border-white/10 text-white hover:border-cyan-400/70 hover:bg-white/5"
              }`}
              aria-disabled={currentPage === 1}
            >
              Précédent
            </Link>
            <span className="text-sm text-slate-300">
              Page {currentPage} / {totalPages}
            </span>
            <Link
              href={`/app/student/courses?page=${Math.min(totalPages, currentPage + 1)}`}
              className={`rounded-full px-3 py-2 text-sm font-semibold ${
                currentPage === totalPages
                  ? "cursor-not-allowed border border-white/10 text-slate-500"
                  : "border border-white/10 text-white hover:border-cyan-400/70 hover:bg-white/5"
              }`}
              aria-disabled={currentPage === totalPages}
            >
              Suivant
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
