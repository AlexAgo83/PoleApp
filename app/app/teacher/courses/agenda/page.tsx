import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { FilterPanel } from "@/components/FilterPanel";
import { prisma } from "@/lib/prisma";
import { WeekView } from "./WeekView";
import { MonthView } from "./MonthView";

export const dynamic = "force-dynamic";
const NOW_MS = Date.now();
const FALLBACK_DISCIPLINES = [
  { name: "Pole", color: "#0ea5e9" },
  { name: "Exotic", color: "#ec4899" },
  { name: "Souplesse", color: "#a855f7" },
  { name: "Pilates", color: "#10b981" },
  { name: "Danse", color: "#7c3aed" },
];

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export default async function CoursesAgendaPage({
  searchParams,
}: {
  searchParams?: Promise<{
    month?: string;
    teacher?: string;
    studio?: string;
    view?: string;
    week?: string;
    from?: string;
    to?: string;
    discipline?: string | string[];
    level?: string;
    q?: string;
  }>;
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
  const fromParam = resolved.from && typeof resolved.from === "string" ? resolved.from : undefined;
  const toParam = resolved.to && typeof resolved.to === "string" ? resolved.to : undefined;
  const teacherFilter =
    typeof resolved.teacher === "string" && resolved.teacher.length > 0
      ? resolved.teacher
      : undefined;
  const studioFilter =
    typeof resolved.studio === "string" && resolved.studio.length > 0
      ? resolved.studio
      : undefined;
  const disciplineFilters =
    typeof resolved.discipline === "string"
      ? resolved.discipline
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean)
      : Array.isArray(resolved.discipline)
      ? resolved.discipline.flatMap((v) => v.split(",")).map((v) => v.trim()).filter(Boolean)
      : [];
  const disciplineParam = disciplineFilters.length > 0 ? disciplineFilters.join(",") : undefined;
  const levelFilter =
    typeof resolved.level === "string" && resolved.level.length > 0
      ? resolved.level
      : undefined;
  const q = resolved.q?.toString().trim() ?? "";
  const viewParam = resolved.view;
  const view: "month" | "week" = viewParam === "week" ? "week" : "month";
  const weekParam = typeof resolved.week === "string" && resolved.week ? resolved.week : undefined;
  const weekBase = weekParam ? new Date(`${weekParam}T00:00:00`) : new Date();
  const startWeek = new Date(weekBase);
  const dayOffsetWeek = startWeek.getDay() === 0 ? 6 : startWeek.getDay() - 1; // Monday=0
  startWeek.setDate(startWeek.getDate() - dayOffsetWeek);
  startWeek.setHours(0, 0, 0, 0);
  const endWeek = new Date(startWeek);
  endWeek.setDate(startWeek.getDate() + 6);
  endWeek.setHours(23, 59, 59, 999);
  const baseDate = monthParam ? new Date(`${monthParam}-01T00:00:00`) : new Date();
  const monthStart = startOfMonth(baseDate);
  const monthEnd = endOfMonth(baseDate);
  const rangeStart =
    view === "week"
      ? startWeek
      : fromParam
      ? new Date(`${fromParam}T00:00:00`)
      : monthStart;
  const rangeEnd =
    view === "week"
      ? endWeek
      : toParam
      ? new Date(`${toParam}T23:59:59`)
      : monthEnd;

  const effectiveTeacherFilter = isTeacher ? teacherFilter ?? session.user.id : teacherFilter;
  const buildViewHref = (mode: "month" | "week", weekValue?: string) => {
    const params = new URLSearchParams();
    if (mode !== "month") params.set("view", mode);
    if (mode === "week" && weekValue) params.set("week", weekValue);
    if (monthParam) params.set("month", monthParam);
    if (fromParam) params.set("from", fromParam);
    if (toParam) params.set("to", toParam);
    if (studioFilter) params.set("studio", studioFilter);
    if (teacherFilter) params.set("teacher", teacherFilter);
    if (disciplineFilters.length > 0) params.set("discipline", disciplineFilters.join(","));
    if (levelFilter) params.set("level", levelFilter);
    if (q) params.set("q", q);
    return `/app/teacher/courses/agenda${params.toString() ? `?${params}` : ""}`;
  };

  const courses = await prisma.course.findMany({
    where: {
      schoolId: session.user.schoolId,
      ...(effectiveTeacherFilter ? { teacherId: effectiveTeacherFilter } : {}),
      ...(studioFilter ? { studioId: studioFilter } : {}),
      date: { gte: rangeStart, lte: rangeEnd },
      ...(q
        ? {
            OR: [{ title: { contains: q, mode: "insensitive" } }],
          }
        : {}),
      ...(disciplineFilters.length > 0
        ? {
            OR: [
              { disciplineId: { in: disciplineFilters } },
              { discipline: { in: disciplineFilters, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(levelFilter
        ? {
            OR: [{ title: { contains: levelFilter, mode: "insensitive" } }],
          }
        : {}),
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
  const disciplineRows =
    (await prisma.discipline
      .findMany({
        select: { id: true, name: true, color: true },
        orderBy: { name: "asc" },
      })
      .catch(() => [])) ?? [];
  const disciplines = (() => {
    const merged: { id?: string; name: string; color?: string | null }[] = [...disciplineRows];
    return merged.length > 0 ? merged : FALLBACK_DISCIPLINES;
  })();
  const disciplineNameById = new Map((disciplines as any[]).map((d) => [d.id, d.name]));

  const daysInMonth = monthEnd.getDate();
  const firstDay = monthStart.getDay() === 0 ? 7 : monthStart.getDay(); // Monday=1 ... Sunday=7
  const calendarCells: Array<{ day?: number; courses?: typeof courses }> = [];
  for (let i = 1; i < firstDay; i += 1) {
    calendarCells.push({});
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateStr = new Date(monthStart.getFullYear(), monthStart.getMonth(), day).toDateString();
    const dayCourses = courses.filter(
      (c) => new Date(c.date).toDateString() === dateStr
    );
    calendarCells.push({ day, courses: dayCourses });
  }

  const monthValue = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`;
  const currentMonthValue = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const isPastCourse = (courseDate: Date, durationMinutes?: number | null) => {
    const end = new Date(courseDate).getTime() + (durationMinutes ?? 60) * 60_000;
    return end < NOW_MS;
  };
  const teacherParamForNav = teacherFilter ?? (isTeacher ? session.user.id : undefined);
  const prevMonth = new Date(monthStart);
  prevMonth.setMonth(prevMonth.getMonth() - 1);
  const nextMonth = new Date(monthStart);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const prevMonthValue = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;
  const nextMonthValue = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;
  const initialMonthCells = calendarCells.map((cell) => ({
    day: cell.day,
    isoDate:
      typeof cell.day === "number"
        ? new Date(monthStart.getFullYear(), monthStart.getMonth(), cell.day).toISOString()
        : undefined,
    courses: (cell.courses ?? []).map((course) => ({
      id: course.id,
      title: course.title,
      disciplineId: (course as any).disciplineId ?? null,
      discipline: disciplineNameById.get((course as any).disciplineId ?? "") ?? null,
      date: course.date instanceof Date ? course.date.toISOString() : course.date,
      durationMinutes: course.durationMinutes,
      teacherName: course.teacher?.name ?? course.teacher?.email ?? "Professeur",
      studioName: course.studio?.name ?? "Studio non renseigné",
      past: isPastCourse(course.date, course.durationMinutes),
    })),
  }));
  const hasMonthCourses = courses.length > 0;
  const activeFilters = [
    studioFilter,
    teacherFilter,
    disciplineFilters.length > 0 ? "discipline" : null,
    levelFilter,
    fromParam,
    toParam,
    q && q.length > 0 ? "q" : null,
  ].filter(Boolean).length;

  // Vue semaine avec navigation
  const weekDays = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date(startWeek);
    d.setDate(startWeek.getDate() + idx);
    return d;
  });
  const formatWeekKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const weekValue = formatWeekKey(startWeek);
  const prevWeek = new Date(startWeek);
  prevWeek.setDate(startWeek.getDate() - 7);
  const nextWeek = new Date(startWeek);
  nextWeek.setDate(startWeek.getDate() + 7);
  const prevWeekValue = formatWeekKey(prevWeek);
  const nextWeekValue = formatWeekKey(nextWeek);

  const coursesByDay = weekDays.map((d) => {
    const dayStr = d.toDateString();
    return courses.filter((c) => new Date(c.date).toDateString() === dayStr);
  });
  const days = weekDays.map((d, idx) => {
    const dayCourses = coursesByDay[idx];
    return {
      isoDate: d.toISOString(),
      label: d.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", ""),
      day: d.getDate(),
      isPast: d < new Date(new Date().setHours(0, 0, 0, 0)),
      courses: dayCourses.map((course) => {
        const past = isPastCourse(course.date, course.durationMinutes);
        return {
          id: course.id,
          title: course.title,
          disciplineId: (course as any).disciplineId ?? null,
          discipline: disciplineNameById.get((course as any).disciplineId ?? "") ?? null,
          date: course.date.toISOString(),
          durationMinutes: course.durationMinutes,
          teacherName: course.teacher?.name ?? course.teacher?.email ?? "Professeur",
          studioName: course.studio?.name ?? "Studio non renseigné",
          past,
        };
      }),
    };
  });

  return (
    <main className="flex min-h-screen w-full flex-col gap-4">
      <section className="panel space-y-4 border-indigo-400/25 p-6 shadow-indigo-900/30">
        <div className="flex w-full flex-col gap-3 md:flex-row md:items-start">
          <div className="flex-1">
            <h1 className="text-3xl font-semibold text-white">Agenda des cours</h1>
            <p className="text-sm text-slate-200">
              Navigation hebdo/mensuelle, filtres prof/studio/discipline.
            </p>
          </div>
          <div className="flex flex-wrap items-start justify-end gap-2 md:ml-auto">
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
              className="rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 px-3 py-2 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
            >
              Nouveau cours
            </Link>
          </div>
        </div>

        <FilterPanel
          storageKey="filters:teacher-agenda"
          title="Filtres"
          activeCount={activeFilters}
          userKey={userKey}
        >
          <form
            key={`agenda-${monthParam ?? "current"}`}
            method="get"
            className="mt-3 grid w-full gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-indigo-900/20 md:grid-cols-4 md:items-end"
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
              Date min
              <input
                type="date"
                name="from"
                defaultValue={fromParam}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              />
            </label>
            <label className="text-sm text-slate-200">
              Date max
              <input
                type="date"
                name="to"
                defaultValue={toParam}
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
              Discipline
              <select
                name="discipline"
                defaultValue={disciplineFilters[0] ?? ""}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              >
                <option value="">Toutes disciplines</option>
                {disciplines.map((d) => {
                  const value = (d as { id?: string; name: string }).id ?? d.name;
                  return (
                    <option key={value} value={value}>
                      {d.name}
                    </option>
                  );
                })}
              </select>
            </label>
            <label className="text-sm text-slate-200">
              Niveau (libellé)
              <input
                type="text"
                name="level"
                defaultValue={levelFilter ?? ""}
                placeholder="Débutant, Intermédiaire..."
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              />
            </label>
            <label className="text-sm text-slate-200 md:col-span-2">
              Recherche (titre)
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Titre du cours"
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              />
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
            <div className="flex flex-wrap items-center justify-end gap-2 md:col-span-4">
              <button
                type="submit"
                className="rounded-full bg-cyan-500 px-4 py-2 font-semibold text-white transition hover:bg-cyan-400"
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
        {activeFilters > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-white">
            <span className="rounded-full border border-cyan-400/60 bg-cyan-500/20 px-2 py-0.5">
              {activeFilters} filtre{activeFilters > 1 ? "s" : ""} actif{activeFilters > 1 ? "s" : ""}
            </span>
            {teacherFilter && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-slate-200">
                Prof : {teachers.find((t) => t.id === teacherFilter)?.name ?? teacherFilter}
              </span>
            )}
            {studioFilter && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-slate-200">
                Studio : {studios.find((s) => s.id === studioFilter)?.name ?? studioFilter}
              </span>
            )}
            {disciplineFilters.length > 0 &&
              disciplineFilters.map((d) => (
                <span
                  key={d}
                  className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-slate-200"
                >
                  Discipline : “{disciplineNameById.get(d) ?? d}”
                </span>
              ))}
            {levelFilter && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-slate-200">
                Niveau : “{levelFilter}”
              </span>
            )}
            {q && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-slate-200">
                Recherche : “{q}”
              </span>
            )}
            {(fromParam || toParam) && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-slate-200">
                Dates : {fromParam ?? "—"} → {toParam ?? "—"}
              </span>
            )}
          </div>
        )}
        {view === "month" && (
          <MonthView
            initialMonth={monthValue}
            currentMonth={currentMonthValue}
            initialPrev={prevMonthValue}
            initialNext={nextMonthValue}
            initialCells={initialMonthCells}
            hasCourses={hasMonthCourses}
            filters={{
              teacher: teacherParamForNav,
              studio: studioFilter,
              discipline: disciplineFilters.length > 0 ? disciplineFilters.join(",") : undefined,
              level: levelFilter,
              q,
              from: fromParam,
              to: toParam,
            }}
            baseFrom="/app/teacher/courses/agenda"
          />
        )}

        {view === "week" && (
          <WeekView
            initialWeek={weekValue}
            initialPrev={prevWeekValue}
            initialNext={nextWeekValue}
            initialDays={days}
            filters={{
              teacher: teacherParamForNav,
              studio: studioFilter,
              q,
              discipline: disciplineParam,
              level: levelFilter ?? undefined,
            }}
            baseFrom="/app/teacher/courses/agenda"
          />
        )}
      </section>
    </main>
  );
}
