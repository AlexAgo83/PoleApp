import { LearningStatus, MasteryLevel, PositionLevel, PositionType, Prisma } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const statusLabels: Record<LearningStatus, string> = {
  NOT_STARTED: "Non commencé",
  IN_PROGRESS: "En cours",
  PASSED: "Passé",
  MASTERED: "Maîtrisé",
};

const masteryLabels: Record<MasteryLevel, string> = {
  INITIATED: "Initiation",
  PASSED: "Passé",
  FLUID: "Fluide",
  CHOREO: "Choréo",
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
      </header>

      <section className="panel space-y-4 border-indigo-400/15 p-6">
        {!session.user.isPremium && lockedCount > 0 && (
          <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
            {lockedCount} position(s) verrouillées. Passe en premium pour tout voir.
          </div>
        )}
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
                className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-400"
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
        </details>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {positions.map((position) => {
            const progress = progressMap.get(position.id);
            const status = progress?.learningStatus ?? "NOT_STARTED";
            const mastery = progress?.masteryLevel;
            const cover = position.media[0];

            return (
              <article
                key={position.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition hover:border-indigo-300/60 hover:bg-white/10"
              >
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cover.url}
                    alt={position.name}
                    className="h-40 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-40 w-full items-center justify-center bg-white/5 text-sm text-slate-300">
                    Pas d’image
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold text-white">
                      {position.name}
                    </h3>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        status === "NOT_STARTED"
                          ? "border border-white/10 bg-white/5 text-slate-200"
                          : status === "IN_PROGRESS"
                          ? "border border-amber-400/40 bg-amber-500/20 text-amber-100"
                          : status === "PASSED"
                          ? "border border-emerald-400/40 bg-emerald-500/20 text-emerald-100"
                          : "border border-indigo-400/40 bg-indigo-500/20 text-indigo-50"
                      }`}
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
                  <Link
                    href={`/positions/${position.id}?from=/app/student/progress?page=${page}`}
                    className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 transition hover:text-cyan-200"
                  >
                    Détail position →
                  </Link>
                </div>
              </article>
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
