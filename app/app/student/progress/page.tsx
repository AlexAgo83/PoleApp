import { LearningStatus, MasteryLevel, PositionLevel, PositionType, Prisma } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { FilterPanel } from "@/components/FilterPanel";
import { SafeImage } from "@/components/SafeImage";
import { prisma } from "@/lib/prisma";
import { POSITION_PLACEHOLDER } from "@/lib/placeholders";

const statusLabels: Record<LearningStatus, string> = {
  NOT_STARTED: "Découverte",
  IN_PROGRESS: "Tenté",
  PASSED: "Passé",
  MASTERED: "Fluide",
};

const masteryLabels: Record<MasteryLevel, string> = {
  INITIATED: "Initiation",
  PASSED: "Passé",
  FLUID: "Fluide",
  CHOREO: "Choréo",
};

const statusClass: Record<LearningStatus, string> = {
  NOT_STARTED: "border border-white/10 bg-white/5 text-slate-200",
  IN_PROGRESS: "border border-amber-400/40 bg-amber-500/20 text-amber-100",
  PASSED: "border border-cyan-400/40 bg-cyan-500/20 text-cyan-100",
  MASTERED: "border border-emerald-400/40 bg-emerald-500/20 text-emerald-100",
};

const typeLabels = {
  SPIN: "Spin",
  TRICK: "Trick",
  TRANSITION: "Transition",
  WARMUP: "Warmup",
  STRENGTH: "Strength",
} as const;

const PAGE_SIZE = 10;

export default async function StudentProgressPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; type?: string; level?: string; q?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "STUDENT") redirect("/access-denied");
  const userKey = session.user.id ?? "anon";

  const resolvedParams = (await searchParams) ?? {};
  const pageParam = Array.isArray(resolvedParams.page)
    ? resolvedParams.page[0]
    : resolvedParams.page;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;
  const typeFilter =
    resolvedParams.type && Object.values(PositionType).includes(resolvedParams.type as PositionType)
      ? (resolvedParams.type as PositionType)
      : undefined;
  const levelFilter =
    resolvedParams.level &&
    Object.values(PositionLevel).includes(resolvedParams.level as PositionLevel)
      ? (resolvedParams.level as PositionLevel)
      : undefined;
  const q = resolvedParams.q?.toString().trim() || "";
  const activeFilters = [typeFilter, levelFilter, q && q.length > 0 ? "q" : null].filter(
    Boolean
  ).length;

  const [progressEntries, totalPositions] = await Promise.all([
    prisma.studentPositionProgress.findMany({
      where: { studentId: session.user.id },
      include: { position: true },
    }),
    // Total positions visible (all if premium, else only unlocked)
    session.user.isPremium
      ? prisma.position.count()
      : prisma.studentPositionProgress.count({
          where: { studentId: session.user.id },
        }),
  ]);

  const progressMap = new Map(
    progressEntries.map((p) => [p.positionId, p])
  );

  const visibleIds = session.user.isPremium
    ? undefined
    : progressEntries.map((p) => p.positionId);

  const where: Prisma.PositionWhereInput = {
    ...(visibleIds ? { id: { in: visibleIds } } : {}),
    ...(typeFilter ? { type: typeFilter } : {}),
    ...(levelFilter ? { levelRequired: levelFilter } : {}),
    ...(q
      ? {
          name: { contains: q, mode: "insensitive" as Prisma.QueryMode },
        }
      : {}),
  };

  const filteredCount = await prisma.position.count({
    where,
  });

  // Nombre de fois où l’élève a vu/enseigné la position (basé sur les cours suivis)
  const attendanceWithPositions = await prisma.courseAttendance.findMany({
    where: { studentId: session.user.id },
    select: {
      course: { select: { positions: { select: { positionId: true } } } },
    },
  });
  const seenCounts = new Map<string, number>();
  attendanceWithPositions.forEach((att) => {
    att.course.positions.forEach((cp) => {
      seenCounts.set(cp.positionId, (seenCounts.get(cp.positionId) ?? 0) + 1);
    });
  });

  const positions = await prisma.position.findMany({
    where,
    orderBy: { name: "asc" },
    include: { media: { take: 1 } },
    skip,
    take: PAGE_SIZE,
  });

  const lockedCount = 0;
  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));

  const queryParams = new URLSearchParams();
  if (typeFilter) queryParams.set("type", typeFilter);
  if (levelFilter) queryParams.set("level", levelFilter);
  if (q) queryParams.set("q", q);
  const qs = queryParams.toString();

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="panel p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">
          Élève
        </p>
        <h1 className="text-3xl font-semibold text-white">Ma progression</h1>
        <p className="text-sm text-slate-300">
          {session.user.isPremium
            ? "Accès complet à la base des positions."
            : "Accès aux positions vues (compte gratuit)."}
        </p>
        <div className="mt-3 flex w-full justify-end">
          <Link
            href="/app/student"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-normal text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            ← Retour accueil
          </Link>
        </div>
      </header>

      <section className="panel space-y-4 border-indigo-400/15 p-6">
        {!session.user.isPremium && lockedCount > 0 && (
          <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
            {lockedCount} position(s) verrouillées. Passe en premium pour tout voir.
          </div>
        )}
        <FilterPanel
          storageKey="filters:student-progress"
          title="Filtres"
          activeCount={activeFilters}
          userKey={userKey}
        >
          <form
            key={`filters-${typeFilter ?? "all"}-${levelFilter ?? "all"}-${q || "all"}`}
            method="get"
            className="mt-4 grid w-full gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-indigo-900/20 md:grid-cols-3 md:items-end"
          >
            <label className="text-sm text-slate-200">
              Recherche
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Nom de la position"
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              />
            </label>
            <label className="text-sm text-slate-200">
              Type
              <select
                name="type"
                defaultValue={typeFilter ?? ""}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              >
                <option value="">Tous les types</option>
                {Object.values(PositionType).map((t) => (
                  <option key={t} value={t}>
                    {typeLabels[t]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-200">
              Niveau
              <select
                name="level"
                defaultValue={levelFilter ?? ""}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              >
                <option value="">Tous niveaux</option>
                {Object.values(PositionLevel).map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl === "BEGINNER"
                      ? "Beginner"
                      : lvl === "INTERMEDIATE"
                      ? "Intermédiaire"
                      : "Avancé"}
                  </option>
                ))}
              </select>
            </label>
            <div className="md:col-span-3 flex flex-wrap items-center justify-end gap-2">
              <button
                type="submit"
                className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-400"
              >
                Filtrer
              </button>
              <Link
                href="/app/student/progress"
                className="rounded-full border border-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
              >
                Réinitialiser
              </Link>
            </div>
          </form>
        </FilterPanel>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-semibold ${statusClass.NOT_STARTED}`}>
            ● {statusLabels.NOT_STARTED}
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-semibold ${statusClass.IN_PROGRESS}`}>
            ● {statusLabels.IN_PROGRESS}
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-semibold ${statusClass.PASSED}`}>
            ● {statusLabels.PASSED}
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-semibold ${statusClass.MASTERED}`}>
            ● {statusLabels.MASTERED}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-cyan-300/40 bg-cyan-500/15 px-3 py-1 font-semibold text-cyan-100">
            ● Vu : compteur de cours contenant la position
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {positions.map((position) => {
            const progress = progressMap.get(position.id);
            const status = progress?.learningStatus ?? "NOT_STARTED";
            const mastery = progress?.masteryLevel;
            const cover = position.media[0];
            const detailHref = `/positions/${position.id}?from=/app/student/progress?page=${page}${qs ? `&${qs}` : ""}`;
            const seen = seenCounts.get(position.id) ?? 0;

            return (
              <Link
                key={position.id}
                href={detailHref}
                className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition hover:border-indigo-300/60 hover:bg-white/10"
              >
                {cover ? (
                  <SafeImage
                    src={cover.url}
                    alt={position.name}
                    width={480}
                    height={200}
                    className="h-40 w-full object-cover"
                    fallbackSrc={POSITION_PLACEHOLDER}
                  />
                ) : (
                  <SafeImage
                    src={POSITION_PLACEHOLDER}
                    alt={position.name}
                    width={480}
                    height={200}
                    className="h-40 w-full object-cover"
                    fallbackSrc={POSITION_PLACEHOLDER}
                  />
                )}
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold text-white">
                      {position.name}
                    </h3>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass[status as LearningStatus]}`}
                    >
                      {statusLabels[status as LearningStatus]}
                    </span>
                  </div>
                  <p className="text-sm text-cyan-200">{typeLabels[position.type]}</p>
                  <p className="text-sm text-slate-300 line-clamp-2">
                    {position.tips ?? position.description ?? "Aucun détail"}
                  </p>
                  {mastery && (
                    <p className="text-xs text-slate-200">
                      Niveau : {masteryLabels[mastery]}
                    </p>
                  )}
                  <div className="mt-auto flex flex-wrap items-center justify-end gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full border border-cyan-300/40 bg-cyan-500/15 px-2 py-0.5 font-semibold text-cyan-100">
                      Vu : {seen}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
          {positions.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-white/15 bg-white/5 px-4 py-6 text-center text-slate-200">
              Aucune position débloquée pour l’instant.
            </div>
          )}
        </div>
        <div className="mt-6 flex items-center justify-center gap-3 text-sm text-slate-200">
          <Link
            aria-disabled={page <= 1}
            href={page <= 1 ? "#" : `/app/student/progress?page=${page - 1}${qs ? `&${qs}` : ""}`}
            className={`rounded-full border px-3 py-1 font-semibold transition ${
              page <= 1
                ? "cursor-not-allowed border-white/10 text-slate-500"
                : "border-white/20 hover:border-cyan-400 hover:text-cyan-200"
            }`}
          >
            Précédent
          </Link>
          <span>
            Page {page} / {totalPages}
          </span>
          <Link
            aria-disabled={page >= totalPages}
            href={
              page >= totalPages
                ? "#"
                : `/app/student/progress?page=${page + 1}${qs ? `&${qs}` : ""}`
            }
            className={`rounded-full border px-3 py-1 font-semibold transition ${
              page >= totalPages
                ? "cursor-not-allowed border-white/10 text-slate-500"
                : "border-white/20 hover:border-cyan-400 hover:text-cyan-200"
            }`}
          >
            Suivant
          </Link>
        </div>
      </section>
    </main>
  );
}
