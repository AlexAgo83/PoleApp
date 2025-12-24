import { getServerSession } from "next-auth";
import Link from "next/link";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BuyCreditsButton } from "./BuyCreditsButton";
import { PartnerProductsCarousel } from "./PartnerProductsCarousel";

export default async function StudentDashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return null;
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, isPremium: true, credits: true, schoolId: true },
  });
  const isPremium = Boolean(user?.isPremium);
  const nameParts =
    user?.name
      ?.trim()
      .split(/\s+/)
      .filter(Boolean) ?? [];
  const firstName = nameParts[0];
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : undefined;
  const displayName = firstName ?? lastName ?? user?.email ?? "élève";
  const credits = user?.credits ?? 0;
  const partners =
    user?.schoolId
      ? await prisma.partner.findMany({
          where: { schoolId: user.schoolId },
          select: {
            id: true,
            name: true,
            kind: true,
            website: true,
            description: true,
            sponsoredLinks: { select: { id: true, category: true, label: true, url: true } },
          },
          orderBy: { name: "asc" },
          take: 4,
        })
      : [];
  const partnerProducts = partners
    .flatMap((partner) =>
      partner.sponsoredLinks.map((link) => ({
        id: link.id,
        partnerId: partner.id,
        partnerName: partner.name,
        partnerKind: partner.kind,
        category: link.category,
        label: link.label,
        url: link.url,
      }))
    )
    .slice(0, 12);

  const purchases = await prisma.auditLog.findMany({
    where: { actorId: session.user.id, action: "demo_purchase" },
    select: { id: true, createdAt: true, target: true, details: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return (
    <main className="grid gap-6">
      <section className="panel space-y-4 p-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl text-white">
            Bonjour <span className="font-semibold">{displayName}</span>,
          </h2>
          <Link
            href="/app/profile"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-white/90 transition hover:border-indigo-300/70 hover:text-white"
            aria-label="Éditer le profil"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/gear.svg" alt="" className="h-4 w-4" />
            Éditer
          </Link>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${
              isPremium
                ? "border border-emerald-400/70 bg-emerald-400/10 text-emerald-100"
                : "border border-white/15 bg-white/5 text-white/80"
            }`}
          >
            {isPremium ? "Premium" : "Freemium"}
          </span>
        </div>
        <p className="text-slate-300">
          Accès réservé aux rôles étudiant. Suis ta progression, tes blessures et révise via le mini-jeu.
        </p>
        <div className="flex flex-wrap items-center gap-3 text-sm md:ml-auto md:justify-end">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/70 bg-amber-400/15 px-3 py-1 text-sm font-semibold text-amber-50 shadow-sm">
            Crédits : {credits}
          </span>
          <BuyCreditsButton currentCredits={credits} showUpgrade={!isPremium} />
        </div>
      </section>

      <section className="panel p-6">
        <h3 className="text-lg font-semibold text-white">
          Tes modules et actions
        </h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Link
            href="/app/student/progress"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
              Progression
            </p>
            <p className="text-base font-semibold text-white">
              Voir ta progression par position
            </p>
            <p className="text-sm text-slate-300">
              Accès complet si premium, sinon positions vues en cours.
            </p>
          </Link>
          <Link
            href="/app/student/injuries"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
              Blessures
            </p>
            <p className="text-base font-semibold text-white">
              Déclarer et gérer tes blessures
            </p>
            <p className="text-sm text-slate-300">
              Permet au prof de tenir compte des contre-indications.
            </p>
          </Link>
          <Link
            href="/app/student/courses"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
              Cours
            </p>
            <p className="text-base font-semibold text-white">
              Historique de cours
            </p>
            <p className="text-sm text-slate-300">
              Voir les cours où tu es présent et les positions travaillées.
            </p>
          </Link>
          <Link
            href="/app/student/school"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
              École
            </p>
            <p className="text-base font-semibold text-white">
              Voir la fiche de ton école
            </p>
            <p className="text-sm text-slate-300">
              Studios, partenaires et infos pratiques.
            </p>
          </Link>
          <Link
            href="/app/student/teachers"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
              Professeurs
            </p>
            <p className="text-base font-semibold text-white">
              Voir tes professeurs
            </p>
            <p className="text-sm text-slate-300">
              Consulte leurs diplômes, photo et positions préférées.
            </p>
          </Link>
          <Link
            href="/positions"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
              Positions
            </p>
            <p className="text-base font-semibold text-white">
              Consulter les figures
            </p>
            <p className="text-sm text-slate-300">
              Parcours filtrable des positions (images seed). Accès complet si premium, sinon selon progression.
            </p>
          </Link>
          <Link
            href="/app/student/game"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
              Mini-jeu
            </p>
            <p className="text-base font-semibold text-white">
              6 mini-jeux de révision
            </p>
            <p className="text-sm text-slate-300">
              Photo→nom + variantes (type/niveau/grips/tips) sur tes positions débloquées ({isPremium ? "ou toutes si premium" : "libérées via cours"}).
            </p>
          </Link>
        </div>
      </section>

      <section className="panel p-6">
        <h3 className="text-lg font-semibold text-white">Historique achats (démo)</h3>
        <p className="text-sm text-slate-300">
          Derniers ajouts de crédits/packs simulés. Données internes (audit), paiement réel à venir.
        </p>
        <div className="mt-3 space-y-2">
          {purchases.length === 0 && (
            <p className="text-sm text-slate-400">Aucun achat simulé pour l’instant.</p>
          )}
          {purchases.map((p) => {
            const created = new Date(p.createdAt).toLocaleString("fr-FR", { hour12: false });
            const details = (p.details as Record<string, unknown>) ?? {};
            const credits = (details.credits as number | string | undefined) ?? "—";
            const pack =
              (details.packName as string | undefined) ??
              (details.packId as string | undefined) ??
              p.target ??
              "Pack";
            return (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
              >
                <div className="space-y-0.5">
                  <p className="font-semibold text-white">{pack}</p>
                  <p className="text-xs text-slate-300">Crédits ajoutés : {credits}</p>
                </div>
                <span className="text-[12px] text-cyan-100">{created}</span>
              </div>
            );
          })}
        </div>
      </section>

      {partners.length > 0 && (
        <section className="panel p-6 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-white">Partenaires de ton école</h3>
            <Link
              href="/app/student/school"
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
            >
              Voir la fiche école
            </Link>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {partners.map((partner) => (
              <div
                key={partner.id}
                className="flex min-w-0 flex-col gap-1 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200 transition hover:border-cyan-300/70 hover:bg-white/10"
              >
                <p className="text-base font-semibold text-white">{partner.name}</p>
                {partner.kind && <p className="text-xs uppercase tracking-[0.12em] text-cyan-200">{partner.kind}</p>}
                {partner.description && <p className="text-sm text-slate-300">{partner.description}</p>}
                {partner.website && (
                  <a
                    href={`/api/partners/redirect?partnerId=${partner.id}&url=${encodeURIComponent(partner.website)}&type=click`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-cyan-300 transition hover:text-cyan-100"
                  >
                    Site web ↗
                  </a>
                )}
              </div>
            ))}
          </div>
          {partnerProducts.length > 0 && <PartnerProductsCarousel items={partnerProducts} />}
        </section>
      )}
    </main>
  );
}
