import { MediaKind, PositionLevel, PositionType, Prisma } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { SafeImage } from "@/components/SafeImage";
import { FoxPageHeader } from "@/components/FoxPageHeader";
import { authOptions } from "@/lib/auth";
import { isSeedPublicId, normalizeFolderedPublicId } from "@/lib/media";
import { generateSignedUrl } from "@/lib/cloudinary";
import { POSITION_PLACEHOLDER } from "@/lib/placeholders";
import { prisma } from "@/lib/prisma";
import { defaultHomeForRole } from "@/lib/rbac";
import { toggleFavoriteAction } from "../actions";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
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
  const isFromProgress = Boolean(safeFrom && safeFrom.startsWith("/student/progress"));
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
            OR: [
              { disciplineId: { in: disciplineFilters } },
              { discipline: { in: disciplineFilters, mode: Prisma.QueryMode.insensitive } },
            ],
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
  const disciplineRows = await prisma.discipline.findMany({
    select: { id: true, name: true, color: true },
    orderBy: { name: "asc" },
  });
  const disciplineNameById = new Map(disciplineRows.map((d) => [d.id, d.name]));

  const position = await prisma.position.findUnique({
    where: { id: awaitedParams.id },
    include: {
      media: true,
      createdBy: { select: { id: true, name: true, email: true, role: true } },
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

  const disciplineName = (position.disciplineId ? disciplineNameById.get(position.disciplineId) : null) ?? position.discipline ?? null;
  const cover = position.media.find((m) => m.kind === MediaKind.PHOTO) ?? position.media[0];
  const video = position.media.find((m) => m.kind === MediaKind.VIDEO);
  const normalizedVideoId =
    normalizeFolderedPublicId(video?.publicId, "poleapp/positions") ?? video?.publicId ?? null;
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? process.env.CLOUDINARY_CLOUD_NAME;
  const videoId = normalizedVideoId ? normalizedVideoId.split("/").pop() ?? normalizedVideoId : undefined;
  const isSeedVideo = isSeedPublicId(videoId);
  const videoSources = (() => {
    if (!normalizedVideoId || normalizedVideoId.length === 0) return [];
    const seedPublicId = isSeedVideo && videoId ? videoId : normalizedVideoId;
    const sources: { src: string; type?: string }[] = [];
    if (isSeedVideo && cloudName) {
      // Seed: public upload
      sources.push({
        src: `https://res.cloudinary.com/${cloudName}/video/upload/${seedPublicId}`,
        type: "video/mp4",
      });
      sources.push({
        src: `https://res.cloudinary.com/${cloudName}/video/upload/${seedPublicId}.mp4`,
        type: "video/mp4",
      });
      return sources;
    }
    // Uploads authentifiés : signed en priorité, fallback public si jamais
    const signed = generateSignedUrl({
      publicId: normalizedVideoId,
      resourceType: "video",
      deliveryType: "authenticated",
      expiresInSeconds: 3600,
    });
    if (signed) sources.push({ src: signed, type: "video/mp4" });
    if (cloudName) {
      sources.push({
        src: `https://res.cloudinary.com/${cloudName}/video/upload/${normalizedVideoId}`,
        type: "video/mp4",
      });
      sources.push({
        src: `https://res.cloudinary.com/${cloudName}/video/upload/${normalizedVideoId}.mp4`,
        type: "video/mp4",
      });
    }
    return sources;
  })();
  const videoPoster =
    (normalizedVideoId &&
      (isSeedVideo && cloudName
        ? `https://res.cloudinary.com/${cloudName}/video/upload/${videoId ?? normalizedVideoId}.jpg`
        : generateSignedUrl({
            publicId: normalizedVideoId,
            resourceType: "video",
            deliveryType: "authenticated",
            expiresInSeconds: 3600,
            format: "jpg",
          }) ??
          generateSignedUrl({
            publicId: normalizedVideoId,
            resourceType: "video",
            deliveryType: "upload",
            expiresInSeconds: 3600,
            format: "jpg",
          }) ??
          (cloudName ? `https://res.cloudinary.com/${cloudName}/video/upload/${normalizedVideoId}.jpg` : null))) ??
    (cover?.publicId && cloudName
      ? `https://res.cloudinary.com/${cloudName}/image/upload/${cover.publicId}`
      : null) ??
    POSITION_PLACEHOLDER;
  const isPremium = Boolean(session?.user?.isPremium);
  const isStudent = session?.user?.role === "STUDENT";
  const isTeacher = session?.user?.role === "TEACHER";
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

  const currentPath = `/positions/${position.id}${encodedFrom ? `?from=${encodedFrom}` : ""}`;
  const combos =
    (await prisma.preset.findMany({
      where: {
        positions: { some: { positionId: position.id } },
        ...(session.user.schoolId ? { schoolId: session.user.schoolId } : {}),
      },
      orderBy: [{ usageCount: "desc" }, { createdAt: "desc" }],
      take: 10,
      select: {
        id: true,
        title: true,
        description: true,
        discipline: true,
        imagePublicId: true,
        priceCredits: true,
        premiumRequired: true,
        createdBy: { select: { name: true, email: true } },
      },
    })) ?? [];
  const studentProgress = isStudent
    ? await prisma.studentPositionProgress.findUnique({
        where: { studentId_positionId: { studentId: session.user.id, positionId: position.id } },
        select: { learningStatus: true },
      })
    : null;
  const seenByCurrentUser = isStudent && studentProgress ? 1 : 0;
  const isFavorite = session.user.role === "STUDENT"
    ? Boolean(
        await prisma.studentFavoritePosition.findFirst({
          where: { studentId: session.user.id, positionId: position.id },
        })
      )
    : session.user.role === "TEACHER"
      ? Boolean(
          await prisma.teacherFavoritePosition.findFirst({
            where: { teacherId: session.user.id, positionId: position.id },
          })
        )
      : false;
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
            icon: <Image src="/house.svg" alt="" className="h-4 w-4" width={16} height={16} priority />,
          },
          ...(session?.user ? [{ label: "Déconnexion", href: "/api/auth/signout" }] : []),
        ]}
        foxHref="/"
      />
      <section className="panel p-4 md:p-6 lg:p-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 md:mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold leading-tight text-white md:text-4xl">{position.name}</h1>
            {(isStudent || isTeacher) && (
              <form action={toggleFavoriteAction}>
                <input type="hidden" name="positionId" value={position.id} />
                <input type="hidden" name="redirectTo" value={currentPath} />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-2 py-1 text-lg leading-none text-white transition hover:border-cyan-300/70 hover:bg-white/10"
                  aria-label={isFavorite ? "Retirer des coups de cœur" : "Ajouter aux coups de cœur"}
                  title={isFavorite ? "Retirer des coups de cœur" : "Ajouter aux coups de cœur"}
                >
                  {isFavorite ? "♥" : "♡"}
                </button>
              </form>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={
                prevPosition
                  ? `/positions/${prevPosition.id}${encodedFrom ? `?from=${encodedFrom}` : ""}`
                  : "#"
              }
              aria-disabled={!prevPosition}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                prevPosition
                  ? "border-white/10 bg-white/5 text-white hover:border-cyan-300/70 hover:bg-white/10"
                  : "cursor-not-allowed border-white/5 bg-white/5 text-slate-500"
              }`}
            >
              <span className="md:hidden" aria-hidden="true">
                ←
              </span>
              <span className="hidden md:inline">
                {prevPosition ? `← ${prevPosition.name}` : "←"}
              </span>
            </Link>
            <Link
              href="/positions"
              className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs font-semibold transition border-white/10 bg-white/5 text-white hover:border-cyan-300/70 hover:bg-white/10"
              title="Retour à la liste"
            >
              ↑
            </Link>
            <Link
              href={nextPosition ? `/positions/${nextPosition.id}${encodedFrom ? `?from=${encodedFrom}` : ""}` : "#"}
              aria-disabled={!nextPosition}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                nextPosition
                  ? "border-white/10 bg-white/5 text-white hover:border-cyan-300/70 hover:bg-white/10"
                  : "cursor-not-allowed border-white/5 bg-white/5 text-slate-500"
              }`}
            >
              <span className="md:hidden" aria-hidden="true">
                →
              </span>
              <span className="hidden md:inline">
                {nextPosition ? `${nextPosition.name} →` : "→"}
              </span>
            </Link>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-[1.35fr,1fr]">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
              <SafeImage
                publicId={cover?.publicId}
                src={POSITION_PLACEHOLDER}
                alt={position.name}
                width={960}
                height={400}
                className="aspect-[16/9] w-full object-cover"
                fallbackSrc={POSITION_PLACEHOLDER}
              />
            </div>

            {(video || showVideoPlaceholder) &&
              (canViewContent ? (
                video ? (
                  <div style={{ aspectRatio: "16 / 9" }}>
                    <video
                      controls
                      poster={videoPoster}
                      className="h-full w-full rounded-lg border border-white/10 bg-black object-contain"
                      preload="metadata"
                      playsInline
                    >
                      {videoSources.map((s, idx) => (
                        <source key={`${s.src}-${idx}`} src={s.src} type={s.type} />
                      ))}
                      Votre navigateur ne supporte pas la vidéo.
                    </video>
                  </div>
                ) : (
                  <div
                    className="flex items-center justify-center rounded-lg border border-white/10 bg-black/40 text-xs text-slate-200"
                    style={{ aspectRatio: "16 / 9" }}
                  >
                    Aucune vidéo fournie pour le moment. Un lien sera ajouté prochainement.
                  </div>
                )
              ) : (
                <div className="relative overflow-hidden rounded-lg border border-amber-400/40 bg-amber-500/10 text-xs text-amber-100" style={{ aspectRatio: "16 / 9" }}>
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-50">
                      Contenu Premium
                    </span>
                    <p className="text-center">
                      Débloque cette position via un cours ou passe en Premium pour accéder à la vidéo.
                    </p>
                  </div>
                </div>
              ))}
          </div>

          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-gradient-to-br from-indigo-500/10 via-white/5 to-cyan-500/10 p-2.5 shadow-inner shadow-black/20">
                <p className="text-[10px] uppercase tracking-[0.12em] text-slate-300">Discipline</p>
                <p className="text-sm font-semibold text-white">{disciplineName ?? "—"}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-gradient-to-br from-cyan-500/10 via-white/5 to-emerald-500/10 p-2.5 shadow-inner shadow-black/20">
                <p className="text-[10px] uppercase tracking-[0.12em] text-slate-300">Niveau requis</p>
                <p className="text-sm font-semibold text-white">{levelLabels[position.levelRequired]}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-gradient-to-br from-indigo-500/10 via-white/5 to-cyan-500/10 p-2.5 shadow-inner shadow-black/20">
                <p className="text-[10px] uppercase tracking-[0.12em] text-slate-300">Type</p>
                <p className="text-sm font-semibold text-white">{typeLabels[position.type]}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-gradient-to-br from-fuchsia-500/10 via-white/5 to-indigo-500/10 p-2.5 shadow-inner shadow-black/20">
                <p className="text-[10px] uppercase tracking-[0.12em] text-slate-300">Grips</p>
                <p className="text-sm font-semibold text-white">{position.grips ?? "Non précisé"}</p>
              </div>
            {position.createdBy ? (
              <div className="rounded-xl border border-white/10 bg-gradient-to-br from-amber-500/10 via-white/5 to-rose-500/10 p-2.5 shadow-inner shadow-black/20">
                <p className="text-[10px] uppercase tracking-[0.12em] text-slate-300">Créé par</p>
                {position.createdBy.id ? (
                  <Link
                    href={`/teachers/${position.createdBy.id}`}
                    className="text-sm font-semibold text-white underline-offset-2 hover:underline"
                  >
                    {position.createdBy.name ?? position.createdBy.email ?? "n/a"}
                  </Link>
                ) : (
                  <p className="text-sm font-semibold text-white">{position.createdBy.name ?? position.createdBy.email ?? "n/a"}</p>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 bg-gradient-to-br from-amber-500/10 via-white/5 to-rose-500/10 p-2.5 shadow-inner shadow-black/20">
                <p className="text-[10px] uppercase tracking-[0.12em] text-slate-300">Créé par</p>
                <p className="text-sm font-semibold text-white">—</p>
              </div>
            )}
            <div className="rounded-xl border border-white/10 bg-gradient-to-br from-slate-500/10 via-white/5 to-slate-500/10 p-2.5 shadow-inner shadow-black/20">
              <p className="text-[10px] uppercase tracking-[0.12em] text-slate-300">Vu</p>
              <p className="text-sm font-semibold text-white">
                {(() => {
                  const globalViews = position._count?.progress ?? 0;
                  return isStudent ? Math.max(seenByCurrentUser, globalViews) : globalViews;
                })()}
              </p>
            </div>
            </div>

            {canViewContent ? (
              <div className="space-y-4 text-slate-200">
                <div className="space-y-2">
                  <p className="text-sm text-cyan-200">Description</p>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-100">
                    {position.description ?? "Aucune description"}
                  </p>
                </div>
                {position.muscles.length > 0 && (
                  <div className="space-y-2">
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
                {position.contraindications && (
                  <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm font-semibold text-white">Contre-indications</p>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-100">
                      {position.contraindications}
                    </p>
                  </div>
                )}
                {position.tips && (
                  <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm font-semibold text-white">Conseils</p>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-100">{position.tips}</p>
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

            {combos.length > 0 && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Combos associés</p>
                    <p className="text-sm text-slate-300">Présélections contenant cette position.</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">
                    {combos.length} trouvé{combos.length > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="space-y-3">
                  {combos.map((combo) => {
                    const cost = combo.priceCredits ?? 0;
                    const premiumLocked = isStudent && combo.premiumRequired && !isPremium;
                    const alreadyBought = purchasedPresetIds.has(combo.id);
                    const href = `/presets/${combo.id}?from=${encodeURIComponent(`/positions/${position.id}`)}`;
                    return (
                      <Link
                        key={combo.id}
                        href={href}
                        className={`group flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200 shadow-inner shadow-indigo-900/10 transition hover:border-cyan-300/60 hover:bg-white/10 ${
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
                          <span />
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
              </div>
            )}

            {isStaff && (
              <div className="flex flex-wrap items-center justify-end gap-2">
                {isOwner ? (
                  <Link
                    href={`/teacher/positions/${position.id}/edit`}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:border-indigo-300/70 hover:bg-indigo-500/15"
                  >
                    <span aria-hidden>⚙️</span>
                    <span>Éditer</span>
                  </Link>
                ) : (
                  <p className="text-xs font-semibold text-slate-300">
                    Édition réservée au créateur ({position.createdBy?.name ?? position.createdBy?.email ?? "n/a"}).
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
