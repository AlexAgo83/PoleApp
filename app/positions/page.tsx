import { PositionLevel, PositionType, Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";

import { FilterPanel } from "@/components/FilterPanel";
import { PremiumUpsellButton } from "@/components/PremiumUpsellButton";
import { SafeImage } from "@/components/SafeImage";
import { BuyCreditsButton } from "@/app/app/student/BuyCreditsButton";
import { authOptions } from "@/lib/auth";
import { POSITION_PLACEHOLDER } from "@/lib/placeholders";
import { prisma } from "@/lib/prisma";
import { defaultHomeForRole } from "@/lib/rbac";
import { FoxPageHeader } from "@/components/FoxPageHeader";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 12;

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
  NOT_STARTED: "Nouveauté",
  IN_PROGRESS: "Initié",
  PASSED: "Passé",
  MASTERED: "Fluide chorégraphié",
  NOVELTY: "Nouveauté",
  INITIATED: "Initié",
  FLUID_CHOREO: "Fluide chorégraphié",
};

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

type SearchParams =
  | { page?: string; type?: string; level?: string; q?: string; teacher?: string; discipline?: string }
  | Promise<{
      page?: string;
      type?: string;
      level?: string;
      q?: string;
      teacher?: string;
      discipline?: string;
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
  const disciplineFilters =
    resolvedParams.discipline
      ?.toString()
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean) ?? [];
  const q = resolvedParams.q?.toString().trim() || "";
  const teacherFilter = resolvedParams.teacher?.toString().trim() || "";
  const activeFilters = [
    typeFilter,
    levelFilter,
    q && q.length > 0,
    teacherFilter && teacherFilter.length > 0,
    disciplineFilters.length > 0,
  ].filter(Boolean).length;

  const where: Prisma.PositionWhereInput = {
    ...(typeFilter ? { type: typeFilter } : {}),
    ...(levelFilter ? { levelRequired: levelFilter } : {}),
    ...(q
      ? {
          name: { contains: q, mode: Prisma.QueryMode.insensitive },
        }
      : {}),
    ...(teacherFilter
      ? {
          createdByUserId: teacherFilter,
        }
      : {}),
    ...(disciplineFilters.length
      ? {
          OR: disciplineFilters.map((d) => ({
            discipline: { contains: d, mode: Prisma.QueryMode.insensitive },
          })),
        }
      : {}),
  };

  const totalCount = await prisma.position.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, rawPage || 1), totalPages);
  const skip = (currentPage - 1) * PAGE_SIZE;

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }
  const userKey = session.user.id ?? "anon";
  const homeForRole = defaultHomeForRole(session.user.role);
  const isStudent = session.user.role === "STUDENT";
  const isPremium = Boolean(session.user.isPremium);
  const studentCredits = isStudent
    ? (await prisma.user.findUnique({ where: { id: session.user.id }, select: { credits: true } }))?.credits ?? 0
    : 0;
  const [packOffers, subscriptionOffers] = isStudent
    ? await Promise.all([
        prisma.creditPackOffer.findMany({ where: { isActive: true, isOpen: true }, orderBy: { sortOrder: "asc" } }),
        prisma.subscriptionOffer.findMany({ where: { isActive: true, isOpen: true }, orderBy: { sortOrder: "asc" } }),
      ])
    : [[], []];
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
  const queryParams = new URLSearchParams();
  if (typeFilter) queryParams.set("type", typeFilter);
  if (levelFilter) queryParams.set("level", levelFilter);
  if (q) queryParams.set("q", q);
  if (teacherFilter) queryParams.set("teacher", teacherFilter);
  if (disciplineFilters.length) queryParams.set("discipline", disciplineFilters.join(","));
  const qs = queryParams.toString();
  const creatorOptions = await prisma.user.findMany({
    where: {
      role: "TEACHER",
      createdPositions: { some: {} },
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
  const positions = await prisma.position.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    skip,
    take: PAGE_SIZE,
    include: {
      media: true,
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { progress: true } },
    },
  });
  const disciplineOptionsRaw = await prisma.position.findMany({
    select: { discipline: true },
    distinct: ["discipline"],
    orderBy: { discipline: "asc" },
  });
  const disciplineOptions = disciplineOptionsRaw.reduce<{ discipline: string }[]>((acc, row) => {
    const name = row.discipline?.trim();
    if (!name) return acc;
    const key = name.toLowerCase();
    if (key === "danse") return acc;
    if (!acc.some((d) => d.discipline.toLowerCase() === key)) {
      acc.push({ discipline: name });
    }
    return acc;
  }, []);
  const studentProgress = isStudent
    ? await prisma.studentPositionProgress.findMany({
        where: { studentId: session.user.id },
        select: { positionId: true, learningStatus: true },
      })
    : [];
  const progressMap = new Map(studentProgress.map((p) => [p.positionId, p]));
  const progressBadgeClass: Record<string, string> = {
    NOT_STARTED: "border-[#2563eb] bg-[#2563eb] text-white",
    IN_PROGRESS: "border-[#f59e0b] bg-[#f59e0b] text-white",
    PASSED: "border-[#10b981] bg-[#10b981] text-white",
    MASTERED: "border-[#7c3aed] bg-[#7c3aed] text-white",
    NOVELTY: "border-[#2563eb] bg-[#2563eb] text-white",
    INITIATED: "border-[#2563eb] bg-[#2563eb] text-white",
    FLUID_CHOREO: "border-[#7c3aed] bg-[#7c3aed] text-white",
  };
  const canManage = session.user.role === "TEACHER" || session.user.role === "SCHOOL_ADMIN";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-3 px-2 pt-0 pb-2 md:gap-6 md:px-8 md:pt-0 md:pb-4">
      <FoxPageHeader
        eyebrow={
          session.user.role === "SCHOOL_ADMIN"
            ? "Espace admin"
            : session.user.role === "TEACHER"
              ? "Espace prof"
              : "Espace élève"
        }
        title="Positions"
        buttons={[
          {
            label: "Mon espace",
            href: homeForRole,
            icon: <img src="/house.svg" alt="" className="h-4 w-4" />,
          },
          { label: "Déconnexion", href: "/api/auth/signout" },
        ]}
        foxHref="/"
      />

      <section className="panel relative space-y-4 border-indigo-400/25 p-4 shadow-indigo-900/30 md:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Positions</h2>
          <div className="flex flex-wrap justify-end gap-2 md:gap-3">
            <Link
              href="/presets"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-normal text-white transition hover:border-cyan-400/70 hover:bg-white/10"
            >
              Combos
            </Link>
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

        {isStudent && (
          <div className="hidden" aria-hidden="true">
            <BuyCreditsButton currentCredits={studentCredits} showUpgrade packs={packOffers} subscriptions={subscriptionOffers} />
          </div>
        )}

        <FilterPanel
          storageKey="filters:positions"
          title="Filtres"
          activeCount={activeFilters}
          userKey={userKey}
        >
          {/* key force le rerender des inputs lorsque les filtres changent pour que “Réinitialiser” remette bien les valeurs par défaut. */}
          <form
            key={`filters-${typeFilter ?? "all"}-${levelFilter ?? "all"}-${teacherFilter || "all"}-${disciplineFilters.join("|") || "all"}-${q || "all"}`}
            className="mt-4 grid w-full gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-indigo-900/20 md:grid-cols-5 md:items-end"
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
            <fieldset className="text-sm text-slate-200">
              <legend className="mb-1">Disciplines</legend>
              <div className="rounded-lg border border-white/10 bg-white/10 px-3 py-2">
                <div className="flex flex-wrap gap-2">
                  {disciplineOptions.slice(0, 8).map((d) => {
                    const value = d.discipline ?? "";
                    if (!value) return null;
                    const checked = disciplineFilters.includes(value);
                    return (
                      <label
                        key={value}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200"
                      >
                        <input
                          type="checkbox"
                          name="discipline"
                          value={value}
                          defaultChecked={checked}
                          className="peer sr-only"
                        />
                        <span className="peer-checked:text-white peer-checked:border-cyan-300/70 peer-checked:bg-cyan-500/20 peer-checked:px-3 peer-checked:py-1 peer-checked:rounded-full peer-checked:border">
                          {value}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </fieldset>
            <label className="text-sm text-slate-200">
              Professeur (créateur)
              <select
                key={teacherFilter || "all-teachers"}
                name="teacher"
                defaultValue={teacherFilter}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              >
                <option value="">Tous les profs</option>
                {creatorOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name ?? t.email}
                  </option>
                ))}
              </select>
            </label>
            <div className="md:col-span-5 flex flex-wrap items-center justify-end gap-2">
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
              progress?.learningStatus
                ? statusLabels[progress.learningStatus]
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
                <div className="relative">
                  {cover ? (
                    <SafeImage
                      src={cover.url}
                      alt={p.name}
                      width={480}
                      height={360}
                      className="aspect-[4/3] w-full object-cover"
                      fallbackSrc={POSITION_PLACEHOLDER}
                    />
                  ) : (
                    <SafeImage
                      src={POSITION_PLACEHOLDER}
                      alt={p.name}
                      width={480}
                      height={360}
                      className="aspect-[4/3] w-full object-cover"
                      fallbackSrc={POSITION_PLACEHOLDER}
                    />
                  )}
                  {p.discipline ? (
                    <span
                      className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur"
                      style={disciplineStyle(p.discipline)}
                    >
                      {p.discipline}
                    </span>
                  ) : null}
                  <div className="absolute inset-3 flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-2">
                      {p.discipline ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur"
                          style={disciplineStyle(p.discipline)}
                        >
                          {p.discipline}
                        </span>
                      ) : (
                        <span />
                      )}
                      {hasVideo ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-cyan-300/60 bg-cyan-500/25 px-2.5 py-1 text-[11px] font-semibold text-cyan-50 shadow-inner shadow-cyan-500/20">
                          🎥 Vidéo
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-end justify-between gap-3">
                      <div className="flex flex-col items-start gap-2">
                        {progressText ? (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              progressBadgeClass[progress?.learningStatus ?? "NOT_STARTED"] ??
                              "border border-white/15 bg-black/50 text-slate-200"
                            }`}
                          >
                            Niveau élève : {progressText}
                          </span>
                        ) : null}
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/50 px-2.5 py-1 text-[11px] font-semibold text-white">
                          {levelLabels[p.levelRequired]}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/50 px-2.5 py-1 text-[11px] font-semibold text-slate-50">
                          Vu : {p._count?.progress ?? 0}
                        </span>
                        {showPremiumBadge ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/60 bg-amber-500/25 px-2.5 py-1 text-[11px] font-semibold text-amber-50 shadow-inner shadow-amber-500/20">
                            🔒 Premium
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-lg font-semibold text-white">{p.name}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2" />
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm text-cyan-200">{typeLabels[p.type]}</p>
                    </div>
                    {canViewPremium && (p.tips || p.description) ? (
                      <p className="text-sm text-slate-300 line-clamp-2">
                        {p.tips ?? p.description ?? "Aucun détail"}
                      </p>
                    ) : null}
                    {showPremiumBadge && (
                      <div className="rounded-xl border border-amber-300/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-50">
                        <p className="font-semibold">Accès Premium requis</p>
                        <p className="text-amber-100/80">
                          Contenus détaillés (vidéos, tips) réservés aux élèves Premium.
                        </p>
                        <div className="mt-3 flex justify-end">
                          <PremiumUpsellButton className="inline-flex w-fit items-center gap-1 rounded-full border border-amber-300/60 bg-amber-400/20 px-3 py-1 text-[11px] font-semibold text-amber-50">
                            Devenir premium
                          </PremiumUpsellButton>
                        </div>
                      </div>
                    )}
                    <div className="mt-auto flex items-center justify-between gap-2">
                      <p className="text-xs text-slate-400">{p.grips ?? "Grip ?"}</p>
                      {p.createdBy ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
                          Créé par {p.createdBy.name ?? p.createdBy.email}
                        </span>
                      ) : null}
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
