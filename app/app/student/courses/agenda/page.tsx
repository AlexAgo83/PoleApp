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

export default async function StudentCoursesAgendaPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string; studio?: string; teacher?: string; mine?: string; view?: string; schools?: string; week?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    redirect("/access-denied");
  }
  const userKey = session.user.id ?? "anon";

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
  const weekParam =
    typeof resolved.week === "string" && resolved.week.length > 0 ? resolved.week : undefined;
  const schoolsParam = resolved.schools === "all";
  const mineFilter =
    resolved.mine === "true" ||
    resolved.mine === "1" ||
    resolved.mine === "on" ||
    resolved.mine === "";
  const onlyMine = mineFilter;
  const baseDate = monthParam ? new Date(`${monthParam}-01T00:00:00`) : new Date();
  const start = startOfMonth(baseDate);
  const end = endOfMonth(baseDate);
  let allowedSchoolIds: string[] | undefined;
  if (schoolsParam && session.user.schoolId) {
    const attended = await prisma.courseAttendance.findMany({
      where: { studentId: session.user.id },
      select: { course: { select: { schoolId: true } } },
    });
    const ids = new Set<string>();
    ids.add(session.user.schoolId);
    attended.forEach((a) => {
      if (a.course.schoolId) ids.add(a.course.schoolId);
    });
    allowedSchoolIds = Array.from(ids);
  }

  const isPastCourse = (courseDate: Date, durationMinutes?: number | null) => {
    const endMs = new Date(courseDate).getTime() + (durationMinutes ?? 60) * 60_000;
    return endMs < NOW_MS;
  };

  // Vue semaine : basée sur param `week` ou semaine courante (lundi → dimanche)
  const today = new Date();
  const weekBase = weekParam ? new Date(`${weekParam}T00:00:00`) : today;
  const startWeek = new Date(weekBase);
  const dayOffset = startWeek.getDay() === 0 ? 6 : startWeek.getDay() - 1; // Monday=0
  startWeek.setDate(startWeek.getDate() - dayOffset);
  const weekDays = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date(startWeek);
    d.setDate(startWeek.getDate() + idx);
    return d;
  });
  const formatDateKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const weekValue = formatDateKey(startWeek);
  const prevWeek = new Date(startWeek);
  prevWeek.setDate(startWeek.getDate() - 7);
  const nextWeek = new Date(startWeek);
  nextWeek.setDate(startWeek.getDate() + 7);
  const prevWeekValue = formatDateKey(prevWeek);
  const nextWeekValue = formatDateKey(nextWeek);

  // Étendue de récupération : union du mois affiché et de la semaine en cours/choisie
  const weekRangeStart = new Date(startWeek);
  weekRangeStart.setHours(0, 0, 0, 0);
  const weekRangeEnd = new Date(startWeek);
  weekRangeEnd.setDate(startWeek.getDate() + 6);
  weekRangeEnd.setHours(23, 59, 59, 999);
  const rangeStart = new Date(Math.min(start.getTime(), weekRangeStart.getTime()));
  const rangeEnd = new Date(Math.max(end.getTime(), weekRangeEnd.getTime()));

  const buildViewHref = (mode: "month" | "week") => {
    const params = new URLSearchParams();
    if (mode !== "month") params.set("view", mode);
    if (mode === "week" && weekValue) params.set("week", weekValue);
    if (monthParam) params.set("month", monthParam);
    if (studioFilter) params.set("studio", studioFilter);
    if (teacherFilter) params.set("teacher", teacherFilter);
    if (onlyMine) params.set("mine", "true");
    if (schoolsParam) params.set("schools", "all");
    return `/app/student/courses/agenda${params.toString() ? `?${params}` : ""}`;
  };

  const attendances = onlyMine
    ? await prisma.courseAttendance.findMany({
        where: {
          studentId: session.user.id,
          course: {
            date: { gte: rangeStart, lte: rangeEnd },
            ...(teacherFilter ? { teacherId: teacherFilter } : {}),
            ...(studioFilter ? { studioId: studioFilter } : {}),
            ...(allowedSchoolIds && allowedSchoolIds.length > 0
              ? { schoolId: { in: allowedSchoolIds } }
              : session.user.schoolId
              ? { schoolId: session.user.schoolId }
              : {}),
          },
        },
        include: {
          course: {
            include: {
              teacher: { select: { name: true, email: true } },
              studio: { select: { name: true } },
            },
          },
        },
        orderBy: { course: { date: "asc" } },
      })
    : [];

  const schoolCourses =
    !onlyMine && session.user.schoolId
      ? await prisma.course.findMany({
          where: {
            ...(allowedSchoolIds && allowedSchoolIds.length > 0
              ? { schoolId: { in: allowedSchoolIds } }
              : { schoolId: session.user.schoolId }),
            date: { gte: rangeStart, lte: rangeEnd },
            ...(teacherFilter ? { teacherId: teacherFilter } : {}),
            ...(studioFilter ? { studioId: studioFilter } : {}),
          },
          include: {
            teacher: { select: { name: true, email: true } },
            studio: { select: { name: true } },
            attendances: {
              where: { studentId: session.user.id },
              select: { id: true },
            },
          },
          orderBy: { date: "asc" },
      })
    : [];

  // Tous les cours auxquels l'élève est inscrit (pour badge "inscrit")
  const myAttendancesForMonth = await prisma.courseAttendance.findMany({
    where: {
      studentId: session.user.id,
      course: {
        date: { gte: rangeStart, lte: rangeEnd },
        ...(teacherFilter ? { teacherId: teacherFilter } : {}),
        ...(studioFilter ? { studioId: studioFilter } : {}),
        ...(allowedSchoolIds && allowedSchoolIds.length > 0
          ? { schoolId: { in: allowedSchoolIds } }
          : session.user.schoolId
          ? { schoolId: session.user.schoolId }
          : {}),
      },
    },
    select: {
      courseId: true,
      course: { select: { date: true, durationMinutes: true } },
    },
  });
  const attendingCourseIds = new Set(myAttendancesForMonth.map((a) => a.courseId));
  const attendedPastCourseIds = new Set(
    myAttendancesForMonth
      .filter((a) => isPastCourse(a.course.date, a.course.durationMinutes))
      .map((a) => a.courseId)
  );

  const agendaItems = onlyMine
    ? attendances.map((a) => ({
        id: a.id,
        courseId: a.courseId,
        course: a.course,
        isMine: true,
      }))
    : schoolCourses.map((c) => ({
        id: c.id,
        courseId: c.id,
        course: c,
        isMine: Boolean(c.attendances?.length),
      }));

  const attendancesByDay = weekDays.map((d) => {
    const dayStr = d.toDateString();
    return agendaItems.filter((a) => new Date(a.course.date).toDateString() === dayStr);
  });

  const studiosPromise = session.user.schoolId
    ? prisma.studio.findMany({
        where: { schoolId: session.user.schoolId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : Promise.resolve([]);

  const teachersPromise = session.user.schoolId
    ? prisma.user.findMany({
        where: { schoolId: session.user.schoolId, role: "TEACHER" },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      })
    : Promise.resolve([]);

  const [studios, teachers] = await Promise.all([studiosPromise, teachersPromise]);

  const daysInMonth = end.getDate();
  const firstDay = start.getDay() === 0 ? 7 : start.getDay(); // Monday=1 ... Sunday=7
  const cells: Array<{ day?: number; attendances?: typeof agendaItems }> = [];
  for (let i = 1; i < firstDay; i += 1) {
    cells.push({});
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateStr = new Date(start.getFullYear(), start.getMonth(), day).toDateString();
    const daily = agendaItems.filter(
      (a) => new Date(a.course.date).toDateString() === dateStr
    );
    cells.push({ day, attendances: daily });
  }

  const monthLabel = start.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const monthValue = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
  const hasMonthFilter = Boolean(monthParam);
  const activeFilters =
    (hasMonthFilter ? 1 : 0) +
    (studioFilter ? 1 : 0) +
    (teacherFilter ? 1 : 0) +
    (onlyMine ? 1 : 0);

  const monthParams = new URLSearchParams();
  if (studioFilter) monthParams.set("studio", studioFilter);
  if (teacherFilter) monthParams.set("teacher", teacherFilter);
  if (onlyMine) monthParams.set("mine", "true");
  if (schoolsParam) monthParams.set("schools", "all");
  const prevMonth = new Date(start);
  prevMonth.setMonth(prevMonth.getMonth() - 1);
  const nextMonth = new Date(start);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const prevMonthValue = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;
  const nextMonthValue = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-3 px-0 py-6 md:gap-6 md:px-8 md:py-10">
      <header className="panel flex flex-wrap items-center justify-between gap-3 border-indigo-400/25 p-6 shadow-indigo-900/30">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-indigo-100">Élève</p>
          <h1 className="text-3xl font-semibold text-white">Agenda</h1>
          <p className="text-sm text-slate-200">
            Mois : {monthLabel}. Les jours avec cours suivis sont marqués.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Link
            href="/app/student/courses"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/list.svg" alt="" className="h-4 w-4" />
            Liste
          </Link>
        </div>
        <div className="flex w-full justify-end">
          <Link
            href="/app/student"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-normal text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            ← Retour accueil
          </Link>
        </div>
      </header>

      <section className="panel p-4 md:p-6">
        <FilterPanel
          storageKey="filters:student-agenda"
          title="Filtres"
          activeCount={activeFilters}
          userKey={userKey}
        >
          <form
            method="get"
            key={`agenda-${monthParam ?? "current"}`}
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
            <label className="mt-1 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-200">
              <input
                type="checkbox"
                name="mine"
                value="true"
                defaultChecked={onlyMine}
                className="h-4 w-4 rounded border-white/20 bg-white/5"
              />
              Mes cours
            </label>
            <label className="mt-1 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-200">
              <input
                type="checkbox"
                name="schools"
                value="all"
                defaultChecked={schoolsParam}
                className="h-4 w-4 rounded border-white/20 bg-white/5"
              />
              Cours des écoles fréquentées
            </label>
            <div className="flex flex-wrap items-center justify-end gap-2 md:col-span-3">
              <button
                type="submit"
                className="rounded-full bg-cyan-500 px-4 py-2 font-semibold text-white transition hover:bg-cyan-400"
              >
                Filtrer
              </button>
              <Link
                href="/app/student/courses/agenda"
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
            {cells.map((cell, idx) => {
              const weekDayIndex = (idx % 7) + 1; // 1-based
              const label = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"][(weekDayIndex - 1) % 7];
              const cellDate = cell.day
                ? new Date(start.getFullYear(), start.getMonth(), cell.day)
                : null;
              const isPastDay = cellDate ? cellDate < new Date(new Date().setHours(0, 0, 0, 0)) : false;
              const hideOnMobileMonth =
                !cell.attendances || cell.attendances.length === 0 ? "hidden sm:block" : "";
              return (
                <div
                  key={idx}
                  className={`rounded-xl border border-white/10 bg-white/5 p-2 text-left ${hideOnMobileMonth} ${
                    !cell.attendances || cell.attendances.length === 0 ? "min-h-[40px] md:min-h-[80px]" : "min-h-[80px]"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between text-xs font-semibold text-white">
                    <span className="flex items-center gap-1">
                      <span className={`text-[10px] uppercase tracking-wide md:text-xs ${isPastDay ? "text-slate-400" : "text-cyan-100"}`}>
                        {label}
                      </span>
                      <span className={isPastDay ? "text-slate-400" : undefined}>{cell.day ?? ""}</span>
                    </span>
                    <span className="text-[11px] text-cyan-100">
                      {(cell.attendances?.length ?? 0)} cours
                    </span>
                  </div>
                  {cell.attendances &&
                    cell.attendances.slice(0, 3).map((a) => {
                      const past = isPastCourse(a.course.date, a.course.durationMinutes);
                      const isMine = attendingCourseIds.has(a.courseId);
                      const badgeClass = past
                        ? "border border-blue-400/70 bg-blue-600/30 text-blue-50"
                        : "border border-amber-300/70 bg-amber-500/25 text-amber-50";
                      return (
                        <Link
                          key={a.id}
                          href={`/app/student/courses/${a.courseId}?from=/app/student/courses/agenda`}
                          className={`mt-1 flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-[11px] transition hover:border-cyan-300/60 hover:bg-white/15 md:rounded-lg md:px-2.5 md:py-1.5 ${
                            past
                              ? "border-white/10 bg-slate-800/60 text-slate-300 opacity-70 line-through"
                              : "border-white/10 bg-white/10 text-white"
                          }`}
                        >
                        <div className="flex-1 space-y-0.5 overflow-hidden">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-semibold ${
                                isMine
                                  ? badgeClass
                                  : "border border-white/20 bg-white/10 text-slate-300"
                              }`}
                              title={
                                isMine
                                  ? past
                                    ? "Cours déjà suivi"
                                    : "Inscrit"
                                  : "Non inscrit"
                              }
                            >
                              ●
                            </span>
                            <p className="text-[9px] text-cyan-100 whitespace-nowrap">
                              {new Date(a.course.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", hour12: false })}{" "}
                              - {formatDuration(a.course.durationMinutes ?? 60)}
                            </p>
                          </div>
                          <p className="truncate text-[11px] font-semibold text-white">
                            {a.course.title ?? "Cours"}
                          </p>
                          <p className="truncate text-[10px] text-cyan-100">
                            {a.course.teacher?.name ?? a.course.teacher?.email ?? "Professeur"}
                          </p>
                          <p className="truncate text-[10px] text-slate-200">
                            {a.course.studio?.name ?? "Studio non renseigné"}
                          </p>
                        </div>
                    </Link>
                  );
                })}
                  {cell.attendances && cell.attendances.length > 3 && (
                    <div className="mt-1 text-[11px] text-slate-300">
                      +{cell.attendances.length - 3} autres
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-center gap-3 text-sm text-white">
            <form
              action="/app/student/courses/agenda"
              method="get"
              className="inline-flex"
            >
              <input type="hidden" name="month" value={prevMonthValue} />
              {studioFilter ? <input type="hidden" name="studio" value={studioFilter} /> : null}
              {teacherFilter ? <input type="hidden" name="teacher" value={teacherFilter} /> : null}
              {onlyMine ? <input type="hidden" name="mine" value="true" /> : null}
              <button
                type="submit"
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-semibold transition hover:border-cyan-400/70 hover:bg-white/10"
              >
                ← Mois précédent
              </button>
            </form>
            <form
              action="/app/student/courses/agenda"
              method="get"
              className="inline-flex"
            >
              <input type="hidden" name="month" value={nextMonthValue} />
              {studioFilter ? <input type="hidden" name="studio" value={studioFilter} /> : null}
              {teacherFilter ? <input type="hidden" name="teacher" value={teacherFilter} /> : null}
              {onlyMine ? <input type="hidden" name="mine" value="true" /> : null}
              <button
                type="submit"
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-semibold transition hover:border-cyan-400/70 hover:bg-white/10"
              >
                Mois suivant →
              </button>
            </form>
          </div>
          {agendaItems.length === 0 && (
            <p className="mt-4 text-sm text-slate-200">
              Aucun cours prévu pour ce mois.
            </p>
          )}
        </section>
      )}

      {view === "week" && (
      <section className="panel p-6">
        <div className="flex items-center justify-between text-lg font-semibold text-white">
          <span>Vue semaine</span>
        </div>
          <div className="mt-3 grid gap-1.5 sm:gap-2 md:grid-cols-7 md:gap-3">
            {weekDays.map((day, idx) => {
              const dayAttendances = attendancesByDay[idx];
              const isPastDay = day < new Date(new Date().setHours(0, 0, 0, 0));
              const hideOnMobile = dayAttendances.length === 0 ? "hidden md:block" : "";
              return (
                <div
                  key={day.toISOString()}
                  className={`rounded-xl border border-white/10 bg-white/5 p-2 text-sm text-slate-200 ${hideOnMobile}`}
                >
                  <div className="mb-2 flex items-center justify-between text-xs font-semibold text-white">
                    <span className="flex items-center gap-1">
                      <span
                        className={`text-[10px] uppercase tracking-wide md:text-xs ${
                          isPastDay ? "text-slate-400" : "text-cyan-100"
                        }`}
                      >
                        {day.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "")}
                      </span>
                      <span className={isPastDay ? "text-slate-400" : undefined}>{day.getDate()}</span>
                    </span>
                    <span className="text-[11px] text-cyan-100">{dayAttendances.length} cours</span>
                  </div>
                    <div className="flex flex-col gap-1.5 md:gap-2">
                    {dayAttendances.map((a) => {
                      const past = isPastCourse(a.course.date, a.course.durationMinutes);
                      const isMine = attendingCourseIds.has(a.courseId);
                      const badgeClass = past
                        ? "border border-blue-400/70 bg-blue-600/30 text-blue-50"
                        : "border border-amber-300/70 bg-amber-500/25 text-amber-50";
                    return (
                      <Link
                        key={a.id}
                        href={`/app/student/courses/${a.courseId}?from=/app/student/courses/agenda`}
                        className={`inline-flex w-full items-center justify-between gap-2 rounded-md border px-2 py-1 text-[11px] transition hover:border-cyan-300/70 hover:bg-white/15 md:rounded-lg md:px-2.5 md:py-1.5 ${
                          past
                            ? "border-white/15 bg-slate-800/60 text-slate-300 opacity-70 line-through"
                            : "border-white/10 bg-white/10 text-white"
                        }`}
                        title={`Durée : ${formatDuration(a.course.durationMinutes ?? 60)}`}
                      >
                          <div className="flex-1 space-y-0.5 overflow-hidden">
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-semibold ${
                                  isMine
                                    ? badgeClass
                                    : "border border-white/20 bg-white/10 text-slate-300"
                                }`}
                                title={
                                  isMine
                                    ? past
                                      ? "Cours déjà suivi"
                                      : "Inscrit"
                                    : "Non inscrit"
                                }
                              >
                                ●
                              </span>
                              <p className="text-[9px] text-cyan-100 whitespace-nowrap">
                                {new Date(a.course.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", hour12: false })}{" "}
                                - {formatDuration(a.course.durationMinutes ?? 60)}
                              </p>
                          </div>
                          <p className="truncate text-[11px] font-semibold text-white">
                            {a.course.title ?? "Cours"}
                          </p>
                          <p className="truncate text-[10px] text-cyan-100">
                            {a.course.teacher?.name ?? a.course.teacher?.email ?? "Professeur"}
                          </p>
                          <p className="truncate text-[10px] text-slate-200">
                            {a.course.studio?.name ?? "Studio non renseigné"}
                          </p>
                        </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-center gap-3 text-sm text-white">
            <form action="/app/student/courses/agenda" method="get" className="inline-flex">
              <input type="hidden" name="view" value="week" />
              <input type="hidden" name="week" value={prevWeekValue} />
              {monthParam ? <input type="hidden" name="month" value={monthParam} /> : null}
              {studioFilter ? <input type="hidden" name="studio" value={studioFilter} /> : null}
              {teacherFilter ? <input type="hidden" name="teacher" value={teacherFilter} /> : null}
              {onlyMine ? <input type="hidden" name="mine" value="true" /> : null}
              {schoolsParam ? <input type="hidden" name="schools" value="all" /> : null}
              <button
                type="submit"
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-semibold transition hover:border-cyan-400/70 hover:bg-white/10"
              >
                ← Semaine précédente
              </button>
            </form>
            <form action="/app/student/courses/agenda" method="get" className="inline-flex">
              <input type="hidden" name="view" value="week" />
              <input type="hidden" name="week" value={nextWeekValue} />
              {monthParam ? <input type="hidden" name="month" value={monthParam} /> : null}
              {studioFilter ? <input type="hidden" name="studio" value={studioFilter} /> : null}
              {teacherFilter ? <input type="hidden" name="teacher" value={teacherFilter} /> : null}
              {onlyMine ? <input type="hidden" name="mine" value="true" /> : null}
              {schoolsParam ? <input type="hidden" name="schools" value="all" /> : null}
              <button
                type="submit"
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-semibold transition hover:border-cyan-400/70 hover:bg-white/10"
              >
                Semaine suivante →
              </button>
            </form>
          </div>
      </section>
      )}
    </main>
  );
}
