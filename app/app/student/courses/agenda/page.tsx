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
  searchParams?: Promise<{ month?: string; studio?: string; teacher?: string }>;
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
  const baseDate = monthParam ? new Date(`${monthParam}-01T00:00:00`) : new Date();
  const start = startOfMonth(baseDate);
  const end = endOfMonth(baseDate);

  const attendances = await prisma.courseAttendance.findMany({
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
  const cells: Array<{ day?: number; attendances?: typeof attendances }> = [];
  for (let i = 1; i < firstDay; i += 1) {
    cells.push({});
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateStr = new Date(start.getFullYear(), start.getMonth(), day).toDateString();
    const daily = attendances.filter(
      (a) => new Date(a.course.date).toDateString() === dateStr
    );
    cells.push({ day, attendances: daily });
  }

  const monthLabel = start.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const monthValue = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
  const hasMonthFilter = Boolean(monthParam);
  const activeFilters =
    (hasMonthFilter ? 1 : 0) + (studioFilter ? 1 : 0) + (teacherFilter ? 1 : 0);

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
          className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
        >
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

        <div className="mt-3 grid grid-cols-7 gap-2 text-center text-sm text-slate-200">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
            <div key={d} className="py-2 font-semibold text-white/80">
              {d}
            </div>
          ))}
          {cells.map((cell, idx) => (
            <div
              key={idx}
              className="min-h-[80px] rounded-xl border border-white/10 bg-white/5 p-2 text-left"
            >
              {cell.day && (
                <div className="mb-1 flex items-center justify-between text-xs font-semibold text-white">
                  <span>{cell.day}</span>
                  {cell.attendances && cell.attendances.length > 0 && (
                    <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[11px] font-semibold text-cyan-100">
                      {cell.attendances.length}
                    </span>
                  )}
                </div>
              )}
              {cell.attendances &&
                cell.attendances.slice(0, 3).map((a) => (
                  <Link
                    key={a.id}
                    href={`/app/student/courses/${a.courseId}?from=/app/student/courses/agenda`}
                    className="mt-1 block rounded-lg bg-white/10 px-2 py-1 text-[11px] text-white transition hover:border hover:border-cyan-300/60 hover:bg-white/15"
                  >
                    {a.course.studio?.name ? (
                      <span className="ml-1 rounded-full border border-white/10 bg-white/10 px-1.5 py-0.5 text-[10px] text-cyan-100">
                        {a.course.studio.name}
                      </span>
                    ) : null}
                    <div className="mt-1 text-[10px] text-slate-200 leading-snug">
                      {new Date(a.course.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ·{" "}
                      {a.course.title ?? "Cours"}
                      <div className="text-[10px] text-slate-300">
                        Durée : {formatDuration(a.course.durationMinutes ?? 60)}
                      </div>
                    </div>
                  </Link>
                ))}
              {cell.attendances && cell.attendances.length > 3 && (
                <div className="mt-1 text-[11px] text-slate-300">
                  +{cell.attendances.length - 3} autres
                </div>
              )}
            </div>
          ))}
        </div>
        {attendances.length === 0 && (
          <p className="mt-4 text-sm text-slate-200">
            Aucun cours prévu pour ce mois.
          </p>
        )}
      </section>
    </main>
  );
}
