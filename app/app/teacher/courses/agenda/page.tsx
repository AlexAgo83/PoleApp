import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { FilterPanel } from "@/components/FilterPanel";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const NOW_MS = Date.now();

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function formatDuration(minutes: number) {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0) {
    return `${hrs}h${mins.toString().padStart(2, "0")}`;
  }
  return `${mins} min`;
}

export default async function CoursesAgendaPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string; teacher?: string; studio?: string; view?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.schoolId || !session.user.role) {
    redirect("/access-denied");
  }
  const userKey = session.user.id ?? "anon";
  const isTeacher = session.user.role === "TEACHER";
  if (!isTeacher && session.user.role !== "SCHOOL_ADMIN") {
    redirect("/access-denied");
  }

  const resolved = (await searchParams) ?? {};
  const monthParam = resolved.month;
  const teacherFilter =
    typeof resolved.teacher === "string" && resolved.teacher.length > 0
      ? resolved.teacher
      : undefined;
  const studioFilter =
    typeof resolved.studio === "string" && resolved.studio.length > 0
      ? resolved.studio
      : undefined;
  const viewParam = resolved.view;
  const view: "month" | "week" = viewParam === "week" ? "week" : "month";
  const hasMonthFilter = Boolean(monthParam);
  const baseDate = monthParam
    ? new Date(`${monthParam}-01T00:00:00`)
    : new Date();
  const start = startOfMonth(baseDate);
  const end = endOfMonth(baseDate);

  const effectiveTeacherFilter = isTeacher ? teacherFilter ?? session.user.id : teacherFilter;
  const buildViewHref = (mode: "month" | "week") => {
    const params = new URLSearchParams();
    if (mode !== "month") params.set("view", mode);
    if (monthParam) params.set("month", monthParam);
    if (studioFilter) params.set("studio", studioFilter);
    if (teacherFilter) params.set("teacher", teacherFilter);
    return `/app/teacher/courses/agenda${params.toString() ? `?${params}` : ""}`;
  };

  const courses = await prisma.course.findMany({
    where: {
      schoolId: session.user.schoolId,
      ...(effectiveTeacherFilter ? { teacherId: effectiveTeacherFilter } : {}),
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
  const teachers = await prisma.user.findMany({
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
  const isPastCourse = (courseDate: Date, durationMinutes?: number | null) => {
    const end = new Date(courseDate).getTime() + (durationMinutes ?? 60) * 60_000;
    return end < NOW_MS;
  };
  const teacherParamForNav = teacherFilter ?? (isTeacher ? session.user.id : undefined);
  const baseParams = new URLSearchParams();
  if (teacherParamForNav) baseParams.set("teacher", teacherParamForNav);
  if (studioFilter) baseParams.set("studio", studioFilter);
  const prevMonth = new Date(start);
  prevMonth.setMonth(prevMonth.getMonth() - 1);
  const nextMonth = new Date(start);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const prevMonthValue = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;
  const nextMonthValue = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;

  // Vue semaine : toujours la semaine en cours (lundi → dimanche)
  const today = new Date();
  const startWeek = new Date(today);
  const dayOffset = startWeek.getDay() === 0 ? 6 : startWeek.getDay() - 1; // Monday=0
  startWeek.setDate(startWeek.getDate() - dayOffset);
  const weekDays = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date(startWeek);
    d.setDate(startWeek.getDate() + idx);
    return d;
  });
  const coursesByDay = weekDays.map((d) => {
    const dayStr = d.toDateString();
    return courses.filter((c) => new Date(c.date).toDateString() === dayStr);
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-3 px-0 py-6 md:gap-6 md:px-8 md:py-10">
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
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <Link
            href="/app/teacher/courses"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/list.svg" alt="" className="h-4 w-4" />
            Liste
          </Link>
          <Link
            href="/app/teacher/courses/new"
            className="rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 px-3 py-2 text-sm font-semibold text-slate-900 shadow-lg transition hover:brightness-110"
          >
            Nouveau cours
          </Link>
        </div>
        {session.user.role === "SCHOOL_ADMIN" ? (
          <div className="mt-2 flex w-full justify-end">
            <Link
              href="/app/admin"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-normal text-white transition hover:border-cyan-400/70 hover:bg-white/10"
            >
              ← Retour dashboard
            </Link>
          </div>
        ) : session.user.role === "TEACHER" ? (
          <div className="mt-2 flex w-full justify-end">
            <Link
              href="/app/teacher"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-normal text-white transition hover:border-cyan-400/70 hover:bg-white/10"
            >
              ← Retour accueil
            </Link>
          </div>
        ) : null}
      </header>

      <section className="panel p-4 md:p-6">
        <FilterPanel
          storageKey="filters:teacher-agenda"
          title="Filtres"
          activeCount={(hasMonthFilter ? 1 : 0) + (studioFilter ? 1 : 0) + (teacherFilter ? 1 : 0)}
          userKey={userKey}
        >
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
            <label className="text-sm text-slate-200">
              Professeur
              <select
                name="teacher"
                defaultValue={teacherFilter ?? (isTeacher ? session.user.id : "")}
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
        </FilterPanel>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <Link
            href={buildViewHref("week")}
            className={`rounded-full px-3 py-1.5 font-semibold transition ${
              view === "week"
                ? "border border-cyan-400/70 bg-cyan-500/20 text-white"
                : "border border-white/10 bg-white/5 text-slate-200 hover:border-cyan-400/50 hover:bg-white/10"
            }`}
          >
            Hebdo
          </Link>
          <Link
            href={buildViewHref("month")}
            className={`rounded-full px-3 py-1.5 font-semibold transition ${
              view === "month"
                ? "border border-cyan-400/70 bg-cyan-500/20 text-white"
                : "border border-white/10 bg-white/5 text-slate-200 hover:border-cyan-400/50 hover:bg-white/10"
            }`}
          >
            Mensuelle
          </Link>
        </div>
      </section>

      {view === "month" && (
        <section className="panel p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Vue mensuelle</h3>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-1.5 text-sm text-slate-200 sm:grid-cols-2 sm:gap-2 md:grid-cols-3 lg:grid-cols-7">
            {calendarCells.map((cell, idx) => {
              const weekDayIndex = (idx % 7) + 1;
              const label = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"][(weekDayIndex - 1) % 7];
              const cellDate = cell.day
                ? new Date(start.getFullYear(), start.getMonth(), cell.day)
                : null;
              const isPastDay = cellDate ? cellDate < new Date(new Date().setHours(0, 0, 0, 0)) : false;
              const hideOnMobileMonth =
                !cell.courses || cell.courses.length === 0 ? "hidden sm:block" : "";
              return (
                <div
                  key={idx}
                  className={`rounded-xl border border-white/10 bg-white/5 p-2 text-left ${hideOnMobileMonth} ${
                    !cell.courses || cell.courses.length === 0 ? "min-h-[40px] md:min-h-[80px]" : "min-h-[80px]"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between text-xs font-semibold text-white">
                    <span className="flex items-center gap-1">
                      <span className={`text-[10px] uppercase tracking-wide md:text-xs ${isPastDay ? "text-slate-400" : "text-cyan-100"}`}>
                        {label}
                      </span>
                      <span className={isPastDay ? "text-slate-400" : undefined}>{cell.day ?? "—"}</span>
                    </span>
                    {cell.courses && cell.courses.length > 0 && (
                      <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[11px] font-semibold text-cyan-100">
                        {cell.courses.length}
                      </span>
                    )}
                  </div>
                  {cell.courses &&
                    cell.courses.slice(0, 3).map((course) => {
                      const past = isPastCourse(course.date, course.durationMinutes);
                      return (
                        <Link
                          key={course.id}
                          href={`/app/teacher/courses/${course.id}?from=/app/teacher/courses/agenda`}
                          className={`mt-1 block rounded-md px-2 py-1 text-[11px] transition hover:border hover:border-cyan-300/60 hover:bg-white/15 md:rounded-lg md:px-2.5 md:py-1.5 ${
                            past
                              ? "border border-white/10 bg-slate-800/60 text-slate-300 opacity-70 line-through"
                              : "bg-white/10 text-white"
                          }`}
                        >
                          <div className="text-[10px] leading-snug">
                            {new Date(course.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", hour12: false })} ·{" "}
                            {course.title ?? "Cours"}
                            <div className="text-[10px] text-slate-300 hidden md:block">
                              Durée : {formatDuration(course.durationMinutes ?? 60)}
                            </div>
                          </div>
                          {course.studio?.name ? (
                            <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-1.5 py-0.5 text-[10px] text-cyan-100">
                              {course.studio.name}
                            </span>
                          ) : null}
                        </Link>
                      );
                    })}
                  {cell.courses && cell.courses.length > 3 && (
                    <div className="mt-1 text-[11px] text-slate-300">
                      +{cell.courses.length - 3} autres
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-center gap-3 text-sm text-white">
            <form action="/app/teacher/courses/agenda" method="get" className="inline-flex">
              <input type="hidden" name="month" value={prevMonthValue} />
              {studioFilter ? <input type="hidden" name="studio" value={studioFilter} /> : null}
              {teacherParamForNav ? <input type="hidden" name="teacher" value={teacherParamForNav} /> : null}
              <button
                type="submit"
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-semibold transition hover:border-cyan-400/70 hover:bg-white/10"
              >
                ← Mois précédent
              </button>
            </form>
            <form action="/app/teacher/courses/agenda" method="get" className="inline-flex">
              <input type="hidden" name="month" value={nextMonthValue} />
              {studioFilter ? <input type="hidden" name="studio" value={studioFilter} /> : null}
              {teacherParamForNav ? <input type="hidden" name="teacher" value={teacherParamForNav} /> : null}
              <button
                type="submit"
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-semibold transition hover:border-cyan-400/70 hover:bg-white/10"
              >
                Mois suivant →
              </button>
            </form>
          </div>
          {courses.length === 0 && (
            <p className="mt-4 text-sm text-slate-200">
              Aucun cours prévu pour ce mois.
            </p>
          )}
        </section>
      )}

      {view === "week" && (
        <section className="panel p-6">
          <details className="group" open>
          <summary className="flex cursor-pointer items-center justify-between text-lg font-semibold text-white">
            <span>Vue semaine</span>
            <span className="text-xs text-slate-300 transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="mt-3 grid gap-2 md:grid-cols-7 md:gap-3">
            {weekDays.map((day, idx) => {
              const dayCourses = coursesByDay[idx];
              const hideOnMobile = dayCourses.length === 0 ? "hidden md:block" : "";
              return (
                <div
                  key={day.toISOString()}
                  className={`rounded-xl border border-white/10 bg-white/5 p-2 text-sm text-slate-200 ${hideOnMobile}`}
                >
                  <div className="mb-2 flex items-center justify-between text-xs font-semibold text-white">
                    <span className="flex items-center gap-1">
                      <span>{day.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })}</span>
                    </span>
                    <span className="text-[11px] text-cyan-100">{dayCourses.length} cours</span>
                  </div>
                  <div className="flex flex-col gap-1.5 md:gap-2">
                    {dayCourses.length === 0 && <span className="text-slate-400">—</span>}
                    {dayCourses.map((course) => {
                      const past = isPastCourse(course.date, course.durationMinutes);
                      return (
                        <Link
                          key={course.id}
                          href={`/app/teacher/courses/${course.id}?from=/app/teacher/courses/agenda`}
                          className={`inline-flex w-full flex-col rounded-md border px-2 py-1 text-[11px] transition hover:border-cyan-300/70 hover:bg-white/15 md:rounded-lg md:px-2.5 md:py-1.5 ${
                            past
                              ? "border-white/15 bg-slate-800/60 text-slate-300 opacity-70 line-through"
                              : "border-white/10 bg-white/10 text-white"
                          }`}
                          title={`Durée : ${formatDuration(course.durationMinutes ?? 60)}`}
                        >
                          <span>{new Date(course.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", hour12: false })}</span>
                          <span className="truncate">{course.title ?? "Cours"}</span>
                          <span className="text-[10px] text-cyan-100 hidden md:inline">{formatDuration(course.durationMinutes ?? 60)}</span>
                          {course.studio?.name ? (
                            <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-1.5 py-0.5 text-[10px] text-cyan-100">
                              {course.studio.name}
                            </span>
                          ) : null}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </details>
      </section>
      )}
    </main>
  );
}
