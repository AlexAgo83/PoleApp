import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { FilterPanel } from "@/components/FilterPanel";
import { prisma } from "@/lib/prisma";
import { COURSE_PLACEHOLDER } from "@/lib/placeholders";
import { purchaseCourseAction } from "./actions";
import { SafeImage } from "@/components/SafeImage";

type CourseNote = {
  id: string;
  position: { name: string };
  masteryLevel: string;
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
  teacher: { id: string; name: string | null; email: string | null } | null;
  studio: { name: string } | null;
  positions: { position: { id: string; name: string } }[];
  notes: CourseNote[];
  _count: { attendances: number };
  attendances?: { id: string }[];
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
    mine?: string | string[];
    from?: string;
    to?: string;
    teacher?: string;
    studio?: string;
    withNotes?: string;
    sort?: string;
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
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { credits: true },
  });

  const mineParam = paramValue(resolvedParams.mine);
  const onlyMine = Boolean(
    mineParam && (mineParam === "true" || mineParam === "1" || mineParam === "on" || mineParam === "")
  );
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
  const fromStr = paramValue(resolvedParams.from);
  const toStr = paramValue(resolvedParams.to);
  const fromDate = fromStr ? new Date(fromStr) : undefined;
  const toDate = toStr ? new Date(toStr) : undefined;
  const validFrom = fromDate && !Number.isNaN(fromDate.getTime()) ? fromDate : undefined;
  const validTo = toDate && !Number.isNaN(toDate.getTime()) ? toDate : undefined;
  const withNotes = paramValue(resolvedParams.withNotes) === "true";
  const sort = paramValue(resolvedParams.sort) === "date_asc" ? "date_asc" : "date_desc";
  const userCredits = user?.credits ?? session.user.credits ?? 0;
  const activeFilters = [
    validFrom,
    validTo,
    teacherFilter,
    studioFilter,
    withNotes ? "notes" : null,
    sort === "date_asc" ? "sort" : null,
    onlyMine ? "mine" : null,
  ].filter(Boolean).length;

  const courseFilters = {
    ...(validFrom ? { date: { gte: validFrom } } : {}),
    ...(validTo ? { date: { lte: validTo } } : {}),
    ...(teacherFilter ? { teacherId: teacherFilter } : {}),
    ...(studioFilter ? { studioId: studioFilter } : {}),
    ...(withNotes ? { notes: { some: { studentId: session.user.id } } } : {}),
  };

  const courseWhere = {
    ...courseFilters,
    ...(session.user.schoolId ? { schoolId: session.user.schoolId } : {}),
  };

  const [countsAndData, teachers, studios] = await Promise.all([
    (async () => {
      if (onlyMine) {
        const mineWhere = {
          ...courseWhere,
          attendances: { some: { studentId: session.user.id } },
        };
        const totalCount = await prisma.course.count({ where: mineWhere });
        const totalPages = Math.max(1, Math.ceil(totalCount / 10));
        const currentPage = Math.min(Math.max(1, rawPage || 1), totalPages);
        const skip = (currentPage - 1) * 10;

        const courses = await prisma.course.findMany({
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
              where: { studentId: session.user.id },
              select: { id: true },
            },
            _count: { select: { attendances: true } },
          },
        });
        return { totalCount, totalPages, currentPage, items: courses };
      }

      if (!session.user.schoolId) {
        return { totalCount: 0, totalPages: 1, currentPage: 1, items: [] };
      }

      const totalCount = await prisma.course.count({
        where: courseWhere,
      });
      const totalPages = Math.max(1, Math.ceil(totalCount / 10));
      const currentPage = Math.min(Math.max(1, rawPage || 1), totalPages);
      const skip = (currentPage - 1) * 10;

      const courses = await prisma.course
        .findMany({
          where: courseWhere,
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
              where: { studentId: session.user.id },
              select: { id: true },
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
              where: courseWhere,
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
                  where: { studentId: session.user.id },
                  select: { id: true },
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
  ]);

  const { totalCount, totalPages, currentPage, items } = countsAndData;
  const coursesList: { key: string; course: CourseRow; isAttending: boolean }[] = (
    items as CourseRow[]
  ).map((course) => ({
    key: course.id,
    course,
    isAttending: onlyMine ? true : Boolean(course.attendances?.length),
  }));

  const queryParams = new URLSearchParams();
  if (resolvedParams.from) queryParams.set("from", resolvedParams.from);
  if (resolvedParams.to) queryParams.set("to", resolvedParams.to);
  if (teacherFilter) queryParams.set("teacher", teacherFilter);
  if (studioFilter) queryParams.set("studio", studioFilter);
  if (withNotes) queryParams.set("withNotes", "true");
  if (sort === "date_asc") queryParams.set("sort", "date_asc");
  if (onlyMine) queryParams.set("mine", "true");
  const qs = queryParams.toString();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-3 px-0 py-6 md:gap-6 md:px-8 md:py-10">
      <header className="panel flex flex-wrap items-center justify-between gap-3 border-indigo-400/25 p-6 shadow-indigo-900/30">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-indigo-100">Élève</p>
          <h1 className="text-3xl font-semibold text-white">Mes cours</h1>
          <p className="text-sm text-slate-200">
            Historique des cours suivis.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-center">
          <Link
            href="/app/student/courses/agenda"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/agenda.svg" alt="" className="h-4 w-4" />
            Agenda
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

      <section className="panel space-y-4 border-indigo-400/15 p-6">
        <FilterPanel
          storageKey="filters:student-courses"
          title="Filtres"
          activeCount={activeFilters}
          userKey={userKey}
        >
          <form
            key={`filters-${resolvedParams.from ?? ""}-${resolvedParams.to ?? ""}-${teacherFilter ?? "all"}-${withNotes ? "notes" : "all"}-${onlyMine ? "mine" : "all"}`}
            method="get"
            className="mt-4 grid w-full gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-indigo-900/20 md:grid-cols-5 md:items-end"
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
            <div className="mt-1 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-200">
              <input
                type="checkbox"
                name="mine"
                value="true"
                defaultChecked={onlyMine}
                key={onlyMine ? "mine-true" : "mine-false"}
                className="h-4 w-4 rounded border-white/20 bg-white/5"
              />
              Mes cours
            </div>
            <div className="md:col-span-5 flex flex-wrap items-center justify-end gap-2">
              <button
                type="submit"
                className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-400"
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
          {coursesList.map(({ key, course, isAttending }) => {
            const courseDate = new Date(course.date);
            const seatsUsed = course._count?.attendances ?? 0;
            const remainingSeats = (course.maxSeats ?? 30) - seatsUsed;
            const formattedDate = courseDate.toLocaleString("fr-FR", {
              hour12: false,
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            });
            const isPast = courseDate.getTime() < Date.now();
            const faded = isPast ? "opacity-60" : "";
            const detailHref = `/app/student/courses/${course.id}?from=${encodeURIComponent(
              `/app/student/courses?page=${currentPage}`
            )}`;
            return (
              <div key={key} className={`block rounded-xl ${faded}`}>
                <article className="flex flex-col gap-2 py-3 px-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
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
                      </p>
                      <div className="text-sm text-slate-300 space-y-1">
                        <p>
                          {formattedDate} · Durée : {formatDuration(course.durationMinutes ?? 60)}
                        </p>
                        <p>
                          {remainingSeats} place(s) restante(s) / {course.maxSeats ?? 30}
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
                            {note.position.name}: {note.masteryLevel}
                            {note.comment ? ` — ${note.comment}` : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-200">
                      <span>
                        {seatsUsed} élèves · {course.positions.length} positions
                        {isAttending ? " · inscrit" : ""}
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
