import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";

import { FilterPanel } from "@/components/FilterPanel";
import { SafeImage } from "@/components/SafeImage";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { COURSE_PLACEHOLDER } from "@/lib/placeholders";
import { MonthView } from "../courses/agenda/MonthView";
import { WeekView as StudentWeekView } from "../courses/agenda/WeekView";

export const dynamic = "force-dynamic";
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? process.env.CLOUDINARY_CLOUD_NAME;
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
  discipline?: string | null;
  disciplineId?: string | null;
  date: Date;
  durationMinutes: number | null;
  maxSeats: number | null;
  photoPublicId: string | null;
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
    studio?: string | string[];
    teacher?: string;
    mine?: string | string[];
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
    photoPublicId: string | null;
    website: string | null;
    studios: { id: string; name: string; address: string | null; photoPublicId: string | null }[];
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
        photoPublicId: true,
        website: true,
        studios: { select: { id: true, name: true, address: true, photoPublicId: true } },
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
        photoPublicId: fetched.photoPublicId ?? null,
        website: fetched.website ?? null,
        studios: fetched.studios.map((s) => ({
          id: s.id,
          name: s.name,
          address: s.address,
          photoPublicId: s.photoPublicId ?? null,
        })),
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
        studios: { select: { id: true, name: true, address: true, photoPublicId: true } },
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
        photoPublicId: null,
        website: null,
        studios: fetched.studios.map((s) => ({
          id: s.id,
          name: s.name,
          address: s.address,
          photoPublicId: s.photoPublicId ?? null,
        })),
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
  const mineRaw = params.mine;
  const mineValues = Array.isArray(mineRaw) ? mineRaw : mineRaw ? [mineRaw] : [];
  const mineLast = mineValues.length > 0 ? mineValues[mineValues.length - 1] : undefined;
  const onlyMine =
    mineLast === undefined
      ? false
      : mineLast === "true" || mineLast === "1" || mineLast === "on" || mineLast === "";
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

  const [teachers, courses, disciplines] = await Promise.all([
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
              disciplineId: { in: disciplineFilters },
            }
          : {}),
        ...(q
          ? { title: { contains: q, mode: "insensitive" as Prisma.QueryMode } }
          : {}),
      },
      select: {
        id: true,
        title: true,
        discipline: true,
        disciplineId: true,
        date: true,
        durationMinutes: true,
        maxSeats: true,
        photoPublicId: true,
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
    prisma.discipline.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const disciplineNameById = new Map(disciplines.map((d) => [d.id, d.name]));

  const agendaItems: Array<{
    id: string;
    courseId: string;
    course: SchoolCourse;
    myAttendance: SchoolCourse["attendances"][number] | undefined;
  }> = courses.map((course) => {
    const myAttendance = course.attendances.find((a) => a.studentId === session.user.id);
    return {
      id: course.id,
      courseId: course.id,
      course: {
        ...course,
        discipline: disciplineNameById.get(course.disciplineId ?? "") ?? course.discipline ?? undefined,
        disciplineId: course.disciplineId ?? undefined,
      },
      myAttendance,
    };
  });

  const attendancesByDay = weekDays.map((d) => {
    const dayStr = d.toDateString();
    return agendaItems.filter((a) => new Date(a.course.date).toDateString() === dayStr);
  });
  const weekDaysData = weekDays.map((d, idx) => {
    const dayAttendances = attendancesByDay[idx];
    return {
      isoDate: d.toISOString(),
      label: d.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", ""),
      day: d.getDate(),
      isPast: d < new Date(new Date().setHours(0, 0, 0, 0)),
      courses: dayAttendances.map((a) => ({
        id: a.course.id,
        title: a.course.title,
        discipline: a.course.discipline ?? undefined,
        disciplineId: a.course.disciplineId ?? undefined,
        date: a.course.date instanceof Date ? a.course.date.toISOString() : (a.course.date as unknown as string),
        durationMinutes: a.course.durationMinutes,
        teacherName: a.course.teacher?.name ?? a.course.teacher?.email ?? "Professeur",
        studioName: a.course.studio?.name ?? "Studio non renseigné",
        past: isPastCourse(a.course.date, a.course.durationMinutes),
        myStatus: a.myAttendance?.status ?? null,
        waitlistRank: a.myAttendance?.waitlistRank ?? null,
      })),
    };
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
  const currentMonthValue = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
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
  const monthCells = cells.map((cell) => ({
    day: cell.day,
    isoDate:
      typeof cell.day === "number"
        ? new Date(monthStart.getFullYear(), monthStart.getMonth(), cell.day).toISOString()
        : undefined,
    courses: (cell.attendances ?? []).map((a) => ({
      id: a.course.id,
      courseId: a.courseId,
      title: a.course.title,
      discipline: a.course.discipline ?? undefined,
      disciplineId: a.course.disciplineId ?? undefined,
      date: a.course.date instanceof Date ? a.course.date.toISOString() : (a.course.date as unknown as string),
      durationMinutes: a.course.durationMinutes,
      teacherName: a.course.teacher?.name ?? a.course.teacher?.email ?? "Professeur",
      studioName: a.course.studio?.name ?? "Studio non renseigné",
      myStatus: a.myAttendance?.status ?? null,
      waitlistRank: a.myAttendance?.waitlistRank ?? null,
      past: isPastCourse(a.course.date, a.course.durationMinutes),
    })),
  }));
  const legendItems = [
    { label: "Passé (déjà suivi)", className: "border border-blue-400/70 bg-blue-600/30 text-blue-50" },
    { label: "Inscrit (à venir)", className: "border border-amber-300/70 bg-amber-500/25 text-amber-50" },
    { label: "Liste d’attente", className: "border border-purple-300/70 bg-purple-500/25 text-purple-50" },
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
    return `/student/school${nextParams.toString() ? `?${nextParams}` : ""}`;
  };
  const baseFromParams = new URLSearchParams(paramsForLinks);
  baseFromParams.set("view", view);
  if (view === "week" && weekValue) baseFromParams.set("week", weekValue);
  if (view === "month" && monthValue) baseFromParams.set("month", monthValue);
  const baseFrom = `/student/school${baseFromParams.toString() ? `?${baseFromParams.toString()}` : ""}`;
  const agendaHref = `/student/courses/agenda${paramsForLinks.toString() ? `?${paramsForLinks}` : ""}`;
  const listHref = `/student/courses${paramsForLinks.toString() ? `?${paramsForLinks}` : ""}`;

  const sortedUpcoming = agendaItems
    .filter((item) => !isPastCourse(item.course.date, item.course.durationMinutes))
    .sort((a, b) => new Date(a.course.date).getTime() - new Date(b.course.date).getTime())
    .slice(0, 8);
  const schoolPhoto =
    school.photoPublicId && CLOUD_NAME
      ? `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${school.photoPublicId}`
      : COURSE_PLACEHOLDER;
  const headerBgStyle = {
    backgroundImage: `linear-gradient(135deg, rgba(10,15,30,0.88), rgba(15,25,45,0.72)), url(${schoolPhoto})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };

  return (
    <main className="flex min-h-screen w-full flex-col gap-4">
      <header
        className="panel relative flex flex-col gap-3 border-indigo-400/25 p-4 md:p-6 shadow-indigo-900/30 overflow-hidden"
        style={headerBgStyle}
      >
        <div className="flex flex-wrap items-start gap-3">
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
        </div>
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
                style={{
                  backgroundImage: `linear-gradient(135deg, rgba(10,15,30,0.82), rgba(15,25,45,0.7)), url(${
                    studio.photoPublicId && CLOUD_NAME
                      ? `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${studio.photoPublicId}`
                      : COURSE_PLACEHOLDER
                  })`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-base font-semibold text-white">{studio.name}</p>
                  <Link
                    href={`/school/${studio.id}?view=agenda&range=month`}
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
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Planning</p>
            <h2 className="text-lg font-semibold text-white">Agenda de l’école</h2>
            <p className="text-sm text-slate-300">
              Vue semaine/mensuelle, filtrable par studio/professeur.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
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
        </div>

        <details className="group text-sm text-slate-200">
          <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-white">
            <span className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-cyan-100">
              Légende
              <span className="text-[10px] text-cyan-50 group-open:hidden">▼</span>
              <span className="hidden text-[10px] text-cyan-50 group-open:inline">▲</span>
            </span>
          </summary>
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
        </details>

        <FilterPanel
          storageKey="filters:student-school-agenda"
          title="Filtres"
          activeCount={activeFilters}
          userKey={session.user.id}
          className="mt-2"
          contentClassName=""
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
                {disciplines.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
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
            <label className="mt-1 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-200">
              <input type="hidden" name="mine" value="false" />
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
                href="/student/school"
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
            initialCells={monthCells}
            hasCourses={agendaItems.length > 0}
            filters={{
              teacher: teacherFilter,
              studio: studioFilters[0],
              discipline: disciplineFilters.length ? disciplineFilters.join(",") : undefined,
              mine: onlyMine,
              q: q || undefined,
            }}
            baseFrom={baseFrom}
            compact
          />
        )}

        {view === "week" && (
          <StudentWeekView
            initialWeek={weekValue}
            initialPrev={prevWeekValue}
            initialNext={nextWeekValue}
            initialDays={weekDaysData}
            filters={{
              teacher: teacherFilter,
              studio: studioFilters[0],
              discipline: disciplineFilters.length ? disciplineFilters.join(",") : undefined,
              mine: onlyMine,
              q: q || undefined,
            }}
            baseFrom={baseFrom}
            compact
          />
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
                  publicId={course.photoPublicId || undefined}
                  src={
                    course.photoPublicId && CLOUD_NAME
                      ? `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${course.photoPublicId}`
                      : COURSE_PLACEHOLDER
                  }
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
                  href={`/student/courses/${course.id}?from=/student/school`}
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
