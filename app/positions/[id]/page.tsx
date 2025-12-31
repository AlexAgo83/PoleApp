import { MediaKind, PositionLevel, PositionType, Prisma } from "@prisma/client";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { SafeImage } from "@/components/SafeImage";
import { authOptions } from "@/lib/auth";
import { generateSignedUrl } from "@/lib/cloudinary";
import { POSITION_PLACEHOLDER } from "@/lib/placeholders";
import { prisma } from "@/lib/prisma";
import { defaultHomeForRole } from "@/lib/rbac";
import { FoxPageHeader } from "@/components/FoxPageHeader";

export const dynamic = "force-dynamic";

type Props = {
  params: { id: string };
  searchParams?: Promise<{
    from?: string;
  }>;
};

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

export default async function PositionDetailPage({ params, searchParams }: Props) {
  const awaitedParams = await params;
  if (!awaitedParams?.id) {
    notFound();
  }

  const awaitedSearch = searchParams ? await searchParams : undefined;
  const rawFrom = awaitedSearch?.from;
  const decodedFrom = rawFrom ? decodeURIComponent(rawFrom) : undefined;
  const safeFrom =
    decodedFrom && decodedFrom.startsWith("/") && !decodedFrom.startsWith("//") ? decodedFrom : undefined;
  const backHref = safeFrom ?? "/positions";
  const isFromPositionsList = Boolean(safeFrom && safeFrom.startsWith("/positions"));
  const isFromProgress = Boolean(safeFrom && safeFrom.startsWith("/app/student/progress"));
  const filtersFromList = (() => {
    if (!isFromPositionsList || !safeFrom) return null;
    const url = new URL(`http://localhost${safeFrom}`);
    const type = url.searchParams.get("type");
    const level = url.searchParams.get("level");
    const teacher = url.searchParams.get("teacher");
    const q = url.searchParams.get("q") ?? "";
    const discipline = url.searchParams.get("discipline") ?? "";

    const disciplineFilters =
      discipline
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean) ?? [];

    const where: Prisma.PositionWhereInput = {
      ...(type && Object.values(PositionType).includes(type as PositionType) ? { type: type as PositionType } : {}),
      ...(level && Object.values(PositionLevel).includes(level as PositionLevel)
        ? { levelRequired: level as PositionLevel }
        : {}),
      ...(teacher ? { createdByUserId: teacher } : {}),
      ...(q
        ? {
            name: { contains: q, mode: Prisma.QueryMode.insensitive },
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
    return { where };
  })();

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }
  const homeForRole = defaultHomeForRole(session?.user?.role);
  const progressFilters = (() => {
    if (!isFromProgress || !safeFrom) return null;
    const url = new URL(`http://localhost${safeFrom}`);
    const type = url.searchParams.get("type");
    const level = url.searchParams.get("level");
    const q = url.searchParams.get("q") ?? "";
    return {
      type: type && Object.values(PositionType).includes(type as PositionType) ? (type as PositionType) : undefined,
      level:
        level && Object.values(PositionLevel).includes(level as PositionLevel) ? (level as PositionLevel) : undefined,
      q,
    };
  })();
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

  const position = await prisma.position.findUnique({
    where: { id: awaitedParams.id },
    include: {
      media: true,
      createdBy: true,
      muscles: { include: { muscle: true } },
      _count: { select: { progress: true } },
    },
  });

  if (!position) {
    return (
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center gap-4 px-2 py-6 md:px-8 md:py-10">
        <div className="panel w-full max-w-xl p-6 text-center text-slate-200">
          <p>Position introuvable.</p>
          <Link
            href={backHref}
            className="mt-3 inline-flex items-center justify-center rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-400"
          >
            Retour à la liste
          </Link>
        </div>
      </main>
    );
  }

  const cover =
    position.media.find((m) => m.kind === MediaKind.PHOTO) ?? position.media[0];
  const video = position.media.find((m) => m.kind === MediaKind.VIDEO);
  const deliveryTypeForVideo: "upload" | "authenticated" =
    video?.url?.includes("/authenticated/") ? "authenticated" : "upload";
  const signedVideoUrl =
    video?.publicId && video.publicId.length > 0
      ? generateSignedUrl({
          publicId: video.publicId,
          resourceType: "video",
          deliveryType: deliveryTypeForVideo,
        })
      : null;
  const videoSrc = signedVideoUrl ?? video?.url ?? undefined;
  const videoPoster =
    signedVideoUrl && video?.publicId
      ? undefined
      : video?.url && video.url.includes("/upload/")
        ? video.url.replace("/upload/", "/upload/so_0/")
        : POSITION_PLACEHOLDER;
  const isPremium = Boolean(session?.user?.isPremium);
  const isStudent = session?.user?.role === "STUDENT";
  const hasUnlocked = isStudent
    ? Boolean(
        await prisma.studentPositionProgress.findFirst({
          where: {
            studentId: session.user.id,
            positionId: position.id,
            learningStatus: { not: "NOT_STARTED" },
          },
        }),
      )
    : false;
  const canViewContent = !isStudent || isPremium || hasUnlocked;
  const hasVideo = Boolean(video);
  const showVideoPlaceholder = isStudent && isPremium && !hasVideo;
  const isStaff =
    session?.user?.role === "TEACHER" || session?.user?.role === "SCHOOL_ADMIN";
  const isOwner =
    session?.user?.role === "SCHOOL_ADMIN" ||
    (session?.user?.role === "TEACHER" &&
      (!position.createdByUserId || position.createdByUserId === session?.user?.id));
  const progressEntries =
    isFromProgress && isStudent
      ? await prisma.studentPositionProgress.findMany({
          where: { studentId: session.user.id },
          select: { positionId: true },
        })
      : [];
  const progressIds = progressEntries.map((p) => p.positionId);
  const progressWhere: Prisma.PositionWhereInput | null =
    isFromProgress && isStudent
      ? {
          ...(session.user.isPremium ? {} : { id: { in: progressIds } }),
          ...(progressFilters?.type ? { type: progressFilters.type } : {}),
          ...(progressFilters?.level ? { levelRequired: progressFilters.level } : {}),
          ...(progressFilters?.q
            ? { name: { contains: progressFilters.q, mode: Prisma.QueryMode.insensitive } }
            : {}),
        }
      : null;
  const navList =
    filtersFromList && isFromPositionsList
      ? await prisma.position.findMany({
          where: filtersFromList.where,
          orderBy: { updatedAt: "desc" },
          select: { id: true, name: true },
        })
      : progressWhere
        ? await prisma.position.findMany({
            where: progressWhere,
            orderBy: { name: "asc" },
            select: { id: true, name: true },
          })
        : [];
  const currentIndex = navList.findIndex((p) => p.id === position.id);
  const prevPosition = currentIndex > 0 ? navList[currentIndex - 1] : null;
  const nextPosition = currentIndex >= 0 && currentIndex < navList.length - 1 ? navList[currentIndex + 1] : null;
  const encodedFrom = safeFrom ? encodeURIComponent(safeFrom) : undefined;

  const hasNav = (isFromPositionsList && navList.length > 0) || (isFromProgress && navList.length > 0);
  const navLabel = isFromPositionsList ? "liste filtrée" : isFromProgress ? "progression" : "positions";
  const combos =
    (await prisma.preset.findMany({
      where: {
        positions: { some: { positionId: position.id } },
        ...(session.user.schoolId ? { schoolId: session.user.schoolId } : {}),
      },
      include: { createdBy: { select: { name: true, email: true } } },
      orderBy: [{ usageCount: "desc" }, { createdAt: "desc" }],
      take: 10,
    })) ?? [];
  const purchasedPresetIds =
    isStudent && combos.length > 0
      ? new Set(
          (
            await prisma.purchase.findMany({
              where: { userId: session.user.id, kind: "PRESET", status: "PAID" },
              select: { offerId: true },
            })
          ).map((p) => p.offerId),
        )
      : new Set<string>();

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 px-2 pt-0 pb-2 md:gap-6 md:px-8 md:pt-0 md:pb-4">
      <FoxPageHeader
        eyebrow={
          session?.user?.role === "SCHOOL_ADMIN"
            ? "Espace admin"
            : session?.user?.role === "TEACHER"
              ? "Espace prof"
              : session?.user?.role === "STUDENT"
                ? "Espace élève"
                : "Accueil"
        }
        title="Positions"
        buttons={[
          {
            label: "Mon espace",
            href: homeForRole,
            icon: <img src="/house.svg" alt="" className="h-4 w-4" />,
          },
          ...(session?.user ? [{ label: "Déconnexion", href: "/api/auth/signout" }] : []),
        ]}
        foxHref="/"
      />
      <header className="panel flex flex-wrap items-center justify-between gap-4 p-4 md:p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">
            Position
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold text-white">{position.name}</h1>
            {position.discipline ? (
              <span
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold text-white"
                style={disciplineStyle(position.discipline)}
              >
                {position.discipline}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="panel space-y-4 p-6">
          {cover ? (
            <SafeImage
              src={cover.url}
              alt={position.name}
              width={960}
              height={400}
              className="w-full rounded-xl object-cover"
              fallbackSrc={POSITION_PLACEHOLDER}
            />
          ) : (
            <SafeImage
              src={POSITION_PLACEHOLDER}
              alt={position.name}
              width={960}
              height={400}
              className="w-full rounded-xl object-cover"
              fallbackSrc={POSITION_PLACEHOLDER}
            />
          )}
          {canViewContent ? (
            <div className="space-y-2 text-slate-200">
              <p className="text-sm text-cyan-200">Description</p>
              <p className="text-sm text-slate-100">
                {position.description ?? "Aucune description"}
              </p>
              {position.muscles.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm text-cyan-200">Muscles / articulations sollicités</p>
                  <div className="flex flex-wrap gap-2">
                    {position.muscles.map((m) => (
                      <span
                        key={m.muscleId}
                        className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[12px] text-slate-100"
                      >
                        {m.muscle.name}
                        {m.muscle.kind ? (
                          <span className="ml-1 text-[10px] uppercase tracking-[0.08em] text-slate-400">
                            {m.muscle.kind.toLowerCase()}
                          </span>
                        ) : null}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {position.tips && (
                <div>
                  <p className="text-sm text-cyan-200">Conseils</p>
                  <p className="text-sm text-slate-100">{position.tips}</p>
                </div>
              )}
              {position.contraindications && (
                <div>
                  <p className="text-sm text-cyan-200">Contre-indications</p>
                  <p className="text-sm text-slate-100">
                    {position.contraindications}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-100">
              <p className="font-semibold text-white">Contenu Premium</p>
              <p className="mt-1">
                Description, conseils et vidéo sont réservés aux élèves premium.
              </p>
            </div>
          )}
        </div>
        <aside className="panel space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {position.discipline ? (
              <span
                className="rounded-full border px-3 py-1 text-[11px] font-semibold text-white"
                style={disciplineStyle(position.discipline)}
              >
                {position.discipline}
              </span>
            ) : (
              <span />
            )}
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-slate-200">
              Vu : {position._count?.progress ?? 0}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-gradient-to-br from-indigo-500/10 via-white/5 to-cyan-500/10 p-4 shadow-inner shadow-black/20">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-300">Type</p>
              <p className="text-lg font-semibold text-white">{typeLabels[position.type]}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-gradient-to-br from-cyan-500/10 via-white/5 to-emerald-500/10 p-4 shadow-inner shadow-black/20">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-300">Niveau requis</p>
              <p className="text-lg font-semibold text-white">{levelLabels[position.levelRequired]}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-gradient-to-br from-fuchsia-500/10 via-white/5 to-indigo-500/10 p-4 shadow-inner shadow-black/20">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-300">Grips</p>
              <p className="text-lg font-semibold text-white">{position.grips ?? "Non précisé"}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-gradient-to-br from-amber-500/10 via-white/5 to-rose-500/10 p-4 shadow-inner shadow-black/20">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-300">Créé par</p>
              <p className="text-lg font-semibold text-white">{position.createdBy?.name ?? "Seed"}</p>
            </div>
          </div>
          {(video || showVideoPlaceholder) && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-white">Vidéo</p>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-cyan-400/40 bg-cyan-500/15 px-2 py-0.5 text-[11px] font-semibold text-cyan-50">
                    🎥 Vidéo
                  </span>
                  {isStudent && !canViewContent && (
                    <span className="rounded-full border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-50">
                      🔒 Premium
                    </span>
                  )}
                </div>
              </div>
              {canViewContent ? (
                video ? (
                  <div
                    className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-black/30"
                    style={{ aspectRatio: "16 / 9" }}
                  >
                    <video
                      controls
                      poster={videoPoster}
                      className="h-full w-full bg-black object-contain"
                      src={videoSrc}
                    >
                      Votre navigateur ne supporte pas la vidéo.
                    </video>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-slate-200">
                    Aucune vidéo fournie pour le moment. Un lien sera ajouté prochainement.
                  </p>
                )
              ) : (
                <p className="mt-2 text-xs text-amber-100">
                  Débloque cette position via un cours ou passe en Premium pour accéder à la vidéo.
                </p>
              )}
            </div>
          )}
          {isStudent && !isPremium && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
              <p className="font-semibold text-white">Gating élève</p>
              <p className="mt-2">
                Élève gratuit : accès aux positions “débloquées” via cours.
              </p>
              <p className="mt-2">
                Élève premium : accès complet.
                <br />
                Statut actuel :{" "}
                <span className="font-semibold">
                  {isPremium ? "Premium" : hasUnlocked ? "Gratuit (débloqué)" : "Gratuit / non débloqué"}
                </span>
              </p>
            </div>
          )}
          {isStaff && (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {isOwner ? (
                <Link
                  href={`/teacher/positions/${position.id}/edit`}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-indigo-300/70 hover:bg-indigo-500/15"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/gear.svg" alt="" className="h-4 w-4" />
                  Éditer
                </Link>
              ) : (
                <p className="text-xs font-semibold text-slate-300">
                  Édition réservée au créateur ({position.createdBy?.name ?? position.createdBy?.email ?? "n/a"}).
                </p>
              )}
            </div>
          )}
        </aside>
      </section>
      <section className="panel space-y-4 border-indigo-400/20 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Combos associés</p>
            <h2 className="text-xl font-semibold text-white">Présélections / combos contenant cette position</h2>
            <p className="text-sm text-slate-300">Jusqu’à 10 combos/presets liés, filtrés sur ton école.</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">
            {combos.length} trouvé{combos.length > 1 ? "s" : ""}
          </span>
        </div>
        {combos.length === 0 ? (
          <p className="text-sm text-slate-300">Aucun combo associé pour le moment.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {combos.map((combo) => {
              const cost = combo.priceCredits ?? 0;
              const premiumLocked = isStudent && combo.premiumRequired && !isPremium;
              const alreadyBought = purchasedPresetIds.has(combo.id);
              const href =
                premiumLocked && isStudent
                  ? `/app/student/premium?from=${encodeURIComponent(`/positions/${position.id}`)}`
                  : `/presets?highlight=${combo.id}`;
              return (
                <Link
                  key={combo.id}
                  href={href}
                  className={`group flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200 shadow-inner shadow-indigo-900/10 transition hover:border-cyan-300/60 hover:bg-white/10 ${
                    premiumLocked ? "opacity-80" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-white">
                      {combo.discipline ? (
                        <span className="rounded-full border border-indigo-300/60 bg-indigo-500/15 px-2 py-0.5">
                          {combo.discipline}
                        </span>
                      ) : null}
                      {combo.premiumRequired ? (
                        <span className="rounded-full border border-amber-300/60 bg-amber-500/15 px-2 py-0.5">
                          Premium
                        </span>
                      ) : cost > 0 ? (
                        <span className="rounded-full border border-cyan-300/60 bg-cyan-500/15 px-2 py-0.5">
                          {cost} crédits
                        </span>
                      ) : (
                        <span className="rounded-full border border-emerald-300/60 bg-emerald-500/15 px-2 py-0.5">
                          Gratuit
                        </span>
                      )}
                      {combo.createdBy ? (
                        <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-xs text-slate-200">
                          {combo.createdBy.name ?? combo.createdBy.email}
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[11px] font-semibold text-slate-300">
                      {combo.usageCount} vue{combo.usageCount > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg font-semibold text-white">{combo.title}</p>
                    <p className="text-sm text-slate-300 line-clamp-2">
                      {combo.description || "Combo sans description"}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-200">
                    <div className="flex flex-wrap items-center gap-2">
                      {premiumLocked ? (
                        <span className="rounded-full border border-amber-400/60 bg-amber-500/15 px-2 py-0.5 text-amber-50">
                          🔒 Premium requis
                        </span>
                      ) : alreadyBought ? (
                        <span className="rounded-full border border-emerald-400/60 bg-emerald-500/15 px-2 py-0.5 text-emerald-50">
                          Déjà acheté
                        </span>
                      ) : (
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-slate-200 group-hover:border-cyan-400/60">
                          Voir le combo
                        </span>
                      )}
                    </div>
                    {combo.priceCredits && combo.priceCredits > 0 ? (
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-200">
                        {combo.priceCredits} crédits
                      </span>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
      {hasNav && (
        <nav className="panel flex flex-wrap items-center justify-between gap-3 p-4 md:p-5">
          <div className="flex flex-col">
            <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Navigation</p>
            <p className="text-sm text-slate-200">Parcourir la {navLabel}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={
                prevPosition
                  ? `/positions/${prevPosition.id}${encodedFrom ? `?from=${encodedFrom}` : ""}`
                  : "#"
              }
              aria-disabled={!prevPosition}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                prevPosition
                  ? "border-white/10 bg-white/5 text-white hover:border-cyan-300/70 hover:bg-white/10"
                  : "cursor-not-allowed border-white/5 bg-white/5 text-slate-500"
              }`}
            >
              ←
              {prevPosition ? <span className="text-xs text-slate-300">({prevPosition.name})</span> : null}
            </Link>
            <Link
              href={nextPosition ? `/positions/${nextPosition.id}${encodedFrom ? `?from=${encodedFrom}` : ""}` : "#"}
              aria-disabled={!nextPosition}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                nextPosition
                  ? "border-white/10 bg-white/5 text-white hover:border-cyan-300/70 hover:bg-white/10"
                  : "cursor-not-allowed border-white/5 bg-white/5 text-slate-500"
              }`}
            >
              →
              {nextPosition ? <span className="text-xs text-slate-300">({nextPosition.name})</span> : null}
            </Link>
          </div>
        </nav>
      )}
    </main>
  );
}
