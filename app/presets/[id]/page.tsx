"use server";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { SafeImage } from "@/components/SafeImage";
import { FoxPageHeader } from "@/components/FoxPageHeader";
import { authOptions } from "@/lib/auth";
import { generateSignedUrl } from "@/lib/cloudinary";
import { isSeedPublicId, normalizeFolderedPublicId } from "@/lib/media";
import { prisma } from "@/lib/prisma";
import { PremiumUpsellButton } from "@/components/PremiumUpsellButton";
import { buyPresetAction } from "@/app/student/actions";
import { BuyCreditsButton } from "@/app/student/BuyCreditsButton";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ from?: string }>;
};

const PRICE_LABEL = (priceCredits: number | null, premiumRequired: boolean) => {
  if (premiumRequired) return "Premium";
  if (priceCredits && priceCredits > 0) return `${priceCredits} crédits`;
  return "Gratuit";
};

export default async function PresetDetailPublicPage({ params, searchParams }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["STUDENT", "TEACHER", "SCHOOL_ADMIN"].includes(session.user.role)) {
    redirect("/login");
  }
  const canEdit = session.user.role === "TEACHER" || session.user.role === "SCHOOL_ADMIN";
  const awaitedParams = await params;
  if (!awaitedParams?.id) notFound();

  const awaitedSearch = searchParams ? await searchParams : undefined;
  const rawFrom = awaitedSearch?.from;
  const decodedFrom = rawFrom ? decodeURIComponent(rawFrom) : undefined;
  const safeFrom = decodedFrom && decodedFrom.startsWith("/") && !decodedFrom.startsWith("//") ? decodedFrom : "/presets";

  const preset = await prisma.preset.findUnique({
    where: { id: awaitedParams.id },
    include: {
      positions: {
        include: { position: { select: { name: true, discipline: true } } },
        orderBy: { order: "asc" },
      },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
  if (!preset) notFound();

  const normalizedVideoId =
    normalizeFolderedPublicId(preset.videoPublicId, "poleapp/presets") ?? preset.videoPublicId ?? null;
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? process.env.CLOUDINARY_CLOUD_NAME;
  const videoId = normalizedVideoId ? normalizedVideoId.split("/").pop() ?? normalizedVideoId : undefined;
  const isSeedVideo = isSeedPublicId(videoId);
  const videoSources = (() => {
    if (!normalizedVideoId || normalizedVideoId.length === 0) return [];
    const seedPublicId = isSeedVideo && videoId ? videoId : normalizedVideoId;
    const sources: { src: string; type?: string }[] = [];
    if (isSeedVideo && cloudName) {
      sources.push({ src: `https://res.cloudinary.com/${cloudName}/video/upload/${seedPublicId}`, type: "video/mp4" });
      sources.push({ src: `https://res.cloudinary.com/${cloudName}/video/upload/${seedPublicId}.mp4`, type: "video/mp4" });
      return sources;
    }
    const signed = generateSignedUrl({
      publicId: normalizedVideoId,
      resourceType: "video",
      deliveryType: "authenticated",
      expiresInSeconds: 3600,
    });
    if (signed) sources.push({ src: signed, type: "video/mp4" });
    if (cloudName) {
      sources.push({ src: `https://res.cloudinary.com/${cloudName}/video/upload/${normalizedVideoId}`, type: "video/mp4" });
      sources.push({ src: `https://res.cloudinary.com/${cloudName}/video/upload/${normalizedVideoId}.mp4`, type: "video/mp4" });
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
    (preset.imagePublicId && cloudName
      ? `https://res.cloudinary.com/${cloudName}/image/upload/${preset.imagePublicId}`
      : null);

  const priceLabel = PRICE_LABEL(preset.priceCredits, preset.premiumRequired ?? false);
  const isStudent = session?.user?.role === "STUDENT";
  const [packOffers, subscriptionOffers, studentCredits] = isStudent
    ? await Promise.all([
        prisma.creditPackOffer.findMany({ where: { isActive: true, isOpen: true }, orderBy: { sortOrder: "asc" } }),
        prisma.subscriptionOffer.findMany({ where: { isActive: true, isOpen: true }, orderBy: { sortOrder: "asc" } }),
        prisma.user.findUnique({ where: { id: session.user.id }, select: { credits: true } }),
      ])
    : [[], [], { credits: 0 }];
  const hasPurchase = isStudent
    ? Boolean(
        await prisma.purchase.findFirst({
          where: { userId: session.user.id, offerId: preset.id, kind: "PRESET", status: "PAID" },
        })
      )
    : false;
  const isFree = (preset.priceCredits ?? 0) <= 0;
  const isAdmin = session?.user?.role === "SCHOOL_ADMIN";
  const isTeacher = session?.user?.role === "TEACHER";
  const canViewContent = isAdmin || isTeacher || ((!isStudent && !preset.premiumRequired && isFree) || hasPurchase);
  const videoLockedText = preset.premiumRequired
    ? "Contenu réservé aux élèves premium et aux achats validés."
    : "Achetez ce preset pour débloquer la vidéo.";
  const descriptionLockedText = preset.premiumRequired
    ? "Contenu réservé aux élèves premium et aux achats validés."
    : "Achetez ce preset pour débloquer les explications.";
  const timelineLockedText = preset.premiumRequired
    ? "Contenu réservé aux élèves premium et aux achats validés."
    : "Achetez ce preset pour débloquer la timeline de la vidéo.";
  const price = preset.priceCredits ?? 0;
  const showPremiumCta = isStudent && preset.premiumRequired && !hasPurchase && !session.user.isPremium;
  const showBuyCta =
    isStudent &&
    !hasPurchase &&
    price > 0 &&
    (
      (!preset.premiumRequired) ||
      (preset.premiumRequired && session.user.isPremium)
    );

  const formatTime = (seconds: number | null | undefined) => {
    if (seconds === null || seconds === undefined) return "";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 px-2 pt-0 pb-2 md:gap-6 md:px-8 md:pt-0 md:pb-4">
      <FoxPageHeader
        eyebrow={
          session.user.role === "SCHOOL_ADMIN"
            ? "Espace admin"
            : session.user.role === "TEACHER"
              ? "Espace prof"
              : "Espace élève"
        }
        title="Presets & combos"
        buttons={[
          {
            label: "Retour",
            href: safeFrom,
          },
          {
            label: "↑",
            href: "/presets",
          },
        ]}
      />
      {isStudent ? (
        <div className="hidden">
          <BuyCreditsButton
            currentCredits={studentCredits?.credits ?? 0}
            showUpgrade={!session.user.isPremium}
            packs={packOffers as any}
            subscriptions={subscriptionOffers as any}
          />
        </div>
      ) : null}

      <section className="panel panel-body lg-gap border-indigo-400/25 p-4 shadow-indigo-900/30 md:p-6 lg:p-8">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-white md:text-3xl">{preset.title}</h1>
              {canEdit && (session.user.role === "SCHOOL_ADMIN" || session.user.id === preset.createdBy?.id) ? (
                <Link
                  href={`/presets/${preset.id}/edit`}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
                >
                  <span aria-hidden>⚙️</span>
                  <span>Éditer</span>
                </Link>
              ) : null}
            </div>
            <Link
              href="/presets"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:border-cyan-300/70 hover:bg-white/10"
              title="Retour à la liste des presets"
            >
              ↑
            </Link>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-[1.35fr,1fr]">
          <div className="space-y-4">
            {preset.imagePublicId ? (
              <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
                <SafeImage
                  publicId={preset.imagePublicId}
                  alt={preset.title}
                  width={960}
                  height={400}
                  quality={65}
                  className="aspect-[16/9] w-full object-cover"
                />
              </div>
            ) : null}
            {canViewContent ? (
              videoSources.length > 0 ? (
                <div style={{ aspectRatio: "16 / 9" }}>
                  <video
                    controls
                    poster={videoPoster ?? undefined}
                    className="h-full w-full rounded-lg border border-white/10 bg-black object-contain"
                    preload="metadata"
                    playsInline
                  >
                    {videoSources.map((src, idx) => (
                      <source key={`${src.src}-${idx}`} src={src.src} type={src.type ?? "video/mp4"} />
                    ))}
                    Votre navigateur ne supporte pas la vidéo.
                  </video>
                </div>
              ) : null
            ) : (
              <div
                className="relative overflow-hidden rounded-lg border border-amber-400/40 bg-amber-500/10 text-xs text-amber-100"
                style={{ aspectRatio: "16 / 9" }}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-50">Contenu verrouillé</span>
                  <p className="text-center">{videoLockedText}</p>
                  {showPremiumCta || showBuyCta ? (
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {showPremiumCta ? (
                        <PremiumUpsellButton className="rounded-full border border-amber-300/70 bg-amber-500/20 px-3 py-1.5 text-sm font-semibold text-amber-50 transition hover:border-amber-200 hover:bg-amber-500/30">
                          Passer premium
                        </PremiumUpsellButton>
                      ) : null}
                      {showBuyCta ? (
                        <form action={buyPresetAction} className="flex flex-wrap items-center gap-2">
                          <input type="hidden" name="presetId" value={preset.id} />
                          <button
                            type="submit"
                            className="rounded-full border border-cyan-300/70 bg-cyan-500/20 px-3 py-1.5 text-sm font-semibold text-white transition hover:border-cyan-200 hover:bg-cyan-500/30"
                          >
                            Acheter ({preset.priceCredits} crédits)
                          </button>
                        </form>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-gradient-to-br from-indigo-500/10 via-white/5 to-cyan-500/10 p-2.5 shadow-inner shadow-black/20">
                <p className="text-[10px] uppercase tracking-[0.12em] text-slate-300">Discipline</p>
                <p className="text-sm font-semibold text-white">{preset.discipline ?? "Non renseignée"}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-gradient-to-br from-cyan-500/10 via-white/5 to-emerald-500/10 p-2.5 shadow-inner shadow-black/20">
                <p className="text-[10px] uppercase tracking-[0.12em] text-slate-300">Tarification</p>
                <p className="text-sm font-semibold text-white">{priceLabel}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-gradient-to-br from-indigo-500/10 via-white/5 to-cyan-500/10 p-2.5 shadow-inner shadow-black/20">
                <p className="text-[10px] uppercase tracking-[0.12em] text-slate-300">Positions liées</p>
                <p className="text-sm font-semibold text-white">{preset.positions.length}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-gradient-to-br from-amber-500/10 via-white/5 to-rose-500/10 p-2.5 shadow-inner shadow-black/20">
                <p className="text-[10px] uppercase tracking-[0.12em] text-slate-300">Créé par</p>
                {preset.createdBy?.id ? (
                  <Link
                    href={`/teachers/${preset.createdBy.id}`}
                    className="text-sm font-semibold text-white underline-offset-2 hover:underline"
                  >
                    {preset.createdBy.name ?? preset.createdBy.email ?? "Inconnu"}
                  </Link>
                ) : (
                  <p className="text-sm font-semibold text-white">{preset.createdBy?.name ?? preset.createdBy?.email ?? "Inconnu"}</p>
                )}
              </div>
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <p className="text-sm text-cyan-200">Description</p>
                {canViewContent ? (
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-100">
                    {preset.description || "Pas de description"}
                  </p>
                ) : (
                  <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-sm text-amber-100">
                    <p className="font-semibold text-white">Contenu verrouillé</p>
                    <p className="mt-1">{descriptionLockedText}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm text-cyan-200">Timeline</p>
                {canViewContent ? (
                  preset.positions.length > 0 ? (
                    <div className="space-y-2">
                      {preset.positions.map((pp) => (
                        <Link
                          key={pp.positionId}
                          href={`/positions/${pp.positionId}?from=${encodeURIComponent(`/presets/${preset.id}`)}`}
                          className="block rounded-xl border border-white/10 bg-white/5 p-2 text-sm text-white transition hover:border-cyan-300/70 hover:bg-white/10"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] text-indigo-100">
                                #{pp.order ?? 0}
                              </span>
                              <p className="text-base font-semibold">{pp.position.name}</p>
                            </div>
                            {pp.timestampSeconds !== null && pp.timestampSeconds !== undefined && (
                              <span className="rounded-full border border-cyan-300/50 bg-cyan-500/15 px-2 py-0.5 text-cyan-50 text-xs">
                                {formatTime(pp.timestampSeconds)}
                              </span>
                            )}
                          </div>
                          {pp.note ? (
                            <p className="text-xs text-slate-200">{pp.note}</p>
                          ) : null}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-300">Aucune position liée.</p>
                  )
                ) : (
                  <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-100">
                    <p className="font-semibold text-white">Contenu verrouillé</p>
                    <p className="mt-1">{timelineLockedText}</p>
                  </div>
                )}
              </div>
            </div>
            {canEdit && (session.user.role !== "SCHOOL_ADMIN" && session.user.id !== preset.createdBy?.id) ? (
              <div className="flex justify-end">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200">
                  Édition réservée au créateur ({preset.createdBy?.name ?? preset.createdBy?.email ?? "Inconnu"}).
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
