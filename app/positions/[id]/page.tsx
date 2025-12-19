import { PositionLevel, PositionType } from "@prisma/client";
import Link from "next/link";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

export const dynamic = "force-dynamic";

type Props = {
  params: { id: string };
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

export default async function PositionDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);

  const position = await prisma.position.findUnique({
    where: { id: params.id },
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
            href="/positions"
            className="mt-3 inline-flex items-center justify-center rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-400"
          >
            Retour à la liste
          </Link>
        </div>
      </main>
    );
  }

  const cover = position.media[0];
  const isPremium = Boolean(session?.user?.isPremium);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-12">
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
          href="/positions"
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
          <Link
            href="/teacher/positions/new"
            className="inline-flex items-center justify-center rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-400"
          >
            Créer une position (prof/admin)
          </Link>
        </aside>
      </section>
    </main>
  );
}
