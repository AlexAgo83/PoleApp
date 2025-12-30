import { LearningStatus, PositionLevel, PositionType, Prisma } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { FilterPanel } from "@/components/FilterPanel";
import { SafeImage } from "@/components/SafeImage";
import { prisma } from "@/lib/prisma";
import { POSITION_PLACEHOLDER } from "@/lib/placeholders";

const statusLabels: Record<LearningStatus, string> = {
  NOT_STARTED: "Nouveauté",
  IN_PROGRESS: "Initié",
  PASSED: "Passé",
  MASTERED: "Fluide chorégraphié",
};

const statusStyles: Record<LearningStatus, { solid: string; outline: string }> = {
  NOT_STARTED: {
    solid: "border-[#2563eb] bg-[#2563eb] text-white",
    outline: "border-[#2563eb] text-[#2563eb]",
  },
  IN_PROGRESS: {
    solid: "border-[#f59e0b] bg-[#f59e0b] text-white",
    outline: "border-[#f59e0b] text-[#f59e0b]",
  },
  PASSED: {
    solid: "border-[#10b981] bg-[#10b981] text-white",
    outline: "border-[#10b981] text-[#10b981]",
  },
  MASTERED: {
    solid: "border-[#7c3aed] bg-[#7c3aed] text-white",
    outline: "border-[#7c3aed] text-[#7c3aed]",
  },
};

const statusBarColor: Record<LearningStatus, string> = {
  NOT_STARTED: "#2563eb",
  IN_PROGRESS: "#f59e0b",
  PASSED: "#10b981",
  MASTERED: "#7c3aed",
};

const typeLabels = {
  SPIN: "Spin",
  TRICK: "Trick",
  TRANSITION: "Transition",
  WARMUP: "Warmup",
  STRENGTH: "Strength",
} as const;

const PAGE_SIZE = 12;

function hexToRgba(color: string, alpha: number) {
  if (!color || !color.startsWith("#")) return null;
  let hex = color.slice(1);
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (hex.length !== 6) return null;
  const num = Number.parseInt(hex, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default async function StudentProgressPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; type?: string; level?: string; q?: string; discipline?: string; progress?: string }>;
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
  const disciplineFilter = resolvedParams.discipline?.toString().trim() || "";
  const onlyInProgress =
    resolvedParams.progress === "1" ||
    resolvedParams.progress === "true" ||
    resolvedParams.progress === "on";
  const q = resolvedParams.q?.toString().trim() || "";
  const activeFilters = [typeFilter, levelFilter, disciplineFilter, onlyInProgress ? "progress" : null, q && q.length > 0 ? "q" : null].filter(
    Boolean
  ).length;

  const progressEntries = await prisma.studentPositionProgress.findMany({
    where: { studentId: session.user.id },
    include: { position: true },
  });

  const progressMap = new Map(
    progressEntries.map((p) => [p.positionId, p])
  );

  // Positions vues en cours (pour afficher le compteur et débloquer l'accès même sans progression explicite)
  const attendanceWithPositions = await prisma.courseAttendance.findMany({
    where: { studentId: session.user.id },
    select: {
      course: { select: { positions: { select: { positionId: true } } } },
    },
  });
  const seenCounts = new Map<string, number>();
  const seenIds = new Set<string>();
  attendanceWithPositions.forEach((att) => {
    att.course.positions.forEach((cp) => {
      seenCounts.set(cp.positionId, (seenCounts.get(cp.positionId) ?? 0) + 1);
      seenIds.add(cp.positionId);
    });
  });

  const visibleIds = session.user.isPremium
    ? undefined
    : Array.from(new Set([...progressEntries.map((p) => p.positionId), ...Array.from(seenIds)]));

  const where: Prisma.PositionWhereInput = {
    ...(visibleIds ? { id: { in: visibleIds } } : {}),
    ...(typeFilter ? { type: typeFilter } : {}),
    ...(levelFilter ? { levelRequired: levelFilter } : {}),
    ...(disciplineFilter
      ? { discipline: { contains: disciplineFilter, mode: Prisma.QueryMode.insensitive } }
      : {}),
    ...(q
      ? {
          name: { contains: q, mode: "insensitive" as Prisma.QueryMode },
        }
      : {}),
    ...(onlyInProgress
      ? {
          progress: {
            some: {
              studentId: session.user.id,
              learningStatus: LearningStatus.IN_PROGRESS,
            },
          },
        }
      : {}),
  };

  const filteredCount = await prisma.position.count({
    where,
  });

  const positions = await prisma.position.findMany({
    where,
    orderBy: { name: "asc" },
    include: { media: { take: 1 } },
    skip,
    take: PAGE_SIZE,
  });
  const disciplineRows = session.user.schoolId
    ? await prisma.discipline.findMany({
        where: { schoolId: session.user.schoolId },
        select: { name: true, color: true },
      })
    : [];
  const disciplineColors = new Map(
    disciplineRows
      .filter((d) => d.name)
      .map((d) => [d.name.toLowerCase(), d.color ?? null]),
  );
  const disciplineStyle = (name?: string | null) => {
    if (!name) return undefined;
    const color = disciplineColors.get(name.toLowerCase());
    if (!color) return undefined;
    return {
      borderColor: color,
      color,
      backgroundColor: hexToRgba(color, 0.16) ?? undefined,
    };
  };

  const lockedCount = 0;
  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));

  const queryParams = new URLSearchParams();
  if (typeFilter) queryParams.set("type", typeFilter);
  if (levelFilter) queryParams.set("level", levelFilter);
  if (disciplineFilter) queryParams.set("discipline", disciplineFilter);
  if (onlyInProgress) queryParams.set("progress", "1");
  if (q) queryParams.set("q", q);
  const qs = queryParams.toString();

  return (
    <main className="flex min-h-screen w-full flex-col gap-4">
      <section className="panel space-y-4 border-indigo-400/15 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-3xl font-semibold text-white">Ma progression</h1>
            <p className="text-sm text-slate-300">
              {session.user.isPremium
                ? "Accès complet à la base des positions."
                : "Accès aux positions vues (compte gratuit)."}
            </p>
          </div>
        </div>

        {!session.user.isPremium && lockedCount > 0 && (
          <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
            {lockedCount} position(s) verrouillées. Passe en premium pour tout voir.
          </div>
        )}
        <div className="flex flex-wrap gap-2 text-xs">
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-semibold ${statusStyles.NOT_STARTED.solid}`}>
            ● {statusLabels.NOT_STARTED}
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-semibold ${statusStyles.IN_PROGRESS.solid}`}>
            ● {statusLabels.IN_PROGRESS}
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-semibold ${statusStyles.PASSED.solid}`}>
            ● {statusLabels.PASSED}
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-semibold ${statusStyles.MASTERED.solid}`}>
            ● {statusLabels.MASTERED}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-cyan-300/40 bg-cyan-500/15 px-3 py-1 font-semibold text-cyan-100">
            ● Vu : compteur de cours
          </span>
        </div>
        <FilterPanel
          storageKey="filters:student-progress"
          title="Filtres"
          activeCount={activeFilters}
          userKey={userKey}
        >
          <form
            key={`filters-${typeFilter ?? "all"}-${levelFilter ?? "all"}-${q || "all"}`}
            method="get"
            className="mt-4 grid w-full gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-indigo-900/20 md:grid-cols-4 md:items-end"
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
              Discipline
              <select
                name="discipline"
                defaultValue={disciplineFilter}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              >
                <option value="">Toutes disciplines</option>
                {disciplineRows.map((d) => (
                  <option key={d.name} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
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
            <div className="flex flex-col justify-end gap-2 text-sm text-slate-200">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  name="progress"
                  value="1"
                  defaultChecked={onlyInProgress}
                  className="h-4 w-4"
                />
                <span>En progression</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 rounded-full bg-cyan-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-cyan-400"
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
            </div>
          </form>
        </FilterPanel>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {positions.map((position) => {
            const progress = progressMap.get(position.id);
            const status = progress?.learningStatus ?? "NOT_STARTED";
            const cover = position.media[0];
            const detailHref = `/positions/${position.id}?from=/app/student/progress?page=${page}${qs ? `&${qs}` : ""}`;
            const seen = seenCounts.get(position.id) ?? 0;
            const showProgress = seen > 0 || status !== "NOT_STARTED";
            const statusColor = statusBarColor[status as LearningStatus] ?? "#2563eb";
            const fillRatio =
              status === "NOT_STARTED"
                ? 0.12
                : status === "IN_PROGRESS"
                  ? 0.4
                  : status === "PASSED"
                    ? 0.7
                    : 1.0;

            return (
              <Link
                key={position.id}
                href={detailHref}
                className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-900/40 via-slate-900/40 to-cyan-900/30 shadow-inner shadow-black/30 transition hover:border-cyan-300/60 hover:shadow-cyan-900/30"
              >
                <div className="relative">
                  {cover ? (
                    <SafeImage
                      src={cover.url}
                      alt={position.name}
                      width={480}
                      height={360}
                      className="aspect-[4/3] w-full object-cover"
                      fallbackSrc={POSITION_PLACEHOLDER}
                    />
                  ) : (
                    <SafeImage
                      src={POSITION_PLACEHOLDER}
                      alt={position.name}
                      width={480}
                      height={360}
                      className="aspect-[4/3] w-full object-cover"
                      fallbackSrc={POSITION_PLACEHOLDER}
                    />
                  )}
                  <div
                    className="absolute bottom-3 left-1/2 flex w-1/2 min-w-[120px] -translate-x-1/2 flex-col items-center gap-1"
                    aria-hidden
                  >
                    {showProgress ? (
                      <span
                        className="text-xs font-semibold"
                        style={{ color: statusColor }}
                      >
                        {statusLabels[status as LearningStatus]}
                      </span>
                    ) : null}
                    <div className="h-4 w-full rounded-full border border-white/10 bg-white/20 shadow-lg shadow-black/30">
                      {showProgress ? (
                        <div
                          className="h-full rounded-full"
                          style={{ background: statusColor, width: `${Math.round(fillRatio * 100)}%` }}
                        />
                      ) : null}
                    </div>
                  </div>
                  <div className="absolute left-3 right-3 top-3 flex items-start justify-between gap-2">
                    {position.discipline ? (
                      <span
                        className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur"
                        style={disciplineStyle(position.discipline)}
                      >
                        {position.discipline}
                      </span>
                      ) : (
                        <span />
                      )}
                    <div className="flex flex-col items-end gap-2 text-right">
                      {showProgress ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/50 px-2.5 py-1 text-[11px] font-semibold text-slate-50">
                          Vu : {seen}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold text-white">{position.name}</h3>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-amber-100">
                      {position.levelRequired === "BEGINNER"
                        ? "Beginner"
                        : position.levelRequired === "INTERMEDIATE"
                          ? "Intermédiaire"
                          : "Avancé"}
                    </span>
                  </div>
                  <p className="text-sm text-cyan-200">{typeLabels[position.type]}</p>
                  <p className="text-sm text-slate-300 line-clamp-2">
                    {position.tips ?? position.description ?? "Aucun détail"}
                  </p>
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
