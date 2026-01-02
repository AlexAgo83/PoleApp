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

type Props = {
  params: { id: string };
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
      positions: { include: { position: { select: { name: true, discipline: true } } } },
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
  const isPremium = Boolean(session?.user?.isPremium);
  const hasPurchase = isStudent
    ? Boolean(
        await prisma.purchase.findFirst({
          where: { userId: session.user.id, offerId: preset.id, kind: "PRESET", status: "PAID" },
        })
      )
    : false;
  const isFree = (preset.priceCredits ?? 0) <= 0;
  const canViewContent = !isStudent || isPremium || hasPurchase || (!preset.premiumRequired && isFree);
  const lockedReason = preset.premiumRequired
    ? "Contenu réservé aux élèves premium."
    : "Achetez ce preset pour débloquer la description et la vidéo.";

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
        ]}
      />

      <section className="panel space-y-4 p-4 md:p-6 lg:p-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-white md:text-3xl">{preset.title}</h1>
          {canViewContent ? (
            <p className="text-sm text-slate-300">{preset.description || "Pas de description"}</p>
          ) : (
            <p className="text-sm text-amber-100">
              {lockedReason}
            </p>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            {preset.imagePublicId ? (
              <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
                <SafeImage
                  publicId={preset.imagePublicId}
                  alt={preset.title}
                  width={960}
                  height={400}
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
                  <p className="text-center">{lockedReason}</p>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div className="grid gap-2 md:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
                <p className="text-[11px] uppercase tracking-[0.12em] text-slate-300">Discipline</p>
                <p className="font-semibold text-white">{preset.discipline ?? "Non renseignée"}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
                <p className="text-[11px] uppercase tracking-[0.12em] text-slate-300">Tarification</p>
                <p className="font-semibold text-white">{priceLabel}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
                <p className="text-[11px] uppercase tracking-[0.12em] text-slate-300">Positions liées</p>
                <p className="font-semibold text-white">{preset.positions.length}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
                <p className="text-[11px] uppercase tracking-[0.12em] text-slate-300">Créé par</p>
                <p className="font-semibold text-white">{preset.createdBy?.name ?? preset.createdBy?.email ?? "Inconnu"}</p>
              </div>
            </div>
            {isStudent && !canViewContent ? (
              <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-100">
                <p className="font-semibold text-white">Contenu Premium</p>
                <p className="mt-1">
                  {lockedReason}
                </p>
              </div>
            ) : null}
            <div>
              <p className="text-sm font-semibold text-white">Positions</p>
              {preset.positions.length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-2 text-xs text-white">
                  {preset.positions.map((pp) => (
                    <li key={pp.positionId} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-100">
                      {pp.position.name}
                      {pp.position.discipline ? <span className="ml-1 text-slate-300">({pp.position.discipline})</span> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-300">Aucune position liée.</p>
              )}
            </div>
            {canEdit && (session.user.role === "SCHOOL_ADMIN" || session.user.id === preset.createdBy?.id) ? (
              <div className="flex justify-end">
                <Link
                  href={`/presets/${preset.id}/edit`}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
                >
                  Éditer
                </Link>
              </div>
            ) : canEdit ? (
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
