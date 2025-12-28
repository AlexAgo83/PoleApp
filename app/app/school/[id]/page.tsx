import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { Prisma } from "@prisma/client";
import { FilterPanel } from "@/components/FilterPanel";
import { SafeImage } from "@/components/SafeImage";
import { WeekView as StudentWeekView } from "@/app/app/student/courses/agenda/WeekView";
import { WeekView as TeacherWeekView } from "@/app/app/teacher/courses/agenda/WeekView";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { COURSE_PLACEHOLDER } from "@/lib/placeholders";
import { StudioMonthView } from "../StudioMonthView";

export const dynamic = "force-dynamic";

function formatWeekKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatMonthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

type PageProps =
  | { params: { id: string }; searchParams?: Promise<Record<string, string | string[] | undefined>> }
  | { params: Promise<{ id?: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function StudioPage({ params, searchParams }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const studioId = resolvedParams?.id;
  if (!studioId) redirect("/access-denied");

  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const userRole = session.user.role;
  const agendaRole = (userRole === "SUPER_ADMIN" ? "SCHOOL_ADMIN" : userRole) as "STUDENT" | "TEACHER" | "SCHOOL_ADMIN";

  const resolvedSearch = (await Promise.resolve(searchParams)) ?? {};
  const qRaw = resolvedSearch?.q;
  const pageRaw = resolvedSearch?.page;
  const teacherFilter = typeof resolvedSearch?.teacher === "string" ? resolvedSearch.teacher : "";
  const disciplineFilter = resolvedSearch?.discipline?.toString().trim() ?? "";
  const viewParam = resolvedSearch?.view?.toString() ?? "";
  const viewMode: "list" | "agenda" = viewParam === "agenda" ? "agenda" : "list";
  const rangeParam = resolvedSearch?.range?.toString();
  const agendaRange: "week" | "month" = rangeParam === "month" ? "month" : "week";
  const weekParam = resolvedSearch?.week?.toString();
  const monthParam = resolvedSearch?.month?.toString();
  const q = typeof qRaw === "string" ? qRaw.trim() : "";
  const currentPage = Math.max(1, Number.isFinite(Number(pageRaw)) ? Number(pageRaw) : 1);
  const pageSize = 5;

  const baseWhere: Prisma.CourseWhereInput = {
    studioId,
    ...(teacherFilter ? { teacherId: teacherFilter } : {}),
    ...(disciplineFilter
      ? {
          discipline: { contains: disciplineFilter, mode: Prisma.QueryMode.insensitive },
        }
      : {}),
    ...(q
      ? {
          title: { contains: q, mode: "insensitive" as Prisma.QueryMode },
        }
      : {}),
  };

  const totalCount = await prisma.course.count({ where: baseWhere });

  const [studio, teacherOptions, disciplineOptions] = await Promise.all([
    prisma.studio.findUnique({
      where: { id: studioId },
      include: {
        school: { select: { id: true, name: true } },
        ...(viewMode === "list"
          ? {
              courses: {
                orderBy: { date: "asc" },
                skip: (currentPage - 1) * pageSize,
                take: pageSize,
                where: baseWhere,
                include: {
                  teacher: { select: { id: true, name: true, email: true } },
                  _count: { select: { attendances: true, positions: true, notes: true } },
                },
              },
            }
          : {}),
      },
    }),
    prisma.user.findMany({
      where: { schoolId: session.user.schoolId ?? undefined, role: "TEACHER" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.course.findMany({
      where: { studioId },
      select: { discipline: true },
      distinct: ["discipline"],
      orderBy: { discipline: "asc" },
    }),
  ]);

  if (!studio || (session.user.schoolId && studio.school?.id && studio.school.id !== session.user.schoolId)) {
    redirect("/access-denied");
  }

  const isAdmin = userRole === "SCHOOL_ADMIN";
  const schoolName = studio.school?.name ?? "École";
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const returnHref =
    userRole === "SCHOOL_ADMIN"
      ? "/app/admin/studios"
      : userRole === "TEACHER"
        ? "/app/teacher/school"
        : "/app/student/school";
  const activeFilters = [q && q.length > 0, teacherFilter, disciplineFilter].filter(Boolean).length;
  const isStudentRole = userRole === "STUDENT";
  const agendaWeekBase = weekParam ? new Date(`${weekParam}T00:00:00`) : new Date();
  const weekStart = new Date(agendaWeekBase);
  const dayOffset = weekStart.getDay() === 0 ? 6 : weekStart.getDay() - 1; // Monday=0
  weekStart.setDate(weekStart.getDate() - dayOffset);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  const prevWeek = new Date(weekStart);
  prevWeek.setDate(weekStart.getDate() - 7);
  const nextWeek = new Date(weekStart);
  nextWeek.setDate(weekStart.getDate() + 7);
  const weekValue = formatWeekKey(weekStart);
  const prevWeekValue = formatWeekKey(prevWeek);
  const nextWeekValue = formatWeekKey(nextWeek);
  const weekDays = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + idx);
    return d;
  });
  const agendaCourses =
    viewMode === "agenda" && agendaRange === "week"
      ? await prisma.course.findMany({
          where: {
            ...baseWhere,
            date: { gte: weekStart, lte: weekEnd },
          },
          include: {
            teacher: { select: { name: true, email: true } },
            studio: { select: { name: true } },
            ...(isStudentRole
              ? {
                  attendances: {
                    where: { studentId: session.user.id },
                    select: { status: true, waitlistRank: true },
                  },
                }
              : {}),
          },
          orderBy: { date: "asc" },
        })
      : [];
  const isPastCourse = (courseDate: Date, durationMinutes?: number | null) => {
    const endMs = new Date(courseDate).getTime() + (durationMinutes ?? 60) * 60_000;
    return endMs < Date.now();
  };
  const studentWeekDays =
    viewMode === "agenda" && isStudentRole
      ? weekDays.map((d) => {
          const dayCourses = agendaCourses.filter((c) => new Date(c.date).toDateString() === d.toDateString());
          return {
            isoDate: d.toISOString(),
            label: d.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", ""),
            day: d.getDate(),
            isPast: d < new Date(new Date().setHours(0, 0, 0, 0)),
            courses: dayCourses.map((course) => {
              const attendance = (course as { attendances?: { status: "CONFIRMED" | "WAITLIST"; waitlistRank: number | null }[] }).attendances?.[0];
              return {
                id: course.id,
                title: course.title,
                date: course.date instanceof Date ? course.date.toISOString() : course.date,
                durationMinutes: course.durationMinutes,
                discipline: course.discipline,
                teacherName: course.teacher?.name ?? course.teacher?.email ?? "Professeur",
                studioName: course.studio?.name ?? "Studio",
                past: isPastCourse(course.date as Date, course.durationMinutes),
                myStatus: attendance?.status ?? null,
                waitlistRank: attendance?.waitlistRank ?? null,
              };
            }),
          };
        })
      : null;
  const staffWeekDays =
    viewMode === "agenda" && !isStudentRole
      ? weekDays.map((d) => {
          const dayCourses = agendaCourses.filter((c) => new Date(c.date).toDateString() === d.toDateString());
          return {
            isoDate: d.toISOString(),
            label: d.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", ""),
            day: d.getDate(),
            isPast: d < new Date(new Date().setHours(0, 0, 0, 0)),
            courses: dayCourses.map((course) => ({
              id: course.id,
              title: course.title,
              date: course.date instanceof Date ? course.date.toISOString() : course.date,
              durationMinutes: course.durationMinutes,
              teacherName: course.teacher?.name ?? course.teacher?.email ?? "Professeur",
              studioName: course.studio?.name ?? "Studio",
              past: isPastCourse(course.date as Date, course.durationMinutes),
            })),
          };
        })
      : null;
  const agendaFilters = {
    teacher: teacherFilter || undefined,
    studio: studioId,
    discipline: disciplineFilter || undefined,
    q: q || undefined,
  };
  const monthBase = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : formatMonthKey(new Date());
  const monthDate = new Date(`${monthBase}-01T00:00:00`);
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999);
  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
  const monthValue = formatMonthKey(monthStart);
  const prevMonthDate = new Date(monthStart);
  prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
  const prevMonthValue = formatMonthKey(prevMonthDate);
  const nextMonthDate = new Date(monthStart);
  nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
  const nextMonthValue = formatMonthKey(nextMonthDate);
  const agendaMonthCourses =
    viewMode === "agenda" && agendaRange === "month"
      ? await prisma.course.findMany({
          where: {
            ...baseWhere,
            date: { gte: monthStart, lte: monthEnd },
          },
          include: {
            teacher: { select: { name: true, email: true } },
            studio: { select: { name: true } },
            ...(isStudentRole
              ? {
                  attendances: {
                    where: { studentId: session.user.id },
                    select: { status: true, waitlistRank: true },
                  },
                }
              : {}),
          },
          orderBy: { date: "asc" },
        })
      : [];
  const monthDays =
    agendaRange === "month"
      ? Array.from({ length: daysInMonth }).map((_, idx) => {
          const date = new Date(monthStart);
          date.setDate(idx + 1);
          const dayCourses = agendaMonthCourses.filter((c) => new Date(c.date).toDateString() === date.toDateString());
          return { date, courses: dayCourses };
        })
      : [];
  const courseBasePath = userRole === "STUDENT" ? "/app/student/courses" : "/app/teacher/courses";
  const baseParams = new URLSearchParams();
  if (q) baseParams.set("q", q);
  if (teacherFilter) baseParams.set("teacher", teacherFilter);
  if (disciplineFilter) baseParams.set("discipline", disciplineFilter);
  const listHref = `/app/school/${studioId}${baseParams.toString() ? `?${baseParams.toString()}` : ""}`;
  const agendaParams = new URLSearchParams(baseParams);
  agendaParams.set("view", "agenda");
  agendaParams.set("range", agendaRange);
  if (agendaRange === "month") {
    agendaParams.set("month", monthValue);
  } else {
    agendaParams.set("week", weekValue);
  }
  const agendaHref = `/app/school/${studioId}?${agendaParams.toString()}`;
  const weekRangeParams = new URLSearchParams(baseParams);
  weekRangeParams.set("view", "agenda");
  weekRangeParams.set("range", "week");
  weekRangeParams.set("week", weekValue);
  const weekRangeHref = `/app/school/${studioId}?${weekRangeParams.toString()}`;
  const monthRangeParams = new URLSearchParams(baseParams);
  monthRangeParams.set("view", "agenda");
  monthRangeParams.set("range", "month");
  monthRangeParams.set("month", monthValue);
  const monthRangeHref = `/app/school/${studioId}?${monthRangeParams.toString()}`;
  const agendaBaseFromParams = new URLSearchParams(baseParams);
  agendaBaseFromParams.set("view", "agenda");
  agendaBaseFromParams.set("range", agendaRange);
  if (agendaRange === "month") {
    agendaBaseFromParams.set("month", monthValue);
  } else {
    agendaBaseFromParams.set("week", weekValue);
  }
  const agendaBaseFrom = `/app/school/${studioId}?${agendaBaseFromParams.toString()}`;
  const monthCells =
    agendaRange === "month"
      ? [
          ...Array.from({ length: (monthStart.getDay() === 0 ? 7 : monthStart.getDay()) - 1 }).map(() => ({
            day: undefined,
            courses: [],
          })),
          ...monthDays.map((day) => {
            const attendance = (course: (typeof agendaMonthCourses)[number]) =>
              isStudentRole
                ? (course as { attendances?: { status: "CONFIRMED" | "WAITLIST"; waitlistRank: number | null }[] }).attendances?.[0]
                : undefined;
            return {
              day: day.date.getDate(),
              courses: day.courses.map((course) => ({
                id: course.id,
                courseId: course.id,
                title: course.title,
                date: course.date instanceof Date ? course.date.toISOString() : course.date,
                durationMinutes: course.durationMinutes,
                teacherName: course.teacher?.name ?? course.teacher?.email ?? "Professeur",
                studioName: course.studio?.name ?? "Studio",
                myStatus: attendance(course)?.status ?? null,
                waitlistRank: attendance(course)?.waitlistRank ?? null,
                past: isPastCourse(course.date as Date, course.durationMinutes),
              })),
            };
          }),
        ]
      : [];

  return (
    <main className="flex min-h-screen w-full flex-col gap-4">
      <header className="panel p-4 md:p-6 space-y-3">
        <div className="flex flex-wrap items-start gap-2">
          <div className="min-w-[240px] flex-1">
            <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Studio</p>
            <h1 className="text-3xl font-semibold text-white">{studio.name}</h1>
            <p className="text-sm text-slate-300">École : {schoolName}</p>
            {studio.address && (
              <p className="text-sm text-slate-200">
                Adresse :{" "}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(studio.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-200 underline underline-offset-2 transition hover:text-cyan-100"
                >
                  {studio.address}
                </a>
              </p>
            )}
          </div>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2 text-sm">
            {isAdmin && (
              <Link
                href={`/app/admin/studios?edit=${studio.id}`}
                className="rounded-full border border-amber-400/60 bg-white/5 px-3 py-1.5 font-semibold text-white transition hover:border-amber-300/80 hover:bg-white/10"
              >
                Éditer (admin)
              </Link>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={listHref}
                className={`rounded-full border px-3 py-1.5 font-semibold transition ${
                  viewMode === "list"
                    ? "border-cyan-300/70 bg-cyan-500/20 text-white"
                    : "border-white/10 bg-white/5 text-slate-200 hover:border-cyan-300/60 hover:bg-white/10"
                }`}
              >
                Liste
              </Link>
              <Link
                href={agendaHref}
                className={`rounded-full border px-3 py-1.5 font-semibold transition ${
                  viewMode === "agenda"
                    ? "border-cyan-300/70 bg-cyan-500/20 text-white"
                    : "border-white/10 bg-white/5 text-slate-200 hover:border-cyan-300/60 hover:bg-white/10"
                }`}
              >
                Agenda
              </Link>
            </div>
            <Link
              href={returnHref}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
            >
              ← Retour
            </Link>
          </div>
        </div>
        {activeFilters > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-white">
            <span className="rounded-full border border-cyan-400/60 bg-cyan-500/20 px-2 py-0.5">
              {activeFilters} filtre{activeFilters > 1 ? "s" : ""} actif{activeFilters > 1 ? "s" : ""}
            </span>
            {teacherFilter && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-slate-200">
                Professeur filtré
              </span>
            )}
            {disciplineFilter && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-slate-200">
                Discipline : “{disciplineFilter}”
              </span>
            )}
            {q && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-slate-200">
                Recherche : “{q}”
              </span>
            )}
          </div>
        )}
        {studio.photoUrl && (
          <div className="w-full">
            <SafeImage
              src={studio.photoUrl}
              alt={`Photo du studio ${studio.name}`}
              width={960}
              height={360}
              className="h-48 w-full rounded-xl border border-white/10 object-cover shadow"
              fallbackSrc={COURSE_PLACEHOLDER}
            />
          </div>
        )}
      </header>

      {viewMode === "agenda" ? (
        <section className="panel space-y-4 p-4 md:p-6">
          <h2 className="text-lg font-semibold text-white">Agenda du studio</h2>
          <FilterPanel
            storageKey={`filters:studio:${studioId}:agenda`}
            title="Filtres"
            className="group w-full"
            contentClassName="mt-3"
          >
            <form method="get" className="space-y-3">
              <input type="hidden" name="view" value="agenda" />
              <input type="hidden" name="range" value={agendaRange} />
              {agendaRange === "week" ? (
                <input type="hidden" name="week" value={weekValue} />
              ) : (
                <input type="hidden" name="month" value={monthValue} />
              )}
              <label className="block text-sm text-slate-200">
                Recherche (titre)
                <input
                  type="text"
                  name="q"
                  defaultValue={q}
                  placeholder="Titre du cours"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
                />
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm text-slate-200">
                  Professeur
                  <select
                    name="teacher"
                    defaultValue={teacherFilter}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
                  >
                    <option value="">Tous les professeurs</option>
                    {teacherOptions.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name ?? t.email}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-slate-200">
                  Discipline
                  <select
                    name="discipline"
                    defaultValue={disciplineFilter}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
                  >
                    <option value="">Toutes disciplines</option>
                    {disciplineOptions
                      .filter((d) => d.discipline && d.discipline.trim().length > 0)
                      .map((d) => (
                        <option key={d.discipline} value={d.discipline ?? ""}>
                          {d.discipline}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="submit"
                  className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-400"
                >
                  Filtrer
                </button>
                <Link
                  href={agendaHref}
                  className="rounded-full border border-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
                >
                  Réinitialiser
                </Link>
              </div>
            </form>
          </FilterPanel>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={weekRangeHref}
                className={`rounded-full border px-3 py-1.5 font-semibold transition ${
                  agendaRange === "week"
                    ? "border-cyan-300/70 bg-cyan-500/20 text-white"
                    : "border-white/10 bg-white/5 text-slate-200 hover:border-cyan-300/60 hover:bg-white/10"
                }`}
              >
                Vue semaine
              </Link>
              <Link
                href={monthRangeHref}
                className={`rounded-full border px-3 py-1.5 font-semibold transition ${
                  agendaRange === "month"
                    ? "border-cyan-300/70 bg-cyan-500/20 text-white"
                    : "border-white/10 bg-white/5 text-slate-200 hover:border-cyan-300/60 hover:bg-white/10"
                }`}
              >
                Vue mois
              </Link>
            </div>
            {agendaRange === "month" ? (
              <span className="text-slate-200">
                {agendaMonthCourses.length} cours sur le mois affiché
              </span>
            ) : null}
          </div>
          {agendaRange === "week" ? (
            <>
              {isStudentRole && studentWeekDays ? (
                <StudentWeekView
                  initialWeek={weekValue}
                  initialPrev={prevWeekValue}
                  initialNext={nextWeekValue}
                  initialDays={studentWeekDays}
                  filters={agendaFilters}
                  baseFrom={agendaBaseFrom}
                  compact
                />
              ) : null}
              {!isStudentRole && staffWeekDays ? (
                <TeacherWeekView
                  initialWeek={weekValue}
                  initialPrev={prevWeekValue}
                  initialNext={nextWeekValue}
                  initialDays={staffWeekDays}
                  filters={agendaFilters}
                  baseFrom={agendaBaseFrom}
                  compact
                />
              ) : null}
            </>
          ) : (
            <StudioMonthView
              initialMonth={monthValue}
              initialPrev={prevMonthValue}
              initialNext={nextMonthValue}
              initialCells={monthCells}
              hasCourses={agendaMonthCourses.length > 0}
              baseFrom={agendaBaseFrom}
              courseBasePath={courseBasePath}
              role={agendaRole}
              filters={{
                teacher: teacherFilter || undefined,
                studio: studioId,
                discipline: disciplineFilter || undefined,
                q: q || undefined,
              }}
            />
          )}
        </section>
      ) : (
        <section className="panel p-4 md:p-6">
          <h2 className="text-lg font-semibold text-white">Cours à venir</h2>
          <div className="mt-3">
            <FilterPanel
              storageKey={`filters:studio:${studioId}:courses`}
              title="Filtres"
              className="group w-full"
              contentClassName="mt-3"
            >
              <form method="get" className="space-y-3">
                <label className="block text-sm text-slate-200">
                  Recherche (titre)
                  <input
                    type="text"
                    name="q"
                    defaultValue={q}
                    placeholder="Titre du cours"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
                  />
                </label>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-sm text-slate-200">
                    Professeur
                    <select
                      name="teacher"
                      defaultValue={teacherFilter}
                      className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
                    >
                      <option value="">Tous les professeurs</option>
                      {teacherOptions.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name ?? t.email}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm text-slate-200">
                    Discipline
                    <select
                      name="discipline"
                      defaultValue={disciplineFilter}
                      className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
                    >
                      <option value="">Toutes disciplines</option>
                      {disciplineOptions
                        .filter((d) => d.discipline && d.discipline.trim().length > 0)
                        .map((d) => (
                          <option key={d.discipline} value={d.discipline ?? ""}>
                            {d.discipline}
                          </option>
                        ))}
                    </select>
                  </label>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="submit"
                    className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-400"
                  >
                    Filtrer
                  </button>
                  <Link
                    href={`/app/school/${studioId}`}
                    className="rounded-full border border-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
                  >
                    Réinitialiser
                  </Link>
                </div>
              </form>
            </FilterPanel>
          </div>
          {studio.courses && studio.courses.length === 0 ? (
            <p className="mt-2 text-sm text-slate-300">Aucun cours associé pour le moment.</p>
          ) : (
            <ul className="mt-3 flex flex-col divide-y divide-white/5">
              {studio.courses?.map((course) => {
                const courseWithCount = course as Prisma.CourseGetPayload<{
                  include: { _count: { select: { attendances: true; positions: true; notes: true } }; teacher: true };
                }>;
                const courseDate = new Date(course.date);
                const seatsUsed = courseWithCount._count?.attendances ?? 0;
                const remainingSeats = (course.maxSeats ?? 30) - seatsUsed;
                const formattedDate = courseDate.toLocaleString("fr-FR", {
                  hour12: false,
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return (
                  <li key={course.id} className="block py-4 first:pt-0 last:pb-0">
                    <article className="flex flex-col gap-3 px-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/20 bg-white/10 text-[9px] font-semibold text-slate-300">
                          ●
                        </span>
                        <h3 className="text-xl font-semibold text-white md:text-2xl">
                          {course.title ?? "Cours"}
                        </h3>
                      </div>
                      <div className="flex flex-wrap items-start gap-3 md:flex-nowrap">
                        <SafeImage
                          src={course.photoUrl?.trim() || COURSE_PLACEHOLDER}
                          alt={course.title ?? "Cours"}
                          width={96}
                          height={64}
                          className="h-16 w-24 rounded-lg border border-white/10 object-cover shadow"
                          fallbackSrc={COURSE_PLACEHOLDER}
                        />
                        <div className="min-w-[220px] flex-1 space-y-1">
                          <p className="flex flex-wrap items-center gap-2 text-sm text-slate-200">
                            {courseWithCount.teacher?.name ?? courseWithCount.teacher?.email ?? "Professeur"}
                            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-cyan-100">
                              Studio · {studio.name}
                            </span>
                          </p>
                          <div className="space-y-1 text-sm text-slate-300">
                            <p>
                              {formattedDate} · Durée : {course.durationMinutes ?? 60} min
                            </p>
                            <p>
                              {remainingSeats} place(s) restante(s) / {course.maxSeats ?? 30}
                              {typeof course.costCredits === "number" ? ` · ${course.costCredits} crédits` : ""}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-sm font-semibold text-slate-200">
                        <div className="flex flex-wrap items-center gap-2">
                          <span>{seatsUsed} élèves</span>
                          <span>· {courseWithCount._count?.positions ?? 0} positions</span>
                          <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[11px] font-semibold text-white">
                            Notes : {courseWithCount._count?.notes ?? 0}
                          </span>
                        </div>
                        <Link
                          href={`${
                            userRole === "STUDENT"
                              ? "/app/student/courses"
                              : "/app/teacher/courses"
                          }/${course.id}?from=/app/school/${studio.id}`}
                          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
                        >
                          Voir le cours →
                        </Link>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
          {studio.courses && studio.courses.length > 0 && totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-slate-200">
              <Link
                href={`/app/school/${studioId}?page=${Math.max(1, currentPage - 1)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                className={`rounded-full px-3 py-2 font-semibold ${
                  currentPage === 1
                    ? "cursor-not-allowed border border-white/10 text-slate-500"
                    : "border border-white/10 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
                }`}
                aria-disabled={currentPage === 1}
              >
                Précédent
              </Link>
              <span>
                Page {currentPage} / {totalPages}
              </span>
              <Link
                href={`/app/school/${studioId}?page=${Math.min(totalPages, currentPage + 1)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                className={`rounded-full px-3 py-2 font-semibold ${
                  currentPage === totalPages
                    ? "cursor-not-allowed border border-white/10 text-slate-500"
                    : "border border-white/10 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
                }`}
                aria-disabled={currentPage === totalPages}
              >
                Suivant
              </Link>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
