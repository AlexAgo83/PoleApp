import { MediaKind, PositionLevel, PositionType } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";

import { SignOutButton } from "@/components/auth/SignOutButton";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { defaultHomeForRole } from "@/lib/rbac";

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

export default async function PositionDetailPage({ params, searchParams }: Props) {
  const awaitedParams = await params;
  if (!awaitedParams?.id) {
    notFound();
  }

  const awaitedSearch = searchParams ? await searchParams : undefined;
  const from = awaitedSearch?.from;
  const safeFrom =
    from && from.startsWith("/") && !from.startsWith("//") ? from : undefined;
  const backHref = safeFrom ?? "/positions";

  const session = await getServerSession(authOptions);
  const homeForRole = defaultHomeForRole(session?.user?.role);

  const position = await prisma.position.findUnique({
    where: { id: awaitedParams.id },
    include: {
      media: true,
      createdBy: true,
    },
  });

  if (!position) {
    return (
      <main className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-6 py-16">
        <div className="panel w-full max-w-xl p-6 text-center text-slate-200">
          <p>Position introuvable.</p>
          <Link
            href={backHref}
            className="mt-3 inline-flex items-center justify-center rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-400"
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
  const isPremium = Boolean(session?.user?.isPremium);
  const isStudent = session?.user?.role === "STUDENT";
  const canViewPremium = !isStudent || isPremium;
  const hasVideo = Boolean(video);
  const isStaff =
    session?.user?.role === "TEACHER" || session?.user?.role === "SCHOOL_ADMIN";

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-12">
      <header className="panel flex flex-wrap items-center justify-between gap-4 border-indigo-400/25 p-6 shadow-indigo-900/30">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-indigo-100">
            {session?.user?.role === "SCHOOL_ADMIN"
              ? "Espace admin"
              : session?.user?.role === "TEACHER"
              ? "Espace prof"
              : session?.user?.role === "STUDENT"
              ? "Espace élève"
              : "Accueil"}
          </p>
          <h1 className="text-2xl font-semibold text-white">Positions</h1>
          <p className="text-sm text-slate-200">
            Catalogue des positions avec filtres et détail. Visible selon tes droits.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {session?.user ? (
            <>
              <Link
                href={homeForRole}
                role="button"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-white transition hover:border-indigo-300 hover:bg-indigo-500/15"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/house.svg" alt="" className="h-4 w-4" />
                Mon espace
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link
              href="/login"
              role="button"
              className="rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg transition hover:brightness-110"
            >
              Se connecter
            </Link>
          )}
        </div>
      </header>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">
            Position
          </p>
          <h1 className="text-3xl font-semibold text-white">{position.name}</h1>
          <p className="text-sm text-slate-300">
            {typeLabels[position.type]} · {levelLabels[position.levelRequired]}
          </p>
        </div>
        <Link
          href={backHref}
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
        >
          ← Retour
        </Link>
      </header>

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="panel space-y-4 p-6">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover.url}
              alt={position.name}
              className="w-full rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-64 items-center justify-center rounded-xl bg-white/5 text-sm text-slate-300">
              Pas d’image
            </div>
          )}
          {canViewPremium ? (
            <div className="space-y-2 text-slate-200">
              <p className="text-sm text-cyan-200">Description</p>
              <p className="text-sm text-slate-100">
                {position.description ?? "Aucune description"}
              </p>
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
          <div>
            <p className="text-sm text-slate-300">Type</p>
            <p className="text-base font-semibold text-white">
              {typeLabels[position.type]}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-300">Niveau requis</p>
            <p className="text-base font-semibold text-white">
              {levelLabels[position.levelRequired]}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-300">Grips</p>
            <p className="text-base font-semibold text-white">
              {position.grips ?? "Non précisé"}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-300">Créé par</p>
            <p className="text-base font-semibold text-white">
              {position.createdBy?.name ?? "Seed"}
            </p>
          </div>
          {video && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-white">Vidéo</p>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-cyan-400/40 bg-cyan-500/15 px-2 py-0.5 text-[11px] font-semibold text-cyan-50">
                    Vidéo
                  </span>
                  {isStudent && !isPremium && (
                    <span className="rounded-full border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-50">
                      Premium
                    </span>
                  )}
                </div>
              </div>
              {canViewPremium ? (
                <a
                  href={video.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white transition hover:border-cyan-300/70 hover:bg-white/10"
                >
                  Ouvrir la vidéo
                  <span aria-hidden>↗</span>
                </a>
              ) : (
                <p className="mt-2 text-xs text-amber-100">
                  Connecte-toi en Premium pour accéder à la vidéo.
                </p>
              )}
            </div>
          )}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
            <p className="font-semibold text-white">Gating élève</p>
            <p className="mt-2">
              Élève gratuit : accès aux positions “débloquées” via cours (stub
              pour MVP).
            </p>
            <p className="mt-2">
              Élève premium : accès complet.
              <br />
              Statut actuel :{" "}
              <span className="font-semibold">
                {isPremium ? "Premium" : "Gratuit / inconnu"}
              </span>
            </p>
          </div>
          {isStaff && (
            <div className="flex justify-end">
              <Link
                href={`/teacher/positions/${position.id}/edit`}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-indigo-300/70 hover:bg-indigo-500/15"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/gear.svg" alt="" className="h-4 w-4" />
                Éditer
              </Link>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
