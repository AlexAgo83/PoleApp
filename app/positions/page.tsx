import { PositionLevel, PositionType, Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import Link from "next/link";

import { SignOutButton } from "@/components/auth/SignOutButton";
import { FilterPanel } from "@/components/FilterPanel";
import { SafeImage } from "@/components/SafeImage";
import { authOptions } from "@/lib/auth";
import { POSITION_PLACEHOLDER } from "@/lib/placeholders";
import { prisma } from "@/lib/prisma";
import { defaultHomeForRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 10;

const typeLabels: Record<PositionType, string> = {
  SPIN: "Spin",
  TRICK: "Trick",
  TRANSITION: "Transition",
  WARMUP: "Warmup",
  STRENGTH: "Strength",
};

const levelLabels: Record<PositionLevel, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermédiaire",
  ADVANCED: "Avancé",
};

const progressLabels: Record<string, string> = {
  NOT_STARTED: "Découverte",
  IN_PROGRESS: "Tenté",
  PASSED: "Passé",
  MASTERED: "Fluide",
  INITIATED: "Initiation",
  FLUID: "Fluide",
  CHOREO: "Choréo",
};

type SearchParams =
  | { page?: string; type?: string; level?: string; q?: string }
  | Promise<{
      page?: string;
      type?: string;
      level?: string;
      q?: string;
    }>;

export default async function PositionsPage({ searchParams }: { searchParams?: SearchParams }) {
  const resolvedParams = (await Promise.resolve(searchParams)) ?? {};
  const rawPage = Number(resolvedParams.page ?? "1");
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
  const activeFilters = [typeFilter, levelFilter, q && q.length > 0].filter(Boolean).length;

  const where: Prisma.PositionWhereInput = {
    ...(typeFilter ? { type: typeFilter } : {}),
    ...(levelFilter ? { levelRequired: levelFilter } : {}),
    ...(q
      ? {
          name: { contains: q, mode: Prisma.QueryMode.insensitive },
        }
      : {}),
  };

  const totalCount = await prisma.position.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, rawPage || 1), totalPages);
  const skip = (currentPage - 1) * PAGE_SIZE;

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return null;
  }
  const userKey = session.user.id ?? "anon";
  const homeForRole = defaultHomeForRole(session.user.role);
  const isStudent = session.user.role === "STUDENT";
  const isPremium = Boolean(session.user.isPremium);
  const queryParams = new URLSearchParams();
  if (typeFilter) queryParams.set("type", typeFilter);
  if (levelFilter) queryParams.set("level", levelFilter);
  if (q) queryParams.set("q", q);
  const qs = queryParams.toString();
  const positions = await prisma.position.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    skip,
    take: PAGE_SIZE,
    include: {
      media: true,
      _count: { select: { progress: true } },
    },
  });
  const studentProgress = isStudent
    ? await prisma.studentPositionProgress.findMany({
        where: { studentId: session.user.id },
        select: { positionId: true, learningStatus: true, masteryLevel: true },
      })
    : [];
  const progressMap = new Map(studentProgress.map((p) => [p.positionId, p]));
  const progressBadgeClass: Record<string, string> = {
    NOT_STARTED: "border-[#2563eb] bg-[#2563eb] text-white",
    IN_PROGRESS: "border-[#f59e0b] bg-[#f59e0b] text-white",
    PASSED: "border-[#10b981] bg-[#10b981] text-white",
    MASTERED: "border-[#7c3aed] bg-[#7c3aed] text-white",
    INITIATED: "border-[#2563eb] bg-[#2563eb] text-white",
    FLUID: "border-[#7c3aed] bg-[#7c3aed] text-white",
    CHOREO: "border-[#7c3aed] bg-[#7c3aed] text-white",
  };
  const canManage = session.user.role === "TEACHER" || session.user.role === "SCHOOL_ADMIN";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-3 px-2 py-6 md:gap-6 md:px-8 md:py-10">
      <section className="panel flex flex-wrap items-center justify-between gap-3 p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">
            Espace {session.user.role === "SCHOOL_ADMIN" ? "admin" : session.user.role === "TEACHER" ? "prof" : "élève"}
          </p>
          <p className="text-sm text-slate-300">
            Accès aux positions et navigation retour selon ton rôle.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={homeForRole}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/house.svg" alt="" className="h-4 w-4" />
            Mon espace
          </Link>
          <SignOutButton />
        </div>
      </section>

      <header className="panel space-y-3 border-indigo-400/25 p-6 shadow-indigo-900/30">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-indigo-100">
              {session.user.role === "SCHOOL_ADMIN"
                ? "Espace admin"
                : session.user.role === "TEACHER"
                ? "Espace prof"
                : "Espace élève"}
            </p>
            <h1 className="text-3xl font-semibold text-white">Positions</h1>
            <p className="text-sm text-slate-200">
              Catalogue des positions avec filtres et détail. Visible selon tes droits.
            </p>
          </div>
          <div className="flex w-full justify-end md:w-auto">
            {canManage ? (
              <Link
                href="/teacher/positions/new"
                className="rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 px-3 py-2 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
              >
                Nouvelle position
              </Link>
            ) : null}
          </div>
        </div>
        <div className="flex w-full justify-end">
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
          ) : (
            <Link
              href="/app/student"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-normal text-white transition hover:border-cyan-400/70 hover:bg-white/10"
            >
              ← Retour accueil
            </Link>
          )}
        </div>
      </header>

      <section className="panel space-y-4 px-6 py-4 md:py-6">
        <FilterPanel
          storageKey="filters:positions"
          title="Filtres"
          activeCount={activeFilters}
          userKey={userKey}
        >
          {/* key force le rerender des inputs lorsque les filtres changent pour que “Réinitialiser” remette bien les valeurs par défaut. */}
          <form
            key={`filters-${typeFilter ?? "all"}-${levelFilter ?? "all"}-${q || "all"}`}
            className="mt-4 grid w-full gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-indigo-900/20 md:grid-cols-3 md:items-end"
            method="get"
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
                key={typeFilter ?? "all-types"}
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
                key={levelFilter ?? "all-levels"}
                name="level"
                defaultValue={levelFilter ?? ""}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              >
                <option value="">Tous niveaux</option>
                {Object.values(PositionLevel).map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {levelLabels[lvl]}
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
                href="/positions"
                className="rounded-full border border-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
              >
                Réinitialiser
              </Link>
            </div>
          </form>
        </FilterPanel>
        <div className="grid gap-4 md:grid-cols-3">
          {positions.map((p) => {
            const cover = p.media?.find((m) => m.kind === "PHOTO") ?? p.media?.[0];
            const premiumContent =
              Boolean(p.description) ||
              Boolean(p.tips) ||
              p.media?.some((m) => m.kind === "VIDEO");
            const hasVideo = p.media?.some((m) => m.kind === "VIDEO");
            const showPremiumBadge = premiumContent && isStudent && !isPremium;
            const canViewPremium = !isStudent || isPremium;
            const progress = progressMap.get(p.id);
            const progressText =
              progress?.masteryLevel && progressLabels[progress.masteryLevel]
                ? progressLabels[progress.masteryLevel]
                : progress?.learningStatus
                ? progressLabels[progress.learningStatus] ?? progress.learningStatus
                : null;
            const detailHref = `/positions/${p.id}?from=/positions?page=${currentPage}`;
            return (
              <Link
                key={p.id}
                href={detailHref}
                className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition hover:border-cyan-400/60 hover:bg-white/10"
              >
                {cover ? (
                  <SafeImage
                    src={cover.url}
                    alt={p.name}
                    width={480}
                    height={240}
                    className="h-40 w-full object-cover"
                    fallbackSrc={POSITION_PLACEHOLDER}
                  />
                ) : (
                  <SafeImage
                    src={POSITION_PLACEHOLDER}
                    alt={p.name}
                    width={480}
                    height={240}
                    className="h-40 w-full object-cover"
                    fallbackSrc={POSITION_PLACEHOLDER}
                  />
                )}
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <div className="flex items-center justify-between gap-2">
                    <p className="text-base font-semibold text-white">{p.name}</p>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-amber-100">
                      {levelLabels[p.levelRequired]}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {showPremiumBadge && (
                      <span className="inline-flex w-fit items-center gap-1 rounded-full border border-amber-300/60 bg-amber-500/25 px-2.5 py-1 text-[11px] font-semibold text-amber-50 shadow-inner shadow-amber-500/20">
                        🔒 Premium
                      </span>
                    )}
                    {hasVideo && (
                      <span className="inline-flex w-fit items-center gap-1 rounded-full border border-cyan-300/60 bg-cyan-500/25 px-2.5 py-1 text-[11px] font-semibold text-cyan-50 shadow-inner shadow-cyan-500/20">
                        🎥 Vidéo
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        progressText
                          ? progressBadgeClass[progress?.masteryLevel ?? progress?.learningStatus ?? "NOT_STARTED"] ??
                            "border border-white/15 bg-white/5 text-slate-200"
                          : "border border-white/10 bg-white/5 text-slate-200"
                      }`}
                    >
                      {progressText ? `Niveau élève : ${progressText}` : "Découverte"}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
                      Vu : {p._count?.progress ?? 0}
                    </span>
                  </div>
                  <p className="text-sm text-cyan-200">{typeLabels[p.type]}</p>
                  <p className="text-sm text-slate-300 line-clamp-2">
                    {canViewPremium
                      ? p.tips ?? p.description ?? "Aucun détail"
                      : "Détails réservés aux élèves premium."}
                  </p>
                  {showPremiumBadge && (
                    <div className="rounded-xl border border-amber-300/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-50">
                      <p className="font-semibold">Accès Premium requis</p>
                      <p className="text-amber-100/80">
                        Contenus détaillés (vidéos, tips) réservés aux élèves Premium.
                      </p>
                      <span className="mt-2 inline-flex w-fit items-center gap-1 rounded-full border border-amber-300/60 bg-amber-400/20 px-3 py-1 text-[11px] font-semibold text-amber-50">
                        Upgrade (placeholder)
                      </span>
                    </div>
                  )}
                  <div className="mt-auto flex items-center justify-between gap-2">
                    <p className="text-xs text-slate-400">
                      {p.grips ?? "Grip ?"}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
          {positions.length === 0 && (
            <p className="py-4 text-slate-200">Aucune position pour le moment.</p>
          )}
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-200">
          <span>
            Page {currentPage} / {totalPages} · {totalCount} positions
          </span>
          <div className="flex items-center gap-2">
            <Link
              href={`/positions?page=${Math.max(1, currentPage - 1)}${qs ? `&${qs}` : ""}`}
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
              href={`/positions?page=${Math.min(totalPages, currentPage + 1)}${qs ? `&${qs}` : ""}`}
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
