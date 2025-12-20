import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function StudentCoursesPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; from?: string; to?: string; teacher?: string; withNotes?: string; sort?: string }>;
}) {
  const resolvedParams = (await searchParams) ?? {};
  const rawPage = Number(resolvedParams.page ?? "1");
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return null;
  }

  const teacherFilter =
    typeof resolvedParams.teacher === "string" && resolvedParams.teacher.length > 0
      ? resolvedParams.teacher
      : undefined;
  const fromDate = resolvedParams.from ? new Date(resolvedParams.from) : undefined;
  const toDate = resolvedParams.to ? new Date(resolvedParams.to) : undefined;
  const validFrom = fromDate && !Number.isNaN(fromDate.getTime()) ? fromDate : undefined;
  const validTo = toDate && !Number.isNaN(toDate.getTime()) ? toDate : undefined;
  const withNotes = resolvedParams.withNotes === "true";
  const sort = resolvedParams.sort === "date_asc" ? "date_asc" : "date_desc";
  const activeFilters = [
    validFrom,
    validTo,
    teacherFilter,
    withNotes ? "notes" : null,
    sort === "date_asc" ? "sort" : null,
  ].filter(Boolean).length;

  const whereClause = {
    studentId: session.user.id,
    course: {
      ...(validFrom ? { date: { gte: validFrom } } : {}),
      ...(validTo ? { date: { lte: validTo } } : {}),
      ...(teacherFilter ? { teacherId: teacherFilter } : {}),
      ...(withNotes ? { notes: { some: { studentId: session.user.id } } } : {}),
    },
  };

  const totalCount = await prisma.courseAttendance.count({
    where: whereClause,
  });
  const totalPages = Math.max(1, Math.ceil(totalCount / 10));
  const currentPage = Math.min(Math.max(1, rawPage || 1), totalPages);
  const skip = (currentPage - 1) * 10;

  const [attendances, teachers] = await Promise.all([
    prisma.courseAttendance.findMany({
      where: whereClause,
      orderBy: { course: { date: sort === "date_desc" ? "desc" : "asc" } },
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
    }),
    session.user.schoolId
      ? prisma.user.findMany({
          where: { schoolId: session.user.schoolId, role: "TEACHER" },
          select: { id: true, name: true, email: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const queryParams = new URLSearchParams();
  if (resolvedParams.from) queryParams.set("from", resolvedParams.from);
  if (resolvedParams.to) queryParams.set("to", resolvedParams.to);
  if (teacherFilter) queryParams.set("teacher", teacherFilter);
  if (withNotes) queryParams.set("withNotes", "true");
  if (sort === "date_asc") queryParams.set("sort", "date_asc");
  const qs = queryParams.toString();

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

      <section className="panel space-y-4 border-indigo-400/15 p-6">
        <details className="group" open>
          <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-white">
            <span className="inline-flex items-center gap-2">
              <span>Filtres</span>
              {activeFilters > 0 && (
                <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[11px] font-semibold text-cyan-100">
                  {activeFilters}
                </span>
              )}
            </span>
            <span className="text-xs text-slate-300 transition-transform group-open:rotate-180">
              ▼
            </span>
          </summary>
          <form
            key={`filters-${resolvedParams.from ?? ""}-${resolvedParams.to ?? ""}-${teacherFilter ?? "all"}-${withNotes ? "notes" : "all"}`}
            method="get"
            className="mt-3 grid w-full gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-indigo-900/20 md:grid-cols-4 md:items-end"
          >
            <label className="text-sm text-slate-200">
              Date min
              <input
                type="date"
                name="from"
                defaultValue={resolvedParams.from}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              />
            </label>
            <label className="text-sm text-slate-200">
              Date max
              <input
                type="date"
                name="to"
                defaultValue={resolvedParams.to}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              />
            </label>
            <label className="text-sm text-slate-200">
              Professeur
              <select
                key={teacherFilter ?? "all-teachers"}
                name="teacher"
                defaultValue={teacherFilter ?? ""}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              >
                <option value="">Tous les professeurs</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name ?? t.email}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-200">
              Tri
              <select
                name="sort"
                defaultValue={sort}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              >
                <option value="date_desc">Date descendante</option>
                <option value="date_asc">Date ascendante</option>
              </select>
            </label>
            <label className="mt-1 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-200">
              <input
                type="checkbox"
                name="withNotes"
                value="true"
                defaultChecked={withNotes}
                key={withNotes ? "with-notes" : "all-courses"}
                className="h-4 w-4 rounded border-white/20 bg-white/5"
              />
              Cours avec notes
            </label>
            <div className="md:col-span-4 flex flex-wrap items-center justify-end gap-2">
              <button
                type="submit"
                className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-400"
              >
                Filtrer
              </button>
              <Link
                href="/app/student/courses"
                className="rounded-full border border-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
              >
                Réinitialiser
              </Link>
            </div>
          </form>
        </details>
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
              href={`/app/student/courses?page=${Math.max(1, currentPage - 1)}${
                qs ? `&${qs}` : ""
              }`}
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
              href={`/app/student/courses?page=${Math.min(totalPages, currentPage + 1)}${
                qs ? `&${qs}` : ""
              }`}
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
