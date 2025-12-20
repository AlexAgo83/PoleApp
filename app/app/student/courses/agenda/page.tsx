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
  searchParams?: Promise<{ month?: string; studio?: string; teacher?: string; mine?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "STUDENT") {
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
  const mineFilter =
    resolved.mine === "true" ||
    resolved.mine === "1" ||
    resolved.mine === "on" ||
    resolved.mine === "";
  const onlyMine = mineFilter;
  const baseDate = monthParam ? new Date(`${monthParam}-01T00:00:00`) : new Date();
  const start = startOfMonth(baseDate);
  const end = endOfMonth(baseDate);

  const attendances = onlyMine
    ? await prisma.courseAttendance.findMany({
        where: {
          studentId: session.user.id,
          course: {
            date: { gte: start, lte: end },
            ...(teacherFilter ? { teacherId: teacherFilter } : {}),
            ...(studioFilter ? { studioId: studioFilter } : {}),
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
            schoolId: session.user.schoolId,
            date: { gte: start, lte: end },
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
  const now = Date.now();
  const isPastCourse = (courseDate: Date, durationMinutes?: number | null) => {
    const end = new Date(courseDate).getTime() + (durationMinutes ?? 60) * 60_000;
    return end < now;
  };

  const monthParams = new URLSearchParams();
  if (studioFilter) monthParams.set("studio", studioFilter);
  if (teacherFilter) monthParams.set("teacher", teacherFilter);
  if (onlyMine) monthParams.set("mine", "true");
  const prevMonth = new Date(start);
  prevMonth.setMonth(prevMonth.getMonth() - 1);
  const nextMonth = new Date(start);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const prevMonthValue = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;
  const nextMonthValue = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;

  // Vue semaine (7 jours à partir du lundi de la semaine courante si dans le mois, sinon début de mois)
  const today = new Date();
  const inSelectedMonth = today >= start && today <= end;
  const baseWeekDate = inSelectedMonth ? today : start;
  const startWeek = new Date(baseWeekDate);
  const dayOffset = startWeek.getDay() === 0 ? 6 : startWeek.getDay() - 1; // Monday=0
  startWeek.setDate(startWeek.getDate() - dayOffset);
  const weekDays = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date(startWeek);
    d.setDate(startWeek.getDate() + idx);
    return d;
  });
  const attendancesByDay = weekDays.map((d) => {
    const dayStr = d.toDateString();
    return agendaItems.filter((a) => new Date(a.course.date).toDateString() === dayStr);
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="panel flex flex-wrap items-center justify-between gap-3 border-indigo-400/25 p-6 shadow-indigo-900/30">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-indigo-100">Élève</p>
          <h1 className="text-3xl font-semibold text-white">Agenda</h1>
          <p className="text-sm text-slate-200">
            Mois : {monthLabel}. Les jours avec cours suivis sont marqués.
          </p>
        </div>
        <Link
          href="/app/student/courses"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/list.svg" alt="" className="h-4 w-4" />
          Liste
        </Link>
      </header>

      <section className="panel p-6">
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
            <div className="flex flex-wrap items-center justify-end gap-2 md:col-span-3">
              <button
                type="submit"
                className="rounded-full bg-cyan-500 px-4 py-2 font-semibold text-slate-900 transition hover:bg-cyan-400"
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
        </details>

        <div className="mt-3 grid grid-cols-1 gap-1.5 text-sm text-slate-200 sm:grid-cols-2 sm:gap-2 md:grid-cols-3 lg:grid-cols-7">
          {cells.map((cell, idx) => {
            const weekDayIndex = (idx % 7) + 1; // 1-based
            const label = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"][(weekDayIndex - 1) % 7];
            return (
              <div
                key={idx}
                className="min-h-[80px] rounded-xl border border-white/10 bg-white/5 p-2 text-left"
              >
                <div className="mb-1 flex items-center justify-between text-xs font-semibold text-white">
                  <span className="flex items-center gap-1">
                    <span className="text-[10px] uppercase tracking-wide text-cyan-100 md:text-xs">
                      {label}
                    </span>
                    <span>{cell.day ?? "—"}</span>
                  </span>
                  {cell.attendances && cell.attendances.length > 0 && (
                    <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[11px] font-semibold text-cyan-100">
                      {cell.attendances.length}
                    </span>
                  )}
                </div>
                {cell.attendances &&
                  cell.attendances.slice(0, 3).map((a) => {
                    const past = isPastCourse(a.course.date, a.course.durationMinutes);
                    return (
                    <Link
                      key={a.id}
                      href={`/app/student/courses/${a.courseId}?from=/app/student/courses/agenda`}
                      className={`mt-1 block rounded-md px-2 py-1 text-[11px] transition hover:border hover:border-cyan-300/60 hover:bg-white/15 md:rounded-lg md:px-2.5 md:py-1.5 ${
                        past
                          ? "border border-white/10 bg-slate-800/60 text-slate-300 opacity-70 line-through"
                          : "bg-white/10 text-white"
                      }`}
                    >
                      <div className="text-[10px] leading-snug">
                        {new Date(a.course.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", hour12: false })} ·{" "}
                        {a.course.title ?? "Cours"}
                        <div className="text-[10px] text-slate-300 hidden md:block">
                          Durée : {formatDuration(a.course.durationMinutes ?? 60)}
                        </div>
                      </div>
                      {a.course.studio?.name ? (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-1.5 py-0.5 text-[10px] text-cyan-100">
                          Studio · {a.course.studio.name}
                        </span>
                      ) : null}
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

      <section className="panel p-6">
        <h3 className="text-lg font-semibold text-white">Vue semaine</h3>
        <div className="mt-3 grid gap-1.5 md:grid-cols-7 md:gap-3">
          {weekDays.map((day, idx) => {
            const dayAttendances = attendancesByDay[idx];
            return (
              <div key={day.toISOString()} className="rounded-xl border border-white/10 bg-white/5 p-2 text-sm text-slate-200">
                <div className="mb-2 flex items-center justify-between text-xs font-semibold text-white">
                  <span>{day.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })}</span>
                  <span className="text-[11px] text-cyan-100">{dayAttendances.length} cours</span>
                </div>
                <div className="flex flex-col gap-1 md:gap-2">
                  {dayAttendances.length === 0 && <span className="text-slate-400">—</span>}
                  {dayAttendances.map((a) => {
                    const past = isPastCourse(a.course.date, a.course.durationMinutes);
                    return (
                      <Link
                        key={a.id}
                        href={`/app/student/courses/${a.courseId}?from=/app/student/courses/agenda`}
                        className={`inline-flex w-full flex-col rounded-md border px-2 py-1 text-[11px] transition hover:border-cyan-300/70 hover:bg-white/15 md:rounded-lg md:px-2.5 md:py-1.5 ${
                          past
                            ? "border-white/15 bg-slate-800/60 text-slate-300 opacity-70 line-through"
                            : "border-white/10 bg-white/10 text-white"
                        }`}
                        title={`Durée : ${formatDuration(a.course.durationMinutes ?? 60)}`}
                      >
                        <span className="text-[10px] md:text-[11px]">
                          {new Date(a.course.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", hour12: false })}
                        </span>
                        <span className="truncate text-[11px] md:text-[12px]">
                          {a.course.title ?? "Cours"}
                        </span>
                        <span className="text-[10px] text-cyan-100 hidden md:inline">
                          {formatDuration(a.course.durationMinutes ?? 60)}
                        </span>
                        {a.course.studio?.name ? (
                          <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-1.5 py-0.5 text-[10px] text-cyan-100 md:mt-1.5">
                            Studio · {a.course.studio.name}
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
      </section>
    </main>
  );
}
