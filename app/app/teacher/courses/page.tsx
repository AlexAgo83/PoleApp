import Link from "next/link";
import { SafeImage } from "@/components/SafeImage";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { FilterPanel } from "@/components/FilterPanel";
import { COURSE_PLACEHOLDER } from "@/lib/placeholders";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 10;
const COURSE_PHOTO_PLACEHOLDER = COURSE_PLACEHOLDER;
const NOW_MS = Date.now();
const FALLBACK_DISCIPLINES = [
  { name: "Pole", color: "#0ea5e9" },
  { name: "Exotic", color: "#ec4899" },
  { name: "Souplesse", color: "#a855f7" },
  { name: "Pilates", color: "#10b981" },
  { name: "Danse", color: "#7c3aed" },
];

export const dynamic = "force-dynamic";

function formatDuration(minutes: number) {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0) {
    return `${hrs}h${mins.toString().padStart(2, "0")}`;
  }
  return `${mins} min`;
}

export default async function TeacherCoursesPage({
  searchParams,
}: {
  searchParams?: Promise<{
    page?: string;
    from?: string;
    to?: string;
    teacher?: string;
    withNotes?: string;
    studio?: string;
    discipline?: string | string[];
    q?: string;
  }>;
}) {
  const resolvedParams = (await searchParams) ?? {};
  const rawPage = Number(resolvedParams.page ?? "1");
  const teacherFilter = typeof resolvedParams.teacher === "string" ? resolvedParams.teacher : undefined;
  const q = resolvedParams.q?.toString().trim() ?? "";
  const disciplineFilters =
    typeof resolvedParams.discipline === "string"
      ? resolvedParams.discipline
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean)
      : Array.isArray(resolvedParams.discipline)
      ? resolvedParams.discipline.flatMap((v) => v.split(",")).map((v) => v.trim()).filter(Boolean)
      : [];
  const studioFilter =
    typeof resolvedParams.studio === "string" && resolvedParams.studio.length > 0
      ? resolvedParams.studio
      : undefined;
  const fromDate = resolvedParams.from ? new Date(resolvedParams.from) : undefined;
  const toDate = resolvedParams.to ? new Date(resolvedParams.to) : undefined;
  const validFrom = fromDate && !Number.isNaN(fromDate.getTime()) ? fromDate : undefined;
  const validTo = toDate && !Number.isNaN(toDate.getTime()) ? toDate : undefined;
  const withNotes = resolvedParams.withNotes === "true";
  const activeFilters = [
    validFrom,
    validTo,
    teacherFilter,
    studioFilter,
    disciplineFilters.length > 0 ? "discipline" : null,
    withNotes ? "notes" : null,
    q && q.length > 0 ? "q" : null,
  ].filter(Boolean).length;

  const session = await getServerSession(authOptions);
  if (!session?.user?.schoolId) {
    return null;
  }
  const isTeacher = session.user.role === "TEACHER";
  const effectiveTeacherFilter = isTeacher ? session.user.id : teacherFilter;
  const userKey = session.user.id ?? "anon";

  const whereClause = {
    schoolId: session.user.schoolId,
    ...(effectiveTeacherFilter ? { teacherId: effectiveTeacherFilter } : {}),
    ...(studioFilter ? { studioId: studioFilter } : {}),
    ...(validFrom ? { date: { gte: validFrom } } : {}),
    ...(validTo ? { date: { lte: validTo } } : {}),
    ...(withNotes ? { notes: { some: {} } } : {}),
    ...(q
      ? {
          title: { contains: q, mode: "insensitive" as const },
        }
      : {}),
    ...(disciplineFilters.length > 0
      ? {
          OR: disciplineFilters.map((d) => ({
            discipline: { contains: d, mode: "insensitive" as const },
          })),
        }
      : {}),
  };

  const [totalCount, teachers, studios, courseDistinctDisciplines] = await Promise.all([
    prisma.course.count({ where: whereClause }),
    prisma.user.findMany({
      where: { schoolId: session.user.schoolId, role: "TEACHER" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.studio.findMany({
      where: { schoolId: session.user.schoolId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.course.findMany({
      where: { schoolId: session.user.schoolId },
      select: { discipline: true },
      distinct: ["discipline"],
    }),
  ]);
  const disciplineRows =
    (await prisma.discipline
      .findMany({
        where: { schoolId: session.user.schoolId },
        select: { id: true, name: true, color: true },
        orderBy: { name: "asc" },
      })
      .catch(() => [])) ?? [];

  const disciplines = (() => {
    const legacy = courseDistinctDisciplines
      .map((c) => c.discipline)
      .filter((d): d is string => Boolean(d && d.trim().length > 0))
      .map((d) => ({ name: d.trim(), color: undefined as string | undefined }));
    const merged: { id?: string; name: string; color?: string | null }[] = [...disciplineRows];
    legacy.forEach((d) => {
      if (!merged.some((m) => m.name.toLowerCase() === d.name.toLowerCase())) {
        merged.push(d);
      }
    });
    return merged.length > 0 ? merged : FALLBACK_DISCIPLINES;
  })();
  const teacherChip =
    teacherFilter
      ? teachers.find((t) => t.id === teacherFilter) ??
        (await prisma.user
          .findUnique({ where: { id: teacherFilter }, select: { name: true, email: true } })
          .catch(() => null))
      : null;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, rawPage || 1), totalPages);
  const skip = (currentPage - 1) * PAGE_SIZE;

  const courses = await prisma.course
    .findMany({
      where: whereClause,
      orderBy: { date: "desc" },
      skip,
      take: PAGE_SIZE,
      include: {
        attendances: true,
        positions: true,
        teacher: { select: { name: true, email: true } },
        studio: { select: { name: true } },
        _count: { select: { notes: true, attendances: true, positions: true } },
      },
    })
    .catch((error) => {
      const message = (error as Error)?.message ?? "";
      const missingColumns =
        message.includes("maxSeats") || message.includes("costCredits");
      if (missingColumns) {
        return prisma.course.findMany({
          where: whereClause,
          orderBy: { date: "desc" },
          skip,
          take: PAGE_SIZE,
          include: {
            attendances: true,
            positions: true,
            teacher: { select: { name: true, email: true } },
            studio: { select: { name: true } },
            _count: { select: { notes: true, attendances: true, positions: true } },
          },
        });
      }
      throw error;
    });
  const recommendationStats =
    courses.length > 0
      ? await prisma.courseRecommendation
          .findMany({
            where: { courseId: { in: courses.map((c) => c.id) } },
            select: { courseId: true, appliedAt: true, forced: true, excludedForInjury: true },
          })
          .then((rows) => {
            const map = new Map<string, { applied: number; forced: number; excluded: number }>();
            rows.forEach((r) => {
              const current = map.get(r.courseId) ?? { applied: 0, forced: 0, excluded: 0 };
              if (r.appliedAt) current.applied += 1;
              if (r.forced) current.forced += 1;
              if (r.excludedForInjury && !r.forced) current.excluded += 1;
              map.set(r.courseId, current);
            });
            return map;
          })
      : new Map<string, { applied: number; forced: number; excluded: number }>();

  return (
    <main className="flex min-h-screen w-full flex-col gap-4">
      <header className="panel flex flex-wrap items-center justify-between gap-3 border-indigo-400/25 p-6 shadow-indigo-900/30">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-indigo-100">
            Professeur / Admin
          </p>
          <h1 className="text-3xl font-semibold text-white">Cours</h1>
          <p className="text-sm text-slate-200">Derniers cours créés.</p>
        </div>
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          {session.user.role === "SCHOOL_ADMIN" ? (
            <Link
              href="/app/admin"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-normal text-white transition hover:border-cyan-400/70 hover:bg-white/10"
            >
              ← Retour dashboard
            </Link>
          ) : session.user.role === "TEACHER" ? (
            <Link
              href="/app/teacher"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-normal text-white transition hover:border-cyan-400/70 hover:bg-white/10"
            >
              ← Retour accueil
            </Link>
          ) : null}
          <Link
            href="/app/teacher/courses/agenda?view=month"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/agenda.svg" alt="" className="h-4 w-4" />
            Agenda
          </Link>
          <Link
            href="/app/teacher/courses/new"
            className="rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 px-3 py-2 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
          >
            Nouveau cours
          </Link>
        </div>
      </header>

      <section className="panel space-y-4 border-indigo-400/15 p-6">
        <FilterPanel
          storageKey="filters:teacher-courses"
          title="Filtres avancés"
          activeCount={activeFilters}
          userKey={userKey}
        >
          <form
            key={`filters-${resolvedParams.from ?? ""}-${resolvedParams.to ?? ""}-${effectiveTeacherFilter ?? ""}-${studioFilter ?? ""}-${disciplineFilters.join("|") || "all"}-${withNotes ? "notes" : "all"}-${q || "all"}`}
            className="mt-4 grid w-full gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-indigo-900/20 md:grid-cols-5 md:items-end"
            method="get"
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
            {isTeacher ? (
              <input type="hidden" name="teacher" value={session.user.id} />
            ) : (
              <label className="text-sm text-slate-200">
                Professeur
                <select
                  key={effectiveTeacherFilter ?? "all-teachers"}
                  name="teacher"
                  defaultValue={effectiveTeacherFilter ?? ""}
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
            )}
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
              <legend className="mb-1">Discipline</legend>
              <div className="rounded-xl border border-white/10 bg-white/5 p-2">
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {disciplines.slice(0, 6).map((d, idx) => (
                    <label
                      key={`${d.name}-primary-${idx}`}
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
                        style={{ backgroundColor: d.color ?? undefined }}
                      />
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
                          <span
                            className="inline-flex h-3 w-3 rounded-full border border-white/20"
                            style={{ backgroundColor: d.color ?? undefined }}
                          />
                          {d.name}
                        </label>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </fieldset>
          <label className="mt-1 inline-flex flex-wrap items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-200 md:col-span-2">
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
          <div className="md:col-span-5 flex flex-wrap items-center justify-end gap-2">
            <button
              type="submit"
              className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-400"
            >
              Filtrer
            </button>
            <Link
              href="/app/teacher/courses"
              className="rounded-full border border-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
              >
                Réinitialiser
              </Link>
            </div>
          </form>
        </FilterPanel>

        {activeFilters > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-white">
            <span className="rounded-full border border-cyan-400/60 bg-cyan-500/20 px-2 py-0.5">
              {activeFilters} filtre{activeFilters > 1 ? "s" : ""} actif{activeFilters > 1 ? "s" : ""}
            </span>
            {disciplineFilters.length > 0 &&
              disciplineFilters.map((d) => (
                <span
                  key={d}
                  className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-slate-200"
                >
                  Discipline : “{d}”
                </span>
              ))}
            {teacherFilter && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-slate-200">
                Prof :{" "}
                {teacherChip?.name ?? teacherChip?.email ?? teacherFilter}
              </span>
            )}
            {studioFilter && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-slate-200">
                Studio : {studioFilter}
              </span>
            )}
            {(validFrom || validTo) && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-slate-200">
                Dates : {resolvedParams.from ?? "—"} → {resolvedParams.to ?? "—"}
              </span>
            )}
            {withNotes && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-slate-200">
                Avec notes
              </span>
            )}
            {q && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-slate-200">
                Recherche : “{q}”
              </span>
            )}
          </div>
        )}
        <div className="flex flex-col divide-y divide-white/5">
          {courses.map((course) => {
            const isPast = new Date(course.date).getTime() < NOW_MS;
            const seatsUsed = course._count?.attendances ?? course.attendances.length ?? 0;
            const remainingSeats = (course.maxSeats ?? 30) - seatsUsed;
            const cost = course.costCredits ?? 100;
            const faded = isPast ? "opacity-60" : "";
            const photoUrl = course.photoUrl?.trim() || COURSE_PHOTO_PLACEHOLDER;
            const detailHref = `/app/teacher/courses/${course.id}?from=${encodeURIComponent(
              `/app/teacher/courses?page=${currentPage}`
            )}`;
            const recStats = recommendationStats.get(course.id);
            return (
              <div
                key={course.id}
                className={`block rounded-xl ${faded}`}
              >
                <article className="flex flex-col gap-2 py-3 px-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-lg font-semibold text-white">{course.title ?? "Cours sans titre"}</p>
                  </div>
                  <div className="flex flex-wrap items-start gap-3 md:flex-nowrap">
                    <SafeImage
                      src={photoUrl}
                      alt={course.title ?? "Cours"}
                      width={96}
                      height={64}
                      className="h-16 w-24 rounded-lg border border-white/10 object-cover shadow"
                      fallbackSrc={COURSE_PHOTO_PLACEHOLDER}
                    />
                    <div className="min-w-[220px] flex-1 space-y-1">
                      <p className="text-sm text-slate-200 flex flex-wrap items-center gap-2">
                        <span>{course.teacher?.name ?? course.teacher?.email ?? "Professeur"}</span>
                        {course.studio && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-cyan-100">
                            Studio · {course.studio.name}
                          </span>
                        )}
                      </p>
                      <div className="text-sm text-slate-300 space-y-1">
                        <p>
                          {new Date(course.date).toLocaleString("fr-FR", {
                            hour12: false,
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          · Durée : {formatDuration(course.durationMinutes ?? 60)}
                        </p>
                        <p>
                          {remainingSeats} place(s) restante(s) / {course.maxSeats ?? 30} · {cost} crédits
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-200">
                      <span>
                        {course.attendances.length} élèves · {course.positions.length} positions
                      </span>
                      {course.isVirtual && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/70 bg-amber-500/15 px-2 py-1 text-[11px] font-semibold text-amber-100">
                          Occurrence programmée (positions à définir)
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[11px] font-semibold text-white">
                        Notes : {course._count.notes}
                      </span>
                      {recStats && (
                        <>
                          <span className="rounded-full border border-emerald-300/60 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-50">
                            {recStats.applied} appliquée{recStats.applied > 1 ? "s" : ""}
                          </span>
                          <span className="rounded-full border border-amber-300/60 bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-50">
                            {recStats.forced} forcée{recStats.forced > 1 ? "s" : ""}
                          </span>
                          <span className="rounded-full border border-red-300/60 bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold text-red-50">
                            {recStats.excluded} exclue{recStats.excluded > 1 ? "s" : ""} blessure
                          </span>
                        </>
                      )}
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
          {courses.length === 0 && (
            <div className="mt-2 rounded-2xl border border-dashed border-white/15 bg-white/5 p-4 text-sm text-slate-200">
              Aucun cours créé pour le moment. Utilise le bouton “Nouveau cours” pour commencer.
            </div>
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-200">
          <span>
            Page {currentPage} / {totalPages} · {totalCount} cours
          </span>
          <div className="flex items-center gap-2">
            <Link
              href={`/app/teacher/courses?page=${Math.max(1, currentPage - 1)}`}
              aria-disabled={currentPage === 1}
              className={`rounded-full border border-white/10 px-3 py-2 ${
                currentPage === 1
                  ? "cursor-not-allowed text-slate-500"
                  : "bg-white/5 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
              }`}
            >
              Précédent
            </Link>
            <Link
              href={`/app/teacher/courses?page=${Math.min(totalPages, currentPage + 1)}`}
              aria-disabled={currentPage === totalPages}
              className={`rounded-full border border-white/10 px-3 py-2 ${
                currentPage === totalPages
                  ? "cursor-not-allowed text-slate-500"
                  : "bg-white/5 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
              }`}
            >
              Suivant
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
