import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";

import { FilterPanel } from "@/components/FilterPanel";
import { SafeImage } from "@/components/SafeImage";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { COURSE_PLACEHOLDER } from "@/lib/placeholders";

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

function isPastCourse(courseDate: Date, durationMinutes?: number | null) {
  const endMs = new Date(courseDate).getTime() + (durationMinutes ?? 60) * 60_000;
  return endMs < NOW_MS;
}

type SchoolCourse = {
  id: string;
  title: string | null;
  date: Date;
  durationMinutes: number | null;
  maxSeats: number | null;
  photoUrl: string | null;
  teacher: { id: string; name: string | null; email: string | null } | null;
  studio: { id: string; name: string } | null;
  waitlistQuota?: number | null;
  positions: { position: { id: string; name: string; type: string } | null }[];
  attendances: { id: string; status: "CONFIRMED" | "WAITLIST"; waitlistRank: number | null }[];
};

export default async function StudentSchoolPage({
  searchParams,
}: {
  searchParams?: Promise<{
    view?: string;
    month?: string;
    week?: string;
    studio?: string;
    teacher?: string;
    mine?: string;
    from?: string;
    to?: string;
    q?: string;
    discipline?: string | string[];
  }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    redirect("/access-denied");
  }
  if (!session.user.schoolId) {
    return (
      <main className="flex min-h-screen w-full flex-col gap-4">
        <section className="panel p-4 md:p-6">
          <h1 className="text-3xl font-semibold text-white">Mon école</h1>
          <p className="text-slate-300">Aucune école associée à ce compte.</p>
        </section>
      </main>
    );
  }

  type SchoolView = {
    id: string;
    name: string;
    photoUrl: string | null;
    website: string | null;
    studios: { id: string; name: string; address: string | null }[];
    partners: {
      id: string;
      name: string;
      kind: string | null;
      description: string | null;
      website: string | null;
      sponsoredLinks: { id: string; category: string | null; label: string | null; url: string }[];
    }[];
  };

  let school: SchoolView | null = null;
  try {
    const fetched = await prisma.school.findUnique({
      where: { id: session.user.schoolId },
      select: {
        id: true,
        name: true,
        photoUrl: true,
        website: true,
        studios: { select: { id: true, name: true, address: true } },
        partners: {
          select: {
            id: true,
            name: true,
            kind: true,
            description: true,
            website: true,
            sponsoredLinks: { select: { id: true, category: true, label: true, url: true } },
          },
        },
      },
    });
    if (fetched) {
      school = {
        id: fetched.id,
        name: fetched.name,
        photoUrl: fetched.photoUrl ?? null,
        website: fetched.website ?? null,
        studios: fetched.studios,
        partners: fetched.partners,
      };
    }
  } catch (err) {
    const message = (err as Error)?.message.toLowerCase() ?? "";
    const shouldFallback = message.includes("website") || message.includes("photourl");
    if (!shouldFallback) {
      throw err;
    }
    const fetched = await prisma.school.findUnique({
      where: { id: session.user.schoolId },
      select: {
        id: true,
        name: true,
        studios: { select: { id: true, name: true, address: true } },
        partners: {
          select: {
            id: true,
            name: true,
            kind: true,
            description: true,
            website: true,
            sponsoredLinks: { select: { id: true, category: true, label: true, url: true } },
          },
        },
      },
    });
    if (fetched) {
      school = {
        id: fetched.id,
        name: fetched.name,
        photoUrl: null,
        website: null,
        studios: fetched.studios,
        partners: fetched.partners,
      };
    }
  }

  if (!school) {
    redirect("/access-denied");
  }

  const params = (await Promise.resolve(searchParams)) ?? {};
  const view: "week" | "month" = params.view === "week" ? "week" : "month";
  const monthParam =
    typeof params.month === "string" && params.month.length > 0 ? params.month : undefined;
  const weekParam =
    typeof params.week === "string" && params.week.length > 0 ? params.week : undefined;
  const studioParam = params.studio;
  const studioFilters =
    typeof studioParam === "string"
      ? studioParam
          .split(",")
          .map((d) => d.trim())
          .filter(Boolean)
      : Array.isArray(studioParam)
      ? studioParam.flatMap((d) => d.split(",")).map((d) => d.trim()).filter(Boolean)
      : [];
  const teacherFilter =
    typeof params.teacher === "string" && params.teacher.length > 0 ? params.teacher : undefined;
  const disciplineFilters =
    typeof params.discipline === "string"
      ? params.discipline
          .split(",")
          .map((d) => d.trim())
          .filter(Boolean)
      : Array.isArray(params.discipline)
      ? params.discipline.flatMap((d) => d.split(",")).map((d) => d.trim()).filter(Boolean)
      : [];
  const fromParam = typeof params.from === "string" ? params.from : undefined;
  const toParam = typeof params.to === "string" ? params.to : undefined;
  const q = params.q?.toString().trim() ?? "";
  const onlyMine =
    params.mine === "true" ||
    params.mine === "1" ||
    params.mine === "on" ||
    params.mine === "";
  const activeFilters = [
    view,
    monthParam,
    weekParam,
    studioFilters.length ? "studio" : null,
    teacherFilter,
    disciplineFilters.length > 0 ? "discipline" : null,
    fromParam,
    toParam,
    q && q.length > 0 ? "q" : null,
    onlyMine ? "mine" : null,
  ].filter(Boolean).length;

  const baseDate = monthParam ? new Date(`${monthParam}-01T00:00:00`) : new Date();
  const monthStart = startOfMonth(baseDate);
  const monthEnd = endOfMonth(baseDate);

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

  const weekRangeStart = new Date(startWeek);
  weekRangeStart.setHours(0, 0, 0, 0);
  const weekRangeEnd = new Date(startWeek);
  weekRangeEnd.setDate(startWeek.getDate() + 6);
  weekRangeEnd.setHours(23, 59, 59, 999);
  const explicitRangeStart = fromParam ? new Date(`${fromParam}T00:00:00`) : monthStart;
  const explicitRangeEnd = toParam ? new Date(`${toParam}T23:59:59`) : monthEnd;
  const rangeStart = new Date(Math.min(explicitRangeStart.getTime(), weekRangeStart.getTime()));
  const rangeEnd = new Date(Math.max(explicitRangeEnd.getTime(), weekRangeEnd.getTime()));

  const [teachers, courses] = await Promise.all([
    prisma.user.findMany({
      where: { schoolId: session.user.schoolId, role: "TEACHER" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.course.findMany({
      where: {
        schoolId: session.user.schoolId,
        date: { gte: rangeStart, lte: rangeEnd },
        ...(studioFilters.length ? { studioId: { in: studioFilters } } : {}),
        ...(teacherFilter ? { teacherId: teacherFilter } : {}),
        ...(onlyMine ? { attendances: { some: { studentId: session.user.id } } } : {}),
        ...(disciplineFilters.length > 0
          ? {
              OR: disciplineFilters.map((d) => ({
                discipline: { contains: d, mode: "insensitive" as Prisma.QueryMode },
              })),
            }
          : {}),
        ...(q
          ? { title: { contains: q, mode: "insensitive" as Prisma.QueryMode } }
          : {}),
      },
      select: {
        id: true,
        title: true,
        date: true,
        durationMinutes: true,
        maxSeats: true,
        photoUrl: true,
        waitlistQuota: true,
        teacher: { select: { id: true, name: true, email: true } },
        studio: { select: { id: true, name: true } },
        positions: { include: { position: { select: { id: true, name: true, type: true } } } },
        attendances: {
          select: { id: true, status: true, waitlistRank: true, studentId: true },
        },
      },
      orderBy: { date: "asc" },
    }),
  ]);

  const agendaItems: Array<{
    id: string;
    courseId: string;
    course: SchoolCourse;
    myAttendance: SchoolCourse["attendances"][number] | undefined;
  }> = courses.map((course) => ({
    id: course.id,
    courseId: course.id,
    course,
    myAttendance: course.attendances?.[0],
  }));

  const attendancesByDay = weekDays.map((d) => {
    const dayStr = d.toDateString();
    return agendaItems.filter((a) => new Date(a.course.date).toDateString() === dayStr);
  });

  const daysInMonth = monthEnd.getDate();
  const firstDay = monthStart.getDay() === 0 ? 7 : monthStart.getDay(); // Monday=1 ... Sunday=7
  const cells: Array<{ day?: number; attendances?: typeof agendaItems }> = [];
  for (let i = 1; i < firstDay; i += 1) {
    cells.push({});
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const daily = agendaItems.filter((a) => {
      const d = new Date(a.course.date);
      return (
        d.getFullYear() === monthStart.getFullYear() &&
        d.getMonth() === monthStart.getMonth() &&
        d.getDate() === day
      );
    });
    cells.push({ day, attendances: daily });
  }

  const monthLabel = monthStart.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const monthValue = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`;
  const hasMonthFilter = Boolean(monthParam);

  const paramsForLinks = new URLSearchParams();
  if (studioFilters.length) paramsForLinks.set("studio", studioFilters.join(","));
  if (teacherFilter) paramsForLinks.set("teacher", teacherFilter);
  if (onlyMine) paramsForLinks.set("mine", "true");
  if (fromParam) paramsForLinks.set("from", fromParam);
  if (toParam) paramsForLinks.set("to", toParam);
  if (q) paramsForLinks.set("q", q);
  const prevMonth = new Date(monthStart);
  prevMonth.setMonth(prevMonth.getMonth() - 1);
  const nextMonth = new Date(monthStart);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const prevMonthValue = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;
  const nextMonthValue = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;
  const legendItems = [
    { label: "Passé (déjà suivi)", className: "border border-blue-400/70 bg-blue-600/30 text-blue-50" },
    { label: "Inscrit (à venir)", className: "border border-amber-300/70 bg-amber-500/25 text-amber-50" },
    { label: "Liste d’attente (rang, quota 14)", className: "border border-purple-300/70 bg-purple-500/25 text-purple-50" },
    { label: "Disponible (non inscrit)", className: "border border-white/20 bg-white/10 text-slate-300" },
  ];
  const buildViewHref = (mode: "week" | "month") => {
    const nextParams = new URLSearchParams(paramsForLinks);
    if (mode === "week") {
      nextParams.set("view", "week");
      if (weekValue) nextParams.set("week", weekValue);
      if (monthParam) nextParams.set("month", monthParam);
    } else {
      if (monthParam) nextParams.set("month", monthParam);
    }
    return `/app/student/school${nextParams.toString() ? `?${nextParams}` : ""}`;
  };
  const agendaHref = `/app/student/courses/agenda${paramsForLinks.toString() ? `?${paramsForLinks}` : ""}`;
  const listHref = `/app/student/courses${paramsForLinks.toString() ? `?${paramsForLinks}` : ""}`;

  const sortedUpcoming = agendaItems
    .filter((item) => !isPastCourse(item.course.date, item.course.durationMinutes))
    .sort((a, b) => new Date(a.course.date).getTime() - new Date(b.course.date).getTime())
    .slice(0, 8);

  return (
    <main className="flex min-h-screen w-full flex-col gap-4">
      <header className="panel flex flex-wrap items-start justify-between gap-3 border-indigo-400/25 p-4 md:p-6 shadow-indigo-900/30">
        <div className="flex-1">
          <p className="text-xs uppercase tracking-[0.14em] text-indigo-100">Réservation & studios</p>
          <h1 className="text-3xl font-semibold text-white">Agenda · {school.name}</h1>
          <p className="text-sm text-slate-200">
            Réserve tes cours par studio, filtre plusieurs studios et retrouve les infos partenaires de l’école.
          </p>
          {school.website ? (
            <a
              href={school.website}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-cyan-200 underline underline-offset-2"
            >
              Site web
            </a>
          ) : null}
        </div>
        <Link
          href="/app/student"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-normal text-white transition hover:border-cyan-400/70 hover:bg-white/10"
        >
          ← Retour accueil
        </Link>
        {school.photoUrl && (
          <div className="mt-3 w-full">
            <SafeImage
              src={school.photoUrl}
              alt={`Photo de l’école ${school.name}`}
              width={1200}
              height={360}
              className="h-56 w-full rounded-xl border border-white/10 object-cover shadow"
              fallbackSrc={COURSE_PLACEHOLDER}
            />
          </div>
        )}
      </header>

      <section className="panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Studios</p>
            <h2 className="text-lg font-semibold text-white">Studios associés</h2>
          </div>
          <Link
            href={agendaHref}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            Voir l’agenda
          </Link>
        </div>
        {school.studios.length === 0 ? (
          <p className="text-slate-300">Aucun studio renseigné.</p>
        ) : (
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {school.studios.map((studio) => (
              <li
                key={studio.id}
                className="rounded-xl border border-white/10 bg-white/5 p-3 text-slate-200"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-base font-semibold text-white">{studio.name}</p>
                  <Link
                    href={`/app/school/${studio.id}`}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
                  >
                    Voir le studio
                  </Link>
                </div>
                {studio.address && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(studio.address)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-cyan-300 transition hover:text-cyan-200"
                  >
                    {studio.address}
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Planning</p>
            <h2 className="text-lg font-semibold text-white">Agenda de l’école</h2>
            <p className="text-sm text-slate-300">
              Vue semaine/mensuelle, filtrable par studio/professeur. Les codes couleur suivent tes statuts.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={listHref}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
            >
              Liste des cours
            </Link>
            <Link
              href={agendaHref}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
            >
              Agenda complet
            </Link>
          </div>
        </div>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200 shadow-inner shadow-indigo-900/20">
          <p className="text-xs uppercase tracking-[0.14em] text-cyan-100">Légende</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {legendItems.map((item) => (
              <span
                key={item.label}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-semibold ${item.className}`}
              >
                ● {item.label}
              </span>
            ))}
          </div>
        </section>

        <FilterPanel
          storageKey="filters:student-school-agenda"
          title="Filtres"
          activeCount={activeFilters}
          userKey={session.user.id}
          className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-indigo-900/20"
          contentClassName="mt-3"
        >
          <form
            method="get"
            key={`school-agenda-${monthParam ?? "current"}`}
            className="grid w-full gap-3 md:grid-cols-3 md:items-end"
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
            <fieldset className="text-sm text-slate-200">
              <legend className="mb-1">Studios (multi-sélection)</legend>
              <div className="flex flex-wrap gap-2">
                {school.studios.map((s) => (
                  <label
                    key={s.id}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs text-slate-200"
                  >
                    <input
                      type="checkbox"
                      name="studio"
                      value={s.id}
                      defaultChecked={studioFilters.includes(s.id)}
                      className="h-4 w-4 rounded border-white/20 bg-white/5"
                    />
                    {s.name}
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
            <label className="text-sm text-slate-200">
              Discipline
              <select
                name="discipline"
                defaultValue={disciplineFilters[0] ?? ""}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              >
                <option value="">Toutes disciplines</option>
                <option value="Pole">Pole</option>
                <option value="Pole Exotic">Pole Exotic</option>
                <option value="Souplesse">Souplesse</option>
                <option value="Pilates">Pilates</option>
                <option value="Conditioning">Conditioning</option>
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
            <label className="mt-1 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-200">
              <input
                type="checkbox"
                name="mine"
                value="true"
                defaultChecked={onlyMine}
                className="h-4 w-4 rounded border-white/20 bg-white/5"
              />
              Mes cours uniquement
            </label>
            <div className="flex flex-wrap items-center justify-end gap-2 md:col-span-2">
              <button
                type="submit"
                className="rounded-full bg-cyan-500 px-4 py-2 font-semibold text-white transition hover:bg-cyan-400"
              >
                Filtrer
              </button>
              <Link
                href="/app/student/school"
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
              >
                Réinitialiser
              </Link>
            </div>
          </form>
        </FilterPanel>

        <div className="flex flex-wrap items-center gap-2 text-sm">
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

        {view === "month" && (
          <section className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Vue mensuelle · {monthLabel}</h3>
            </div>
            <div className="mt-3">
              <div className="grid grid-cols-2 gap-1.5 text-sm text-slate-200 sm:grid-cols-3 sm:gap-2 md:grid-cols-4 md:gap-3 lg:grid-cols-7">
                {cells.map((cell, idx) => {
                  const weekDayIndex = (idx % 7) + 1;
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
                        const waitlistCount = a.course.attendances.filter((att) => att.status === "WAITLIST").length;
                        const waitlistQuota = a.course.waitlistQuota ?? 0;
                        const waitlistFull = waitlistQuota > 0 && waitlistCount >= waitlistQuota;
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
                          : waitlistFull
                          ? "Attente complète"
                          : isMineConfirmed
                          ? "À venir"
                          : "Ouvert";
                        const quotaLabel =
                          waitlistQuota > 0 ? `Liste d’attente : ${waitlistCount}/${waitlistQuota}` : null;
                        const rankLabel =
                          isWaitlist && a.myAttendance?.waitlistRank
                            ? `#${a.myAttendance.waitlistRank}`
                            : null;
                          return (
                            <Link
                              key={a.id}
                              href={`/app/student/courses/${a.courseId}?from=/app/student/school`}
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
                                {quotaLabel ? (
                                  <p className="truncate text-[10px] text-purple-200">{quotaLabel}</p>
                                ) : null}
                                {a.course.positions?.length ? (
                                  <p className="truncate text-[10px] text-cyan-100">
                                    Tricks :{" "}
                                    {a.course.positions
                                      .map((p) => p.position?.name)
                                      .filter(Boolean)
                                      .slice(0, 3)
                                      .join(", ")}
                                    {a.course.positions.length > 3 ? ` +${a.course.positions.length - 3}` : ""}
                                  </p>
                                ) : null}
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
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm text-white">
              <form action="/app/student/school" method="get" className="inline-flex">
                <input type="hidden" name="month" value={prevMonthValue} />
                {fromParam ? <input type="hidden" name="from" value={fromParam} /> : null}
                {toParam ? <input type="hidden" name="to" value={toParam} /> : null}
                {studioFilters.map((id) => (
                  <input key={`prev-studio-${id}`} type="hidden" name="studio" value={id} />
                ))}
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
              <form action="/app/student/school" method="get" className="inline-flex">
                <input type="hidden" name="month" value={nextMonthValue} />
                {fromParam ? <input type="hidden" name="from" value={fromParam} /> : null}
                {toParam ? <input type="hidden" name="to" value={toParam} /> : null}
                {studioFilters.map((id) => (
                  <input key={`next-studio-${id}`} type="hidden" name="studio" value={id} />
                ))}
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
          <section className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-6">
            <div className="flex items-center justify-between text-lg font-semibold text-white">
              <span>Vue semaine</span>
            </div>
            <div className="mt-3">
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 md:grid-cols-4 md:gap-3 lg:grid-cols-7">
                {weekDays.map((day, idx) => {
                  const dayAttendances = attendancesByDay[idx];
                  const isPastDay = day < new Date(new Date().setHours(0, 0, 0, 0));
                  return (
                    <div
                      key={day.toISOString()}
                      className="rounded-xl border border-white/10 bg-white/5 p-2 text-sm text-slate-200"
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
                          const isMineConfirmed = Boolean(a.myAttendance?.status === "CONFIRMED");
                          const isWaitlist = Boolean(a.myAttendance?.status === "WAITLIST");
                          const waitlistRank = a.myAttendance?.waitlistRank;
                          const badgeClass = past
                            ? "border border-blue-400/70 bg-blue-600/30 text-blue-50"
                            : isWaitlist
                            ? "border border-purple-300/70 bg-purple-500/25 text-purple-50"
                            : isMineConfirmed
                            ? "border border-amber-300/70 bg-amber-500/25 text-amber-50"
                            : "border border-white/20 bg-white/10 text-slate-300";
                          const statusLabel = past
                            ? "Passé"
                            : isWaitlist
                            ? "Attente"
                            : isMineConfirmed
                            ? "À venir"
                            : "Ouvert";
                          return (
                            <Link
                              key={a.id}
                              href={`/app/student/courses/${a.courseId}?from=/app/student/school`}
                              className={`relative inline-flex w-full items-start gap-2 rounded-md border px-2 py-2 text-[11px] transition hover:border-cyan-300/70 hover:bg-white/15 md:rounded-lg md:px-2.5 md:py-2 ${
                                past
                                  ? "border-white/15 bg-slate-800/60 text-slate-300 opacity-70 line-through"
                                  : "border-white/10 bg-white/10 text-white"
                              }`}
                              title={`Durée : ${formatDuration(a.course.durationMinutes ?? 60)}`}
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
                                {a.course.positions?.length ? (
                                  <p className="truncate text-[10px] text-cyan-100">
                                    Tricks :{" "}
                                    {a.course.positions
                                      .map((p) => p.position?.name)
                                      .filter(Boolean)
                                      .slice(0, 3)
                                      .join(", ")}
                                    {a.course.positions.length > 3 ? ` +${a.course.positions.length - 3}` : ""}
                                  </p>
                                ) : null}
                              </div>
                              <span
                                className={`absolute bottom-1 right-1 inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  isWaitlist || isMineConfirmed
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
                                {isWaitlist && waitlistRank ? `#${waitlistRank}` : statusLabel}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm text-white">
              <form action="/app/student/school" method="get" className="inline-flex">
                <input type="hidden" name="view" value="week" />
                <input type="hidden" name="week" value={prevWeekValue} />
                {monthParam ? <input type="hidden" name="month" value={monthParam} /> : null}
                {fromParam ? <input type="hidden" name="from" value={fromParam} /> : null}
                {toParam ? <input type="hidden" name="to" value={toParam} /> : null}
                {studioFilters.map((id) => (
                  <input key={`prev-week-studio-${id}`} type="hidden" name="studio" value={id} />
                ))}
                {teacherFilter ? <input type="hidden" name="teacher" value={teacherFilter} /> : null}
                {onlyMine ? <input type="hidden" name="mine" value="true" /> : null}
                {q ? <input type="hidden" name="q" value={q} /> : null}
                <button
                  type="submit"
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-semibold transition hover:border-cyan-400/70 hover:bg-white/10"
                >
                  ← Semaine précédente
                </button>
              </form>
              <form action="/app/student/school" method="get" className="inline-flex">
                <input type="hidden" name="view" value="week" />
                <input type="hidden" name="week" value={nextWeekValue} />
                {monthParam ? <input type="hidden" name="month" value={monthParam} /> : null}
                {fromParam ? <input type="hidden" name="from" value={fromParam} /> : null}
                {toParam ? <input type="hidden" name="to" value={toParam} /> : null}
                {studioFilters.map((id) => (
                  <input key={`next-week-studio-${id}`} type="hidden" name="studio" value={id} />
                ))}
                {teacherFilter ? <input type="hidden" name="teacher" value={teacherFilter} /> : null}
                {onlyMine ? <input type="hidden" name="mine" value="true" /> : null}
                {q ? <input type="hidden" name="q" value={q} /> : null}
                <button
                  type="submit"
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-semibold transition hover:border-cyan-400/70 hover:bg-white/10"
                >
                  Semaine suivante →
                </button>
              </form>
            </div>
            {agendaItems.length === 0 && (
              <p className="mt-4 text-sm text-slate-200">
                Aucun cours prévu sur cette plage.
              </p>
            )}
          </section>
        )}
      </section>

      <section className="panel space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Liste</p>
            <h3 className="text-lg font-semibold text-white">Prochains cours de ton école</h3>
            <p className="text-sm text-slate-300">Trié par date sur la plage sélectionnée.</p>
          </div>
          <Link
            href={listHref}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            Voir la liste complète
          </Link>
        </div>
        <div className="flex flex-col divide-y divide-white/5">
          {sortedUpcoming.map(({ course, myAttendance }) => {
            const courseDate = new Date(course.date);
            const isPast = isPastCourse(course.date, course.durationMinutes);
            const isWaitlist = myAttendance?.status === "WAITLIST";
            const isAttending = myAttendance?.status === "CONFIRMED";
            const badgeClass = isWaitlist
              ? "border border-purple-300/70 bg-purple-500/25 text-purple-50"
              : isAttending
              ? isPast
                ? "border border-blue-400/70 bg-blue-600/30 text-blue-50"
                : "border border-amber-300/70 bg-amber-500/25 text-amber-50"
              : "border border-white/20 bg-white/10 text-slate-300";
            const badgeTitle = isWaitlist
              ? "Liste d'attente"
              : isAttending
              ? isPast
                ? "Cours déjà suivi"
                : "Inscrit"
              : "Non inscrit";
            const formattedDate = courseDate.toLocaleString("fr-FR", {
              hour12: false,
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            });
            return (
              <article key={course.id} className={`flex flex-wrap items-start gap-3 py-3 ${isPast ? "opacity-75" : ""}`}>
                <SafeImage
                  src={course.photoUrl?.trim() || COURSE_PLACEHOLDER}
                  alt={course.title ?? "Cours"}
                  width={96}
                  height={64}
                  className="h-16 w-24 rounded-lg border border-white/10 object-cover shadow"
                  fallbackSrc={COURSE_PLACEHOLDER}
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex min-h-[24px] min-w-[28px] items-center justify-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${badgeClass}`}
                      title={badgeTitle}
                    >
                      ●
                    </span>
                    <p className="text-base font-semibold text-white">{course.title ?? "Cours"}</p>
                  </div>
                  <p className="text-sm text-slate-200">
                    {formattedDate} · {formatDuration(course.durationMinutes ?? 60)}
                  </p>
                  <p className="text-xs text-cyan-100">
                    {course.teacher?.name ?? course.teacher?.email ?? "Professeur"} ·{" "}
                    {course.studio?.name ?? "Studio non renseigné"}
                  </p>
                  {isWaitlist && myAttendance?.waitlistRank ? (
                    <p className="text-xs text-purple-200">Rang liste d’attente : #{myAttendance.waitlistRank}</p>
                  ) : null}
                </div>
                <Link
                  href={`/app/student/courses/${course.id}?from=/app/student/school`}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
                >
                  Voir →
                </Link>
              </article>
            );
          })}
          {sortedUpcoming.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/15 bg-white/5 p-4 text-sm text-slate-200">
              Aucun cours trouvé sur la période. Ajuste les filtres ou la période (mois/semaines).
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
