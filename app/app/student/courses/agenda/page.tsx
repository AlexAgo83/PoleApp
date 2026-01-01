import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";

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

export default async function StudentCoursesAgendaPage({
  searchParams,
}: {
  searchParams?: Promise<{
    month?: string;
    studio?: string;
    teacher?: string;
    mine?: string | string[];
    view?: string;
    schools?: string;
    week?: string;
    from?: string;
    to?: string;
    q?: string;
    discipline?: string | string[];
    statuses?: string | string[];
  }>;
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
  const mineRaw = resolved.mine;
  const mineValues = Array.isArray(mineRaw) ? mineRaw : mineRaw ? [mineRaw] : [];
  const mineLast = mineValues.length > 0 ? mineValues[mineValues.length - 1] : undefined;
  const onlyMine =
    mineLast === undefined
      ? true
      : mineLast === "true" || mineLast === "1" || mineLast === "on" || mineLast === "";
  const fromParam = typeof resolved.from === "string" ? resolved.from : undefined;
  const toParam = typeof resolved.to === "string" ? resolved.to : undefined;
  const q = resolved.q?.toString().trim() ?? "";
  const statusesParam = resolved.statuses;
  const disciplineParam = resolved.discipline;
  const disciplineFilters =
    typeof disciplineParam === "string"
      ? disciplineParam.split(",").map((v) => v.trim()).filter(Boolean)
      : Array.isArray(disciplineParam)
      ? disciplineParam.flatMap((v) => v.split(",")).map((v) => v.trim()).filter(Boolean)
      : [];
  const selectedStatuses =
    typeof statusesParam === "string"
      ? statusesParam.split(",").map((s) => s.trim()).filter(Boolean)
      : Array.isArray(statusesParam)
      ? statusesParam.flatMap((s) => s.split(",").map((v) => v.trim()).filter(Boolean))
      : ["past", "attending", "waitlist", "open"];
  const statusesSet = new Set(selectedStatuses);
  const baseDate = monthParam ? new Date(`${monthParam}-01T00:00:00`) : new Date();
  const monthStart = startOfMonth(baseDate);
  const monthEnd = endOfMonth(baseDate);
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
  const explicitRangeStart = fromParam ? new Date(`${fromParam}T00:00:00`) : monthStart;
  const explicitRangeEnd = toParam ? new Date(`${toParam}T23:59:59`) : monthEnd;
  const rangeStart = new Date(Math.min(explicitRangeStart.getTime(), weekRangeStart.getTime()));
  const rangeEnd = new Date(Math.max(explicitRangeEnd.getTime(), weekRangeEnd.getTime()));
  const baseDateFilter: Prisma.DateTimeFilter = { gte: rangeStart, lte: rangeEnd };
  if (!selectedStatuses.includes("past")) {
    baseDateFilter.gte = new Date(Math.max(rangeStart.getTime(), NOW_MS));
  }

  const buildViewHref = (mode: "month" | "week") => {
    const params = new URLSearchParams();
    if (mode !== "month") params.set("view", mode);
    if (mode === "week" && weekValue) params.set("week", weekValue);
    if (monthParam) params.set("month", monthParam);
    if (fromParam) params.set("from", fromParam);
    if (toParam) params.set("to", toParam);
    if (studioFilter) params.set("studio", studioFilter);
    if (teacherFilter) params.set("teacher", teacherFilter);
    if (disciplineFilters.length > 0) params.set("discipline", disciplineFilters.join(","));
    if (onlyMine) params.set("mine", "true");
    if (schoolsParam) params.set("schools", "all");
    if (q) params.set("q", q);
    return `/app/student/courses/agenda${params.toString() ? `?${params}` : ""}`;
  };

  const attendances = onlyMine
    ? await prisma.courseAttendance.findMany({
        where: {
          studentId: session.user.id,
          course: {
            date: baseDateFilter,
            ...(teacherFilter ? { teacherId: teacherFilter } : {}),
            ...(studioFilter ? { studioId: studioFilter } : {}),
            ...(q
              ? {
                  title: { contains: q, mode: "insensitive" as Prisma.QueryMode },
                }
              : {}),
            ...(disciplineFilters.length > 0
              ? {
                  disciplineId: { in: disciplineFilters },
                }
              : {}),
            ...(allowedSchoolIds && allowedSchoolIds.length > 0
              ? { schoolId: { in: allowedSchoolIds } }
              : session.user.schoolId
              ? { schoolId: session.user.schoolId }
              : {}),
          },
        },
        select: {
          id: true,
          courseId: true,
          status: true,
          waitlistRank: true,
          course: {
            select: {
              id: true,
              title: true,
              discipline: true,
              disciplineId: true,
              date: true,
              durationMinutes: true,
              maxSeats: true,
              photoUrl: true,
              schoolId: true,
              isVirtual: true,
              _count: { select: { positions: true } },
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
            date: baseDateFilter,
            ...(teacherFilter ? { teacherId: teacherFilter } : {}),
            ...(studioFilter ? { studioId: studioFilter } : {}),
            ...(q
              ? {
                  title: { contains: q, mode: "insensitive" as Prisma.QueryMode },
                }
              : {}),
            ...(disciplineFilters.length > 0
              ? {
                  disciplineId: { in: disciplineFilters },
                }
              : {}),
          },
          include: {
            teacher: { select: { name: true, email: true } },
            studio: { select: { name: true } },
            _count: { select: { positions: true } },
            attendances: {
              where: { studentId: session.user.id },
              select: { id: true, status: true, waitlistRank: true },
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
        ...(disciplineFilters.length > 0
          ? {
              OR: [
                { disciplineId: { in: disciplineFilters } },
                { discipline: { in: disciplineFilters, mode: "insensitive" as Prisma.QueryMode } },
              ],
            }
          : {}),
        ...(allowedSchoolIds && allowedSchoolIds.length > 0
          ? { schoolId: { in: allowedSchoolIds } }
          : session.user.schoolId
          ? { schoolId: session.user.schoolId }
          : {}),
      },
    },
    select: {
      courseId: true,
      status: true,
      waitlistRank: true,
      course: { select: { date: true, durationMinutes: true } },
    },
  });
  // Note: attendingCourseIds disponible si besoin de stats plus tard.
  const waitlistCourseMap = new Map<string, number | null>();
  myAttendancesForMonth
    .filter((a) => a.status === "WAITLIST")
    .forEach((a) => waitlistCourseMap.set(a.courseId, a.waitlistRank ?? null));
  const agendaItems = onlyMine
    ? attendances.map((a) => ({
        id: a.id,
        courseId: a.courseId,
        course: a.course,
        isMine: true,
        myAttendance: { status: a.status, waitlistRank: a.waitlistRank },
      }))
    : schoolCourses.map((c) => ({
        id: c.id,
        courseId: c.id,
        course: c,
        isMine: Boolean(c.attendances?.length),
        myAttendance: c.attendances?.[0],
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

  const disciplinesPromise = prisma.discipline
    .findMany({
      select: { id: true, name: true, color: true },
      orderBy: { name: "asc" },
    })
    .catch(() => []);

  const [studios, teachers, disciplineRows] = await Promise.all([
    studiosPromise,
    teachersPromise,
    disciplinesPromise,
  ]);

  const disciplines = (() => {
    const rows = (disciplineRows ?? []).map((d) => ({ ...d })) as { id?: string; name: string; color?: string | null }[];
    if (rows.length === 0) return FALLBACK_DISCIPLINES;
    return rows;
  })();
  const disciplineNameById = new Map((disciplines as any[]).map((d) => [d.id, d.name]));

  const initialWeekDays = weekDays.map((d, idx) => {
    const dayAttendances = attendancesByDay[idx];
    return {
      isoDate: d.toISOString(),
      label: d.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", ""),
      day: d.getDate(),
      isPast: d < new Date(new Date().setHours(0, 0, 0, 0)),
      courses: dayAttendances.map((a) => {
        const past = isPastCourse(a.course.date, a.course.durationMinutes);
        return {
          id: a.course.id,
          title: a.course.title,
          discipline: disciplineNameById.get((a.course as any).disciplineId ?? "") ?? a.course.discipline,
          disciplineId: (a.course as any).disciplineId ?? null,
          date: a.course.date.toISOString(),
          durationMinutes: a.course.durationMinutes,
          teacherName: a.course.teacher?.name ?? a.course.teacher?.email ?? "Professeur",
          studioName: a.course.studio?.name ?? "Studio non renseigné",
          isVirtual: (a.course as any)?.isVirtual ?? false,
          positionsCount: (a.course as any)?._count?.positions ?? 0,
          past,
          myStatus: a.myAttendance?.status ?? null,
          waitlistRank: a.myAttendance?.waitlistRank ?? null,
        };
      }),
    };
  });

  const daysInMonth = monthEnd.getDate();
  const firstDay = monthStart.getDay() === 0 ? 7 : monthStart.getDay(); // Monday=1 ... Sunday=7
  const cells: Array<{ day?: number; attendances?: typeof agendaItems }> = [];
  for (let i = 1; i < firstDay; i += 1) {
    cells.push({});
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateStr = new Date(monthStart.getFullYear(), monthStart.getMonth(), day).toDateString();
    const daily = agendaItems.filter(
      (a) => new Date(a.course.date).toDateString() === dateStr
    );
    cells.push({ day, attendances: daily });
  }

  const monthValue = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`;
  const currentMonthValue = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const hasMonthFilter = Boolean(monthParam);
  const activeFilters =
    (hasMonthFilter ? 1 : 0) +
    (studioFilter ? 1 : 0) +
    (teacherFilter ? 1 : 0) +
    (onlyMine ? 1 : 0) +
    (fromParam ? 1 : 0) +
    (toParam ? 1 : 0) +
    (disciplineFilters.length > 0 ? 1 : 0) +
    (selectedStatuses.length !== 4 ? 1 : 0) +
    (q ? 1 : 0);

  const prevMonth = new Date(monthStart);
  prevMonth.setMonth(prevMonth.getMonth() - 1);
  const nextMonth = new Date(monthStart);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const prevMonthValue = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;
  const nextMonthValue = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;
  const initialMonthCells = cells.map((cell) => {
    const isoDate =
      typeof cell.day === "number"
        ? new Date(monthStart.getFullYear(), monthStart.getMonth(), cell.day).toISOString()
        : undefined;
    return {
      day: cell.day,
      isoDate,
      courses: (cell.attendances ?? []).map((a) => ({
        id: a.id,
        courseId: a.courseId,
        title: a.course.title,
        discipline: disciplineNameById.get((a.course as any).disciplineId ?? "") ?? a.course.discipline,
        disciplineId: (a.course as any).disciplineId ?? null,
        date: a.course.date instanceof Date ? a.course.date.toISOString() : a.course.date,
        durationMinutes: a.course.durationMinutes,
        teacherName: a.course.teacher?.name ?? a.course.teacher?.email ?? "Professeur",
        studioName: a.course.studio?.name ?? "Studio non renseigné",
        isVirtual: (a.course as any)?.isVirtual ?? false,
        positionsCount: (a.course as any)?._count?.positions ?? 0,
        myStatus: a.myAttendance?.status ?? null,
        waitlistRank: a.myAttendance?.waitlistRank ?? null,
        past: isPastCourse(a.course.date, a.course.durationMinutes),
      })),
    };
  });
  const hasMonthCourses = agendaItems.length > 0;
  const legendItems = [
    { key: "past", label: "Passé (déjà suivi)", className: "border border-blue-400/70 bg-blue-600/30 text-blue-50" },
    { key: "attending", label: "Inscrit (à venir)", className: "border border-amber-300/70 bg-amber-500/25 text-amber-50" },
    { key: "waitlist", label: "Liste d’attente", className: "border border-purple-300/70 bg-purple-500/25 text-purple-50" },
    { key: "open", label: "Disponible (non inscrit)", className: "border border-white/20 bg-white/10 text-slate-300" },
  ];

  return (
    <main className="flex min-h-screen w-full flex-col gap-4">
      <section className="panel space-y-4 border-indigo-400/25 p-6 shadow-indigo-900/30">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-white">Agenda</h1>
            <p className="text-sm text-slate-200">
              Navigation hebdo/mensuelle sans rechargement.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 md:self-start">
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
              href="/app/student/courses"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/list.svg" alt="" className="h-4 w-4" />
              Liste
            </Link>
          </div>
        </div>

        <div className="text-sm text-slate-200">
          <p className="text-xs uppercase tracking-[0.14em] text-cyan-100">Légende</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {legendItems.map((item) => (
              <span
                key={item.key}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-semibold ${
                  statusesSet.has(item.key)
                    ? item.className
                    : "border border-white/20 bg-white/10 text-slate-400 opacity-80"
                }`}
              >
                <span aria-hidden="true">●</span>
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <FilterPanel
          storageKey="filters:student-agenda"
          title="Filtres"
          activeCount={activeFilters}
          userKey={userKey}
          className="mt-2"
          contentClassName=""
        >
          <form
            method="get"
            key={`agenda-${monthParam ?? "current"}`}
            className="mt-3 grid w-full gap-3 md:grid-cols-4 md:items-end"
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
              <input type="hidden" name="mine" value="false" />
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
            <fieldset className="md:col-span-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
              <legend className="px-1 text-xs uppercase tracking-[0.12em] text-cyan-100">Statuts affichés</legend>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-200 sm:grid-cols-4">
                {legendItems.map((item) => (
                  <label
                    key={item.key}
                    className={`inline-flex items-center gap-2 rounded-full border px-2 py-1 ${
                      statusesSet.has(item.key)
                        ? `${item.className} border-white/15`
                        : "border-white/15 bg-white/5 text-slate-400"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="statuses"
                      value={item.key}
                      defaultChecked={statusesSet.has(item.key)}
                      className="h-4 w-4 rounded border-white/20 bg-white/5"
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            </fieldset>
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
        {view === "month" && (
          <MonthView
            initialMonth={monthValue}
            currentMonth={currentMonthValue}
            initialPrev={prevMonthValue}
            initialNext={nextMonthValue}
            initialCells={initialMonthCells}
            hasCourses={hasMonthCourses}
            filters={{
              teacher: teacherFilter,
              studio: studioFilter,
              discipline: disciplineFilters.length > 0 ? disciplineFilters.join(",") : undefined,
              mine: onlyMine,
              schools: schoolsParam,
              q,
              statuses: selectedStatuses.join(","),
              from: fromParam,
              to: toParam,
            }}
            baseFrom="/app/student/courses/agenda"
          />
        )}

        {view === "week" && (
          <WeekView
            initialWeek={weekValue}
            initialPrev={prevWeekValue}
            initialNext={nextWeekValue}
            initialDays={initialWeekDays}
            filters={{
              teacher: teacherFilter,
              studio: studioFilter,
              discipline: disciplineFilters.length > 0 ? disciplineFilters.join(",") : undefined,
              mine: onlyMine,
              schools: schoolsParam,
              q,
            }}
            baseFrom="/app/student/courses/agenda"
          />
        )}
      </section>
    </main>
  );
}
