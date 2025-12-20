import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export default async function CoursesAgendaPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string; teacher?: string; studio?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.schoolId || !session.user.role) {
    redirect("/access-denied");
  }
  const isTeacher = session.user.role === "TEACHER";
  if (!isTeacher && session.user.role !== "SCHOOL_ADMIN") {
    redirect("/access-denied");
  }

  const resolved = (await searchParams) ?? {};
  const monthParam = resolved.month;
  const teacherFilter = resolved.teacher;
  const studioFilter =
    typeof resolved.studio === "string" && resolved.studio.length > 0
      ? resolved.studio
      : undefined;
  const hasMonthFilter = Boolean(monthParam);
  const baseDate = monthParam
    ? new Date(`${monthParam}-01T00:00:00`)
    : new Date();
  const start = startOfMonth(baseDate);
  const end = endOfMonth(baseDate);

  const courses = await prisma.course.findMany({
    where: {
      schoolId: session.user.schoolId,
      ...(isTeacher ? { teacherId: session.user.id } : teacherFilter ? { teacherId: teacherFilter } : {}),
      ...(studioFilter ? { studioId: studioFilter } : {}),
      date: { gte: start, lte: end },
    },
    include: { teacher: { select: { name: true, email: true } }, studio: { select: { name: true } } },
    orderBy: { date: "asc" },
  });
  const studios = await prisma.studio.findMany({
    where: { schoolId: session.user.schoolId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const teachers = isTeacher
    ? []
    : await prisma.user.findMany({
        where: { schoolId: session.user.schoolId, role: "TEACHER" },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      });

  const daysInMonth = end.getDate();
  const firstDay = start.getDay() === 0 ? 7 : start.getDay(); // Monday=1 ... Sunday=7
  const calendarCells: Array<{ day?: number; courses?: typeof courses }> = [];
  for (let i = 1; i < firstDay; i += 1) {
    calendarCells.push({});
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateStr = new Date(start.getFullYear(), start.getMonth(), day).toDateString();
    const dayCourses = courses.filter(
      (c) => new Date(c.date).toDateString() === dateStr
    );
    calendarCells.push({ day, courses: dayCourses });
  }

  const monthLabel = start.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const monthValue = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="panel flex flex-wrap items-center justify-between gap-3 border-indigo-400/25 p-6 shadow-indigo-900/30">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-indigo-100">
            {isTeacher ? "Professeur" : "Admin"}
          </p>
          <h1 className="text-3xl font-semibold text-white">Agenda des cours</h1>
          <p className="text-sm text-slate-200">
            Mois courant : {monthLabel}. Les journées avec cours sont signalées.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/app/teacher/courses"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            Liste
          </Link>
          <Link
            href="/app/teacher/courses/new"
            className="rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg transition hover:brightness-110"
          >
            Nouveau cours
          </Link>
        </div>
      </header>

      <section className="panel p-6">
        <details className="group" open>
          <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-white">
            <span className="inline-flex items-center gap-2">
              <span>Filtres</span>
              {(hasMonthFilter || studioFilter) && (
                <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[11px] font-semibold text-cyan-100">
                  {(hasMonthFilter ? 1 : 0) + (studioFilter ? 1 : 0)}
                </span>
              )}
            </span>
            <span className="text-xs text-slate-300 transition-transform group-open:rotate-180">
              ▼
            </span>
          </summary>
          <form
            key={`agenda-${monthParam ?? "current"}`}
            method="get"
            className="mt-3 grid w-full gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-indigo-900/20 md:grid-cols-3 md:items-end"
          >
            <label className="text-sm text-slate-200">
              Mois
              <input
                type="month"
                name="month"
                defaultValue={monthValue}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              />
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
            {!isTeacher && (
              <label className="text-sm text-slate-200">
                Professeur
                <select
                  name="teacher"
                  defaultValue={teacherFilter ?? ""}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
                >
                  <option value="">Tous les profs</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name ?? t.email}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="flex flex-wrap items-center justify-end gap-2 md:col-span-3">
              <button
                type="submit"
                className="rounded-full bg-cyan-500 px-4 py-2 font-semibold text-slate-900 transition hover:bg-cyan-400"
              >
                Filtrer
              </button>
              <Link
                href="/app/teacher/courses/agenda"
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
              >
                Réinitialiser
              </Link>
            </div>
          </form>
        </details>
        <div className="grid grid-cols-7 gap-2 text-center text-sm text-slate-200">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
            <div key={d} className="py-2 font-semibold text-white/80">
              {d}
            </div>
          ))}
          {calendarCells.map((cell, idx) => (
            <div
              key={idx}
              className="min-h-[80px] rounded-xl border border-white/10 bg-white/5 p-2 text-left"
            >
              {cell.day && (
                <div className="mb-1 flex items-center justify-between text-xs font-semibold text-white">
                  <span>{cell.day}</span>
                  {cell.courses && cell.courses.length > 0 && (
                    <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[11px] font-semibold text-cyan-100">
                      {cell.courses.length}
                    </span>
                  )}
                </div>
              )}
              {cell.courses &&
                cell.courses.slice(0, 3).map((course) => (
                  <Link
                    key={course.id}
                    href={`/app/teacher/courses/${course.id}?from=/app/teacher/courses/agenda`}
                    className="mt-1 block rounded-lg bg-white/10 px-2 py-1 text-[11px] text-white transition hover:border hover:border-cyan-300/60 hover:bg-white/15"
                  >
                    {new Date(course.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ·{" "}
                    {course.title ?? "Cours"}
                  </Link>
                ))}
              {cell.courses && cell.courses.length > 3 && (
                <div className="mt-1 text-[11px] text-slate-300">
                  +{cell.courses.length - 3} autres
                </div>
              )}
            </div>
          ))}
        </div>
        {courses.length === 0 && (
          <p className="mt-4 text-sm text-slate-200">
            Aucun cours prévu pour ce mois.
          </p>
        )}
      </section>
    </main>
  );
}
