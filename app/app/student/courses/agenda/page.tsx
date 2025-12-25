import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { FilterPanel } from "@/components/FilterPanel";
import { prisma } from "@/lib/prisma";
import { WeekView } from "./WeekView";

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
  searchParams?: Promise<{
    month?: string;
    studio?: string;
    teacher?: string;
    mine?: string;
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
  const mineFilter =
    resolved.mine === "true" ||
    resolved.mine === "1" ||
    resolved.mine === "on" ||
    resolved.mine === "";
  const onlyMine = mineFilter;
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
            date: { gte: rangeStart, lte: rangeEnd },
            ...(teacherFilter ? { teacherId: teacherFilter } : {}),
            ...(studioFilter ? { studioId: studioFilter } : {}),
    ...(q
      ? {
          title: { contains: q, mode: "insensitive" as Prisma.QueryMode },
        }
      : {}),
    ...(disciplineFilters.length > 0
      ? {
          OR: disciplineFilters.map((d) => ({
            discipline: { contains: d, mode: "insensitive" as Prisma.QueryMode },
          })),
        }
      : {}),
    ...(selectedStatuses.includes("past")
      ? {}
      : { date: { gte: new Date() } }),
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
              date: true,
              durationMinutes: true,
              maxSeats: true,
              photoUrl: true,
              schoolId: true,
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
            ...(q
              ? {
                  title: { contains: q, mode: "insensitive" as Prisma.QueryMode },
                }
              : {}),
            ...(disciplineFilters.length > 0
              ? {
                  OR: disciplineFilters.map((d) => ({
                    discipline: { contains: d, mode: "insensitive" as Prisma.QueryMode },
                  })),
                }
              : {}),
            ...(selectedStatuses.includes("past")
              ? {}
              : { date: { gte: new Date() } }),
          },
          include: {
            teacher: { select: { name: true, email: true } },
            studio: { select: { name: true } },
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
              OR: disciplineFilters.map((d) => ({
                discipline: { contains: d, mode: "insensitive" as Prisma.QueryMode },
              })),
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
  const attendingCourseIds = new Set(
    myAttendancesForMonth.filter((a) => a.status === "CONFIRMED").map((a) => a.courseId)
  );
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

  const courseDisciplinesPromise = session.user.schoolId
    ? prisma.course.findMany({
        where: { schoolId: session.user.schoolId },
        select: { discipline: true },
        distinct: ["discipline"],
      })
    : Promise.resolve([]);

  const disciplinesPromise = session.user.schoolId
    ? prisma.discipline
        .findMany({
          where: { schoolId: session.user.schoolId },
          select: { id: true, name: true, color: true },
          orderBy: { name: "asc" },
        })
        .catch(() => [])
    : Promise.resolve([]);

  const [studios, teachers, courseDisciplines, disciplines] = await Promise.all([
    studiosPromise,
    teachersPromise,
    courseDisciplinesPromise,
    (async () => {
      try {
        const client: any = prisma as any;
        if (!client.discipline?.findMany) return FALLBACK_DISCIPLINES;
        const rows = await client.discipline.findMany({
          where: { schoolId: session.user.schoolId },
          select: { id: true, name: true, color: true },
          orderBy: { name: "asc" },
        });
        const legacy = courseDisciplines
          .map((c) => c.discipline)
          .filter((d): d is string => Boolean(d && d.trim().length > 0))
          .map((d) => ({ name: d.trim(), color: undefined as string | undefined }));
        const merged = [...rows];
        legacy.forEach((d) => {
          if (!merged.some((m) => m.name.toLowerCase() === d.name.toLowerCase())) {
            merged.push(d);
          }
        });
        return (merged.length > 0 ? merged : FALLBACK_DISCIPLINES) as { name: string; color?: string }[];
      } catch {
        return FALLBACK_DISCIPLINES as { name: string; color?: string }[];
      }
    })(),
  ]);

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
          discipline: a.course.discipline,
          date: a.course.date.toISOString(),
          durationMinutes: a.course.durationMinutes,
          teacherName: a.course.teacher?.name ?? a.course.teacher?.email ?? "Professeur",
          studioName: a.course.studio?.name ?? "Studio non renseigné",
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

  const monthLabel = monthStart.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const monthValue = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`;
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

  const monthParams = new URLSearchParams();
  if (studioFilter) monthParams.set("studio", studioFilter);
  if (teacherFilter) monthParams.set("teacher", teacherFilter);
  if (onlyMine) monthParams.set("mine", "true");
  if (schoolsParam) monthParams.set("schools", "all");
  if (disciplineFilters.length > 0) monthParams.set("discipline", disciplineFilters.join(","));
  if (fromParam) monthParams.set("from", fromParam);
  if (toParam) monthParams.set("to", toParam);
  if (q) monthParams.set("q", q);
  if (selectedStatuses.length !== 4) monthParams.set("statuses", selectedStatuses.join(","));
  const prevMonth = new Date(monthStart);
  prevMonth.setMonth(prevMonth.getMonth() - 1);
  const nextMonth = new Date(monthStart);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const prevMonthValue = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;
  const nextMonthValue = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;
const legendItems = [
  { key: "past", label: "Passé (déjà suivi)", className: "border border-blue-400/70 bg-blue-600/30 text-blue-50" },
  { key: "attending", label: "Inscrit (à venir)", className: "border border-amber-300/70 bg-amber-500/25 text-amber-50" },
  { key: "waitlist", label: "Liste d’attente (rang, quota 14)", className: "border border-purple-300/70 bg-purple-500/25 text-purple-50" },
  { key: "open", label: "Disponible (non inscrit)", className: "border border-white/20 bg-white/10 text-slate-300" },
];

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
      <section className="panel border-white/10 bg-white/5 p-4 text-sm text-slate-200">
        <p className="text-xs uppercase tracking-[0.14em] text-cyan-100">Légende</p>
        <form method="get" className="mt-2 flex flex-wrap items-center gap-2">
          <input type="hidden" name="view" value={view} />
          {monthParam ? <input type="hidden" name="month" value={monthParam} /> : null}
          {weekParam ? <input type="hidden" name="week" value={weekParam} /> : null}
          {studioFilter ? <input type="hidden" name="studio" value={studioFilter} /> : null}
          {teacherFilter ? <input type="hidden" name="teacher" value={teacherFilter} /> : null}
          {onlyMine ? <input type="hidden" name="mine" value="true" /> : null}
          {schoolsParam ? <input type="hidden" name="schools" value="all" /> : null}
          {disciplineFilters.length > 0 ? (
            <input type="hidden" name="discipline" value={disciplineFilters.join(",")} />
          ) : null}
          {fromParam ? <input type="hidden" name="from" value={fromParam} /> : null}
          {toParam ? <input type="hidden" name="to" value={toParam} /> : null}
          {q ? <input type="hidden" name="q" value={q} /> : null}
          {legendItems.map((item) => (
            <label
              key={item.key}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-semibold ${
                statusesSet.has(item.key) ? item.className : "border border-white/20 bg-white/10 text-slate-400"
              }`}
            >
              <input
                type="checkbox"
                name="statuses"
                value={item.key}
                defaultChecked={statusesSet.has(item.key)}
                className="h-4 w-4 rounded border-white/20 bg-white/5"
              />
              ● {item.label}
            </label>
          ))}
          <button
            type="submit"
            className="ml-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[12px] font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            Mettre à jour
          </button>
        </form>
        <p className="mt-2 text-xs text-slate-300">
          Le rang s’affiche si fourni (quota 14 élèves, statut WAITLIST requis).
        </p>
      </section>

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
            <fieldset className="text-sm text-slate-200">
              <legend className="mb-1 text-xs uppercase tracking-[0.12em] text-cyan-100">Discipline</legend>
              <div className="flex flex-wrap gap-2">
                {disciplines.map((d, idx) => (
                  <label
                    key={`${(d as any).id ?? d.name}-${idx}`}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs text-slate-200"
                  >
                    <input
                      type="checkbox"
                      name="discipline"
                      value={d.name}
                      defaultChecked={disciplineFilters.includes(d.name)}
                      className="h-4 w-4 rounded border-white/20 bg-white/5"
                    />
                    <span
                      className="inline-flex h-3 w-3 rounded-full border border-white/20"
                      style={{ backgroundColor: (d as any).color ?? undefined }}
                    />
                    {d.name}
                  </label>
                ))}
              </div>
            </fieldset>
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
          <div className="mt-3">
            <div className="grid grid-cols-2 gap-1.5 text-sm text-slate-200 sm:grid-cols-3 sm:gap-2 md:grid-cols-4 md:gap-3 lg:grid-cols-7">
              {cells.map((cell, idx) => {
                const weekDayIndex = (idx % 7) + 1; // 1-based
                const label = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"][(weekDayIndex - 1) % 7];
                const cellDate = cell.day
                  ? new Date(monthStart.getFullYear(), monthStart.getMonth(), cell.day)
                  : null;
                const isPastDay = cellDate ? cellDate < new Date(new Date().setHours(0, 0, 0, 0)) : false;
                return (
                  <div
                    key={idx}
                    className={`rounded-xl border border-white/10 bg-white/5 p-2 text-left ${
                      !cell.attendances || cell.attendances.length === 0 ? "min-h-[56px] md:min-h-[80px]" : "min-h-[80px]"
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
                        const isMineConfirmed = Boolean(a.myAttendance?.status === "CONFIRMED");
                        const isWaitlist = Boolean(a.myAttendance?.status === "WAITLIST");
                        const badgeClass = isWaitlist
                          ? "border border-purple-300/70 bg-purple-500/25 text-purple-50"
                          : isMineConfirmed
                          ? past
                            ? "border border-blue-400/70 bg-blue-600/30 text-blue-50"
                            : "border border-amber-300/70 bg-amber-500/25 text-amber-50"
                          : "border border-white/20 bg-white/10 text-slate-300";
                        const statusLabel = past
                          ? "Passé"
                          : isWaitlist
                          ? "Attente"
                          : isMineConfirmed
                          ? "À venir"
                          : "Ouvert";
                        const rankLabel =
                          isWaitlist && a.myAttendance?.waitlistRank
                            ? `#${a.myAttendance.waitlistRank}`
                            : null;
                        return (
                          <Link
                            key={a.id}
                            href={`/app/student/courses/${a.courseId}?from=/app/student/courses/agenda`}
                            className={`relative mt-1 flex items-start gap-2 rounded-md border px-2 py-2 text-[11px] transition hover:border-cyan-300/60 hover:bg-white/15 md:rounded-lg md:px-2.5 md:py-2 ${
                              past
                                ? "border-white/10 bg-slate-800/60 text-slate-300 opacity-70 line-through"
                                : "border-white/10 bg-white/10 text-white"
                            }`}
                          >
                            <div className="flex-1 space-y-0.5 overflow-hidden pr-6">
                              <p className="text-[9px] text-cyan-100 whitespace-nowrap">
                                {new Date(a.course.date).toLocaleTimeString("fr-FR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: false,
                                })}{" "}
                                - {formatDuration(a.course.durationMinutes ?? 60)}
                              </p>
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
                            <span
                              className={`absolute bottom-1 right-1 inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                isMineConfirmed || isWaitlist
                                  ? badgeClass
                                  : "border border-white/20 bg-white/10 text-slate-300"
                              }`}
                              title={
                                isWaitlist
                                  ? "Liste d'attente"
                                  : isMineConfirmed
                                  ? past
                                    ? "Cours déjà suivi"
                                    : "Inscrit"
                                  : "Non inscrit"
                              }
                            >
                              {rankLabel ?? statusLabel}
                            </span>
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
          </div>
          <div className="mt-4 flex items-center justify-center gap-3 text-sm text-white">
            <form
            action="/app/student/courses/agenda"
            method="get"
            className="inline-flex"
          >
            <input type="hidden" name="month" value={prevMonthValue} />
            {fromParam ? <input type="hidden" name="from" value={fromParam} /> : null}
            {toParam ? <input type="hidden" name="to" value={toParam} /> : null}
            {studioFilter ? <input type="hidden" name="studio" value={studioFilter} /> : null}
            {teacherFilter ? <input type="hidden" name="teacher" value={teacherFilter} /> : null}
            {onlyMine ? <input type="hidden" name="mine" value="true" /> : null}
            {q ? <input type="hidden" name="q" value={q} /> : null}
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
            {fromParam ? <input type="hidden" name="from" value={fromParam} /> : null}
            {toParam ? <input type="hidden" name="to" value={toParam} /> : null}
            {studioFilter ? <input type="hidden" name="studio" value={studioFilter} /> : null}
            {teacherFilter ? <input type="hidden" name="teacher" value={teacherFilter} /> : null}
            {onlyMine ? <input type="hidden" name="mine" value="true" /> : null}
            {q ? <input type="hidden" name="q" value={q} /> : null}
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
    </main>
  );
}
