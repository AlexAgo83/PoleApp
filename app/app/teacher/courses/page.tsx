import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 10;

export const dynamic = "force-dynamic";

export default async function TeacherCoursesPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; from?: string; to?: string; teacher?: string; withNotes?: string; studio?: string }>;
}) {
  const resolvedParams = (await searchParams) ?? {};
  const rawPage = Number(resolvedParams.page ?? "1");
  const teacherFilter = typeof resolvedParams.teacher === "string" ? resolvedParams.teacher : undefined;
  const studioFilter =
    typeof resolvedParams.studio === "string" && resolvedParams.studio.length > 0
      ? resolvedParams.studio
      : undefined;
  const fromDate = resolvedParams.from ? new Date(resolvedParams.from) : undefined;
  const toDate = resolvedParams.to ? new Date(resolvedParams.to) : undefined;
  const validFrom = fromDate && !Number.isNaN(fromDate.getTime()) ? fromDate : undefined;
  const validTo = toDate && !Number.isNaN(toDate.getTime()) ? toDate : undefined;
  const withNotes = resolvedParams.withNotes === "true";
  const activeFilters = [
    validFrom,
    validTo,
    teacherFilter,
    studioFilter,
    withNotes ? "notes" : null,
  ].filter(Boolean).length;
  const hasFilters = Boolean(validFrom || validTo || teacherFilter || withNotes);

  const session = await getServerSession(authOptions);
  if (!session?.user?.schoolId) {
    return null;
  }

  const whereClause = {
    schoolId: session.user.schoolId,
    ...(teacherFilter ? { teacherId: teacherFilter } : {}),
    ...(studioFilter ? { studioId: studioFilter } : {}),
    ...(validFrom ? { date: { gte: validFrom } } : {}),
    ...(validTo ? { date: { lte: validTo } } : {}),
    ...(withNotes ? { notes: { some: {} } } : {}),
  };

  const [totalCount, teachers, studios] = await Promise.all([
    prisma.course.count({ where: whereClause }),
    prisma.user.findMany({
      where: { schoolId: session.user.schoolId, role: "TEACHER" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.studio.findMany({
      where: { schoolId: session.user.schoolId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, rawPage || 1), totalPages);
  const skip = (currentPage - 1) * PAGE_SIZE;

  const courses = await prisma.course.findMany({
    where: whereClause,
    orderBy: { date: "desc" },
    skip,
    take: PAGE_SIZE,
    include: {
      attendances: true,
      positions: true,
      teacher: { select: { name: true, email: true } },
      studio: { select: { name: true } },
      _count: { select: { notes: true } },
    },
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="panel flex flex-wrap items-center justify-between gap-3 border-indigo-400/25 p-6 shadow-indigo-900/30">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-indigo-100">
            Professeur / Admin
          </p>
          <h1 className="text-3xl font-semibold text-white">Cours</h1>
          <p className="text-sm text-slate-200">
            Derniers cours créés. Tri par date desc, pagination x10.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/app/teacher/courses/agenda"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            Agenda
          </Link>
          <Link
            href="/app/teacher/courses/new"
            className="rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg transition hover:brightness-110"
          >
            Nouveau cours
          </Link>
        </div>
      </header>

      <section className="panel space-y-4 border-indigo-400/15 p-6">
        <details className="group" open>
          <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-white">
            <span className="inline-flex items-center gap-2">
              <span>Filtres avancés</span>
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
            key={`filters-${resolvedParams.from ?? ""}-${resolvedParams.to ?? ""}-${teacherFilter ?? ""}-${studioFilter ?? ""}-${withNotes ? "notes" : "all"}`}
            className="mt-4 grid w-full gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-indigo-900/20 md:grid-cols-5 md:items-end"
            method="get"
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
              Studio
              <select
                name="studio"
                defaultValue={studioFilter ?? ""}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              >
                <option value="">Tous les studios</option>
                {studios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          <label className="mt-1 inline-flex flex-wrap items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-200 md:col-span-2">
            <input
              type="checkbox"
              name="withNotes"
              value="true"
              defaultChecked={withNotes}
              key={withNotes ? "with-notes" : "all-courses"}
              className="h-4 w-4 rounded border-white/20 bg-white/5"
            />
            Avec notes
          </label>
          <div className="md:col-span-5 flex flex-wrap items-center justify-end gap-2">
            <button
              type="submit"
              className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-400"
            >
              Filtrer
            </button>
            <Link
              href="/app/teacher/courses"
              className="rounded-full border border-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
            >
              Réinitialiser
            </Link>
          </div>
          </form>
        </details>
        <div className="flex flex-col divide-y divide-white/5">
          {courses.map((course) => {
            const isPast = new Date(course.date).getTime() < Date.now();
            const faded = isPast ? "opacity-60" : "";
            return (
              <a
                key={course.id}
                href={`/app/teacher/courses/${course.id}?from=${encodeURIComponent(
                  `/app/teacher/courses?page=${currentPage}`
                )}`}
                className={`group block rounded-xl transition hover:-translate-y-0.5 hover:bg-indigo-500/10 ${faded}`}
              >
                <article className="flex flex-col gap-2 py-3 px-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-base font-semibold text-white">
                      {course.title ?? "Cours sans titre"}
                    </p>
                  <p className="text-sm text-slate-200">
                    {course.teacher?.name ?? course.teacher?.email ?? "Professeur"}
                  </p>
                  {course.studio && (
                    <span className="mt-1 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-cyan-100">
                      Studio · {course.studio.name}
                    </span>
                  )}
                  <p className="text-sm text-slate-300">
                    {new Date(course.date).toLocaleString()}
                  </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-200">
                    <span>
                      {course.attendances.length} élèves · {course.positions.length} positions
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[11px] font-semibold text-white">
                      Notes : {course._count.notes}
                    </span>
                  </div>
                </article>
              </a>
            );
          })}
          {courses.length === 0 && (
            <div className="mt-2 rounded-2xl border border-dashed border-white/15 bg-white/5 p-4 text-sm text-slate-200">
              Aucun cours créé pour le moment. Utilise le bouton “Nouveau cours” pour commencer.
            </div>
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-200">
          <span>
            Page {currentPage} / {totalPages} · {totalCount} cours
          </span>
          <div className="flex items-center gap-2">
            <Link
              href={`/app/teacher/courses?page=${Math.max(1, currentPage - 1)}`}
              aria-disabled={currentPage === 1}
              className={`rounded-full border border-white/10 px-3 py-2 ${
                currentPage === 1
                  ? "cursor-not-allowed text-slate-500"
                  : "bg-white/5 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
              }`}
            >
              Précédent
            </Link>
            <Link
              href={`/app/teacher/courses?page=${Math.min(totalPages, currentPage + 1)}`}
              aria-disabled={currentPage === totalPages}
              className={`rounded-full border border-white/10 px-3 py-2 ${
                currentPage === totalPages
                  ? "cursor-not-allowed text-slate-500"
                  : "bg-white/5 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
              }`}
            >
              Suivant
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
