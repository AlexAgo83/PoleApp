import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { FilterPanel } from "@/components/FilterPanel";
import { prisma } from "@/lib/prisma";
import { COURSE_PLACEHOLDER } from "@/lib/placeholders";
import { SafeImage } from "@/components/SafeImage";

const NOW_MS = Date.now();
const FALLBACK_DISCIPLINES = [
  { name: "Pole", color: "#0ea5e9" },
  { name: "Exotic", color: "#ec4899" },
  { name: "Souplesse", color: "#a855f7" },
  { name: "Pilates", color: "#10b981" },
  { name: "Danse", color: "#7c3aed" },
];

type CourseNote = {
  id: string;
  position: { name: string };
  learningStatus: string | null;
  comment: string | null;
};

type CourseRow = {
  id: string;
  title: string | null;
  date: Date;
  durationMinutes: number | null;
  maxSeats: number;
  costCredits: number;
  photoUrl?: string | null;
  discipline?: string | null;
  isVirtual?: boolean;
  teacher: { id: string; name: string | null; email: string | null } | null;
  studio: { name: string } | null;
  positions: { position: { id: string; name: string } }[];
  notes: CourseNote[];
  _count: { attendances: number };
  attendances: {
    id: string;
    studentId: string;
    status: "CONFIRMED" | "WAITLIST";
    waitlistRank: number | null;
  }[];
};

const COURSE_PHOTO_PLACEHOLDER = COURSE_PLACEHOLDER;

function paramValue(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[value.length - 1];
  }
  return value;
}

function formatDuration(minutes: number) {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0) {
    return `${hrs}h${mins.toString().padStart(2, "0")}`;
  }
  return `${mins} min`;
}

export default async function StudentCoursesPage({
  searchParams,
}: {
  searchParams?: Promise<{
    page?: string;
    from?: string;
    to?: string;
    teacher?: string;
    studio?: string;
    withNotes?: string;
    sort?: string;
    discipline?: string | string[];
    statuses?: string | string[];
  }>;
}) {
  const resolvedParams = (await searchParams) ?? {};
  const pageParam = paramValue(resolvedParams.page);
  const rawPage = Number(pageParam ?? "1");
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return null;
  }
  const userKey = session.user.id ?? "anon";

  const onlyMine = true;
  const teacherFilter =
    typeof paramValue(resolvedParams.teacher) === "string" &&
    paramValue(resolvedParams.teacher)?.length
      ? paramValue(resolvedParams.teacher)
      : undefined;
  const studioFilter =
    typeof paramValue(resolvedParams.studio) === "string" &&
    paramValue(resolvedParams.studio)?.length
      ? paramValue(resolvedParams.studio)
      : undefined;
  const statusParam = paramValue(resolvedParams.statuses);
  const selectedStatuses =
    typeof statusParam === "string" && statusParam.length > 0
      ? statusParam
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean)
      : ["past", "attending", "waitlist"];
  const fromStr = paramValue(resolvedParams.from);
  const toStr = paramValue(resolvedParams.to);
  const fromDate = fromStr ? new Date(fromStr) : undefined;
  const toDate = toStr ? new Date(toStr) : undefined;
  const validFrom = fromDate && !Number.isNaN(fromDate.getTime()) ? fromDate : undefined;
  const validTo = toDate && !Number.isNaN(toDate.getTime()) ? toDate : undefined;
  const withNotes = paramValue(resolvedParams.withNotes) === "true";
  const sort = paramValue(resolvedParams.sort) === "date_asc" ? "date_asc" : "date_desc";
  const disciplineParam = resolvedParams.discipline;
  const disciplineFilters =
    typeof disciplineParam === "string"
      ? disciplineParam.split(",").map((v) => v.trim()).filter(Boolean)
      : Array.isArray(disciplineParam)
      ? disciplineParam.flatMap((v) => v.split(",")).map((v) => v.trim()).filter(Boolean)
      : [];
  const activeFilters = [
    validFrom,
    validTo,
    teacherFilter,
    studioFilter,
    withNotes ? "notes" : null,
    sort === "date_asc" ? "sort" : null,
    disciplineFilters.length > 0 ? "discipline" : null,
    selectedStatuses.length !== 3 ? "statuses" : null,
  ].filter(Boolean).length;

  const courseFilters = {
    ...(validFrom ? { date: { gte: validFrom } } : {}),
    ...(validTo ? { date: { lte: validTo } } : {}),
    ...(teacherFilter ? { teacherId: teacherFilter } : {}),
    ...(studioFilter ? { studioId: studioFilter } : {}),
    ...(disciplineFilters.length > 0
      ? {
          OR: disciplineFilters.map((d) => ({
            discipline: { contains: d, mode: "insensitive" as const },
          })),
        }
      : {}),
    ...(withNotes ? { notes: { some: { studentId: session.user.id } } } : {}),
  };

  const courseWhere = {
    ...courseFilters,
    ...(session.user.schoolId ? { schoolId: session.user.schoolId } : {}),
  };

  const [countsAndData, teachers, studios, courseDisciplinesRaw, disciplinesRaw] = await Promise.all([
    (async () => {
      const mineWhere = {
        ...courseWhere,
        attendances: { some: { studentId: session.user.id } },
      };
      const totalCount = await prisma.course.count({ where: mineWhere });
      const totalPages = Math.max(1, Math.ceil(totalCount / 10));
      const currentPage = Math.min(Math.max(1, rawPage || 1), totalPages);
      const skip = (currentPage - 1) * 10;

      const courses = await prisma.course
        .findMany({
          where: mineWhere,
          orderBy: { date: sort === "date_desc" ? "desc" : "asc" },
          skip,
          take: 10,
          include: {
            teacher: { select: { id: true, name: true, email: true } },
            positions: { include: { position: true } },
            studio: { select: { name: true } },
            notes: {
              where: { studentId: session.user.id },
              include: { position: true },
            },
            attendances: {
              select: { id: true, studentId: true, status: true, waitlistRank: true },
            },
            _count: { select: { attendances: true } },
          },
        })
        .catch((error) => {
          const message = (error as Error)?.message ?? "";
          const missingColumns =
            message.includes("maxSeats") || message.includes("costCredits");
          if (missingColumns) {
            return prisma.course.findMany({
              where: mineWhere,
              orderBy: { date: sort === "date_desc" ? "desc" : "asc" },
              skip,
              take: 10,
              include: {
                teacher: { select: { id: true, name: true, email: true } },
                positions: { include: { position: true } },
                studio: { select: { name: true } },
                notes: {
                  where: { studentId: session.user.id },
                  include: { position: true },
                },
                attendances: {
                  select: { id: true, studentId: true, status: true, waitlistRank: true },
                },
                _count: { select: { attendances: true } },
              },
            });
          }
          throw error;
        });
      return { totalCount, totalPages, currentPage, items: courses };
    })(),
    session.user.schoolId
      ? prisma.user.findMany({
          where: { schoolId: session.user.schoolId, role: "TEACHER" },
          select: { id: true, name: true, email: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    session.user.schoolId
      ? prisma.studio.findMany({
          where: { schoolId: session.user.schoolId },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    session.user.schoolId
      ? prisma.course.findMany({
          where: { schoolId: session.user.schoolId },
          select: { discipline: true },
          distinct: ["discipline"],
        })
      : Promise.resolve([]),
    session.user.schoolId
      ? prisma.discipline
          .findMany({
            where: { schoolId: session.user.schoolId },
            select: { id: true, name: true, color: true },
            orderBy: { name: "asc" },
          })
          .catch(() => [])
      : Promise.resolve([]),
  ]);
  const disciplines = (() => {
    const legacy = (courseDisciplinesRaw as { discipline: string | null }[])
      .map((c) => c.discipline)
      .filter((d): d is string => Boolean(d && d.trim().length > 0))
      .map((d) => ({ name: d.trim(), color: undefined as string | undefined }));
    const merged: { name: string; color?: string | null }[] = [...disciplinesRaw];
    legacy.forEach((d) => {
      if (!merged.some((m) => m.name.toLowerCase() === d.name.toLowerCase())) {
        merged.push(d);
      }
    });
    return merged.length > 0 ? merged : FALLBACK_DISCIPLINES;
  })();

  const { totalCount, totalPages, currentPage, items } = countsAndData;
  const coursesList: { key: string; course: CourseRow; myAttendance: CourseRow["attendances"][number] | undefined }[] =
    (items as CourseRow[])
      .map((course) => {
        const myAttendance = course.attendances.find((a) => a.studentId === session.user.id);
        return {
          key: course.id,
          course,
          myAttendance,
        };
      })
      .filter(({ course, myAttendance }) => {
        const nowStatus = (() => {
          const isPast = new Date(course.date).getTime() < NOW_MS;
          if (isPast) return "past";
          if (myAttendance?.status === "WAITLIST") return "waitlist";
          if (myAttendance?.status === "CONFIRMED") return "attending";
          return "open";
        })();
        return selectedStatuses.includes(nowStatus);
      });

  const queryParams = new URLSearchParams();
  if (resolvedParams.from) queryParams.set("from", resolvedParams.from);
  if (resolvedParams.to) queryParams.set("to", resolvedParams.to);
  if (teacherFilter) queryParams.set("teacher", teacherFilter);
  if (studioFilter) queryParams.set("studio", studioFilter);
  if (withNotes) queryParams.set("withNotes", "true");
  if (sort === "date_asc") queryParams.set("sort", "date_asc");
  if (disciplineFilters.length > 0) queryParams.set("discipline", disciplineFilters.join(","));
  const qs = queryParams.toString();
  const legendItems = [
    {
      label: "Passé (déjà suivi)",
      className: "border border-blue-400/70 bg-blue-600/30 text-blue-50",
    },
    {
      label: "Inscrit (à venir)",
      className: "border border-amber-300/70 bg-amber-500/25 text-amber-50",
    },
    {
      label: "Liste d’attente",
      className: "border border-purple-300/70 bg-purple-500/25 text-purple-50",
    },
  ];

  return (
    <main className="flex min-h-screen w-full flex-col gap-4">
      <section className="panel space-y-4 border-indigo-400/15 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-white">Historique des cours</h1>
            <p className="text-sm text-slate-200">
              Liste des cours à venir et passés.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link
              href="/app/student/courses/agenda"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/agenda.svg" alt="" className="h-4 w-4" />
              Agenda
            </Link>
          </div>
        </div>

        <div className="text-sm text-slate-200">
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
        </div>

        <FilterPanel
          storageKey="filters:student-courses"
          title="Filtres"
          activeCount={activeFilters}
          userKey={userKey}
        >
          <form
          key={`filters-${resolvedParams.from ?? ""}-${resolvedParams.to ?? ""}-${teacherFilter ?? "all"}-${withNotes ? "notes" : "all"}-${disciplineFilters.join("|") || "all"}`}
          method="get"
          className="mt-4 grid w-full gap-3 md:grid-cols-6 md:items-end"
        >
            <label className="text-sm text-slate-200">
              Date min
              <input
                type="date"
                name="from"
                defaultValue={resolvedParams.from}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              />
            </label>
            <label className="text-sm text-slate-200">
              Date max
              <input
                type="date"
                name="to"
                defaultValue={resolvedParams.to}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              />
            </label>
            <label className="text-sm text-slate-200">
              Professeur
              <select
                key={teacherFilter ?? "all-teachers"}
                name="teacher"
                defaultValue={teacherFilter ?? ""}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              >
                <option value="">Tous les professeurs</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name ?? t.email}
                  </option>
                ))}
              </select>
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
            <fieldset className="text-sm text-slate-200">
              <legend className="mb-1 text-xs uppercase tracking-[0.12em] text-cyan-100">Discipline</legend>
              <div className="flex flex-wrap gap-2">
                {disciplines.slice(0, 6).map((d, idx) => (
                  <label
                    key={`${d.name}-${idx}`}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs text-slate-200"
                  >
                    <input
                      type="checkbox"
                      name="discipline"
                      value={d.name}
                      defaultChecked={disciplineFilters.includes(d.name)}
                      className="h-4 w-4 rounded border-white/20 bg-white/5"
                    />
                    <span className="inline-flex h-3 w-3 rounded-full border border-white/20" style={{ backgroundColor: d.color ?? undefined }} />
                    {d.name}
                  </label>
                ))}
              </div>
              {disciplines.length > 6 && (
                <details className="mt-2 space-y-2">
                  <summary className="cursor-pointer text-xs text-slate-300 hover:text-white">
                    Voir plus ({disciplines.length - 6})
                  </summary>
                  <div className="grid max-h-40 grid-cols-2 gap-2 overflow-auto pr-1 md:grid-cols-3">
                    {disciplines.slice(6).map((d, idx) => (
                      <label
                        key={`${d.name}-extra-${idx}`}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs text-slate-200"
                      >
                        <input
                          type="checkbox"
                          name="discipline"
                          value={d.name}
                          defaultChecked={disciplineFilters.includes(d.name)}
                          className="h-4 w-4 rounded border-white/20 bg-white/5"
                        />
                        <span className="inline-flex h-3 w-3 rounded-full border border-white/20" style={{ backgroundColor: d.color ?? undefined }} />
                        {d.name}
                      </label>
                    ))}
                  </div>
                </details>
              )}
            </fieldset>
            <label className="text-sm text-slate-200">
              Tri
              <select
                name="sort"
                defaultValue={sort}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              >
                <option value="date_desc">Date descendante</option>
                <option value="date_asc">Date ascendante</option>
              </select>
            </label>
            <label className="mt-1 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-200">
              <input
                type="checkbox"
                name="withNotes"
                value="true"
                defaultChecked={withNotes}
                key={withNotes ? "with-notes" : "all-courses"}
                className="h-4 w-4 rounded border-white/20 bg-white/5"
              />
              Avec notes
            </label>
            <fieldset className="md:col-span-2 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
              <legend className="px-1 text-xs uppercase tracking-[0.12em] text-cyan-100">Statuts affichés</legend>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-200">
                {[
                  { key: "past", label: "Passé" },
                  { key: "attending", label: "Inscrit (à venir)" },
                  { key: "waitlist", label: "Attente" },
                ].map((s) => (
                  <label key={s.key} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1">
                    <input
                      type="checkbox"
                      name="statuses"
                      value={s.key}
                      defaultChecked={selectedStatuses.includes(s.key)}
                      className="h-4 w-4 rounded border-white/20 bg-white/5"
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="md:col-span-4 flex flex-wrap items-center justify-end gap-2">
              <button
                type="submit"
                className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-400"
              >
                Filtrer
              </button>
              <Link
                href="/app/student/courses"
                className="rounded-full border border-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
              >
                Réinitialiser
              </Link>
            </div>
          </form>
        </FilterPanel>
        <div className="flex flex-col divide-y divide-white/5">
          {coursesList.map(({ key, course, myAttendance }) => {
            const courseDate = new Date(course.date);
            const confirmedSeats = course.attendances.filter((a) => a.status === "CONFIRMED").length;
            const remainingSeats = (course.maxSeats ?? 30) - confirmedSeats;
            const formattedDate = courseDate.toLocaleString("fr-FR", {
              hour12: false,
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            });
            const isPast = courseDate.getTime() < NOW_MS;
            const faded = isPast ? "opacity-60" : "";
            const detailHref = `/app/student/courses/${course.id}?from=${encodeURIComponent(
              `/app/student/courses?page=${currentPage}`
            )}`;
            const isWaitlist = myAttendance?.status === "WAITLIST";
            const isAttending = Boolean(myAttendance && myAttendance.status === "CONFIRMED");
            const isVirtual = Boolean(course.isVirtual);
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
            const cardClass = isVirtual
              ? "border border-amber-300/60 bg-amber-500/15"
              : "border border-white/10 bg-gradient-to-br from-indigo-900/40 via-slate-900/40 to-cyan-900/30";
            return (
              <div key={key} className={`${faded}`}>
                <article className={`flex flex-col gap-3 rounded-2xl p-4 shadow-inner shadow-black/30 ${cardClass}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-semibold ${badgeClass}`}
                      title={badgeTitle}
                    >
                      ●
                    </span>
                    <p className="text-lg font-semibold text-white">
                      {course.title ?? "Cours"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-start gap-3 md:flex-nowrap">
                    <SafeImage
                      src={course.photoUrl?.trim() || COURSE_PHOTO_PLACEHOLDER}
                      alt={course.title ?? "Cours"}
                      width={96}
                      height={64}
                      className="h-16 w-24 rounded-lg border border-white/10 object-cover shadow"
                      fallbackSrc={COURSE_PHOTO_PLACEHOLDER}
                    />
                    <div className="min-w-[220px] flex-1 space-y-1">
                      <p className="text-sm text-slate-200 flex flex-wrap items-center gap-2">
                        {course.teacher?.id ? (
                          <Link
                            href={`/app/teachers/${course.teacher.id}?from=/app/student/courses`}
                            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[12px] font-semibold text-cyan-100 transition hover:border-cyan-300 hover:bg-white/10"
                          >
                            {course.teacher?.name ?? course.teacher?.email ?? "Professeur"}
                          </Link>
                        ) : (
                          <span>{course.teacher?.name ?? course.teacher?.email ?? "Professeur"}</span>
                        )}
                        {course.studio?.name && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-cyan-100">
                            Studio · {course.studio.name}
                          </span>
                        )}
                        {course.discipline && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-cyan-100">
                            Discipline · {course.discipline}
                          </span>
                        )}
                        {course.positions.length > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-cyan-100">
                            Tricks :{" "}
                            {course.positions
                              .map((p) => p.position?.name)
                              .filter(Boolean)
                              .slice(0, 3)
                              .join(", ")}
                            {course.positions.length > 3 ? ` +${course.positions.length - 3}` : ""}
                          </span>
                        )}
                      </p>
                      <div className="text-sm text-slate-300 space-y-1">
                        <p>
                          {formattedDate} · Durée : {formatDuration(course.durationMinutes ?? 60)}
                        </p>
                        <p>
                          {remainingSeats} place(s) restante(s) / {course.maxSeats ?? 30}
                          {isWaitlist && (
                            <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-purple-300/70 bg-purple-500/20 px-2 py-0.5 text-[11px] font-semibold text-purple-50">
                              Attente{myAttendance?.waitlistRank ? ` · rang #${myAttendance.waitlistRank}` : ""}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                  {Array.isArray(course.notes) && course.notes.length > 0 && (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
                      <p className="text-xs uppercase tracking-[0.08em] text-cyan-200">
                        Notes
                      </p>
                      <ul className="mt-1 space-y-1">
                        {course.notes.map((note: CourseNote) => (
                          <li key={note.id}>
                            {note.position.name}: {note.learningStatus ?? "(non renseigné)"}
                            {note.comment ? ` — ${note.comment}` : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-200">
                      <span>
                        {confirmedSeats} élèves · {course.positions.length} positions
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[11px] font-semibold text-white">
                        Notes : {course.notes.length}
                      </span>
                    </div>
                    <Link
                      href={detailHref}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
                    >
                      Voir le cours →
                    </Link>
                  </div>
                </article>
              </div>
            );
          })}
          {coursesList.length === 0 && (
            <div className="mt-2 rounded-2xl border border-dashed border-white/15 bg-white/5 p-4 text-sm text-slate-200">
              Aucun cours trouvé. Tes prochains cours apparaîtront ici.
            </div>
          )}
        </div>
        {totalCount > 0 && (
          <div className="mt-6 flex items-center justify-between">
            <Link
              href={`/app/student/courses?page=${Math.max(1, currentPage - 1)}${
                qs ? `&${qs}` : ""
              }`}
              className={`rounded-full px-3 py-2 text-sm font-semibold ${
                currentPage === 1
                  ? "cursor-not-allowed border border-white/10 text-slate-500"
                  : "border border-white/10 text-white hover:border-cyan-400/70 hover:bg-white/5"
              }`}
              aria-disabled={currentPage === 1}
            >
              Précédent
            </Link>
            <span className="text-sm text-slate-300">
              Page {currentPage} / {totalPages}
            </span>
            <Link
              href={`/app/student/courses?page=${Math.min(totalPages, currentPage + 1)}${
                qs ? `&${qs}` : ""
              }`}
              className={`rounded-full px-3 py-2 text-sm font-semibold ${
                currentPage === totalPages
                  ? "cursor-not-allowed border border-white/10 text-slate-500"
                  : "border border-white/10 text-white hover:border-cyan-400/70 hover:bg-white/5"
              }`}
              aria-disabled={currentPage === totalPages}
            >
              Suivant
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
