/* eslint-disable @typescript-eslint/no-explicit-any */
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
    select: { name: true, email: true, isPremium: true, credits: true, schoolId: true, avatarUrl: true },
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
  const avatarUrl = user?.avatarUrl ?? session.user.image ?? null;
  const avatarInitial = (displayName?.[0] ?? "É").toUpperCase();
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

  const [packs, subs, purchases] = await Promise.all([
    prisma.creditPackOffer.findMany({
      where: { isActive: true, isOpen: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.subscriptionOffer.findMany({
      where: { isActive: true, isOpen: true },
      orderBy: { sortOrder: "asc" },
    }),
    (async () => {
      try {
        const client: any = prisma as any;
        if (!client.purchase?.findMany) return [];
        return await client.purchase.findMany({
          where: { userId: session.user.id },
          orderBy: { createdAt: "desc" },
          take: 10,
        });
      } catch {
        return [];
      }
    })(),
  ]);

  return (
    <main className="flex min-h-screen w-full flex-col gap-4">
      <section className="panel space-y-4 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/5 shadow-inner shadow-slate-900/30">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                <span className="text-base font-semibold text-white/90">{avatarInitial}</span>
              )}
            </div>
            <h2 className="text-xl text-white">
              Bonjour <span className="font-semibold text-fuchsia-200">{displayName}</span>,
            </h2>
          </div>
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
          <BuyCreditsButton
            currentCredits={credits}
            showUpgrade={!isPremium}
            packs={packs}
            subscriptions={subs}
          />
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
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-white/10 bg-white/5">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 5v14h14" />
                  <path d="M8 13l3-3 3 2 4-5" />
                  <circle cx="18" cy="7" r="1.2" />
                </svg>
              </span>
              <div className="space-y-1">
                <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
                  Progression
                </p>
                <p className="text-base font-semibold text-white">
                  Voir ta progression par position
                </p>
                <p className="text-sm text-slate-300">
                  Accès complet si premium, sinon positions vues en cours.
                </p>
              </div>
            </div>
          </Link>
          <Link
            href="/app/student/injuries"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-white/10 bg-white/5">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4.5" y="4.5" width="15" height="15" rx="2.5" />
                  <path d="M12 8v8" />
                  <path d="M8 12h8" />
                </svg>
              </span>
              <div className="space-y-1">
                <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
                  Blessures
                </p>
                <p className="text-base font-semibold text-white">
                  Déclarer et gérer tes blessures
                </p>
                <p className="text-sm text-slate-300">
                  Permet au prof de tenir compte des contre-indications.
                </p>
              </div>
            </div>
          </Link>
          <Link
            href="/app/student/courses"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-white/10 bg-white/5">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 4h9.5a2.5 2.5 0 012.5 2.5V19" />
                  <path d="M6 4v15a1 1 0 001 1h11" />
                  <path d="M9 8h7" />
                  <path d="M9 11h5" />
                </svg>
              </span>
              <div className="space-y-1">
                <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
                  Cours
                </p>
                <p className="text-base font-semibold text-white">
                  Historique de cours
                </p>
                <p className="text-sm text-slate-300">
                  Voir les cours où tu es présent et les positions travaillées.
                </p>
              </div>
            </div>
          </Link>
          <Link
            href="/app/student/school"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-white/10 bg-white/5">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 4l8 4-8 4-8-4 8-4z" />
                  <path d="M4 12v5.5a1.5 1.5 0 001.5 1.5H9v-5.5" />
                  <path d="M20 12v5.5a1.5 1.5 0 01-1.5 1.5H15v-5.5" />
                </svg>
              </span>
              <div className="space-y-1">
                <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
                  École
                </p>
                <p className="text-base font-semibold text-white">
                  Voir la fiche de ton école
                </p>
                <p className="text-sm text-slate-300">
                  Studios, partenaires et infos pratiques.
                </p>
              </div>
            </div>
          </Link>
          <Link
            href="/app/student/teachers"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-white/10 bg-white/5">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="7" r="3" />
                  <path d="M6.5 20v-1.5A3.5 3.5 0 0110 15h4a3.5 3.5 0 013.5 3.5V20" />
                  <path d="M4 20h16" />
                </svg>
              </span>
              <div className="space-y-1">
                <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
                  Professeurs
                </p>
                <p className="text-base font-semibold text-white">
                  Voir tes professeurs
                </p>
                <p className="text-sm text-slate-300">
                  Consulte leurs diplômes, photo et positions préférées.
                </p>
              </div>
            </div>
          </Link>
          <Link
            href="/positions"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-white/10 bg-white/5">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5c-2 0-3.5 1.5-3.5 3.5S10 12 12 12s3.5 1.5 3.5 3.5S14 19 12 19" />
                  <path d="M12 5V3" />
                  <path d="M12 21v-2" />
                  <path d="M5 12h2" />
                  <path d="M17 12h2" />
                  <path d="M7 7l1.5 1.5" />
                  <path d="M15.5 15.5 17 17" />
                  <path d="M7 17l1.5-1.5" />
                  <path d="M15.5 8.5 17 7" />
                </svg>
              </span>
              <div className="space-y-1">
                <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
                  Positions
                </p>
                <p className="text-base font-semibold text-white">
                  Consulter les figures
                </p>
                <p className="text-sm text-slate-300">
                  Parcours filtrable des positions (images seed). Accès complet si premium, sinon selon progression.
                </p>
              </div>
            </div>
          </Link>
          <Link
            href="/presets"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-white/10 bg-white/5">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="5" width="16" height="14" rx="2" />
                  <path d="M4 9h16" />
                  <path d="M8 5v14" />
                  <path d="M16 5v14" />
                </svg>
              </span>
              <div className="space-y-1">
                <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
                  Combos / presets
                </p>
                <p className="text-base font-semibold text-white">
                  Parcourir et acheter les combos
                </p>
                <p className="text-sm text-slate-300">
                  Catalogue de combos vidéo (premium ou crédits). Achat direct pour débloquer les contenus.
                </p>
              </div>
            </div>
          </Link>
          <Link
            href="/app/student/game"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-white/10 bg-white/5">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="7" />
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 5V3" />
                  <path d="M12 21v-2" />
                  <path d="M5 12H3" />
                  <path d="M21 12h-2" />
                </svg>
              </span>
              <div className="space-y-1">
                <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
                  Mini-jeu
                </p>
                <p className="text-base font-semibold text-white">
                  6 mini-jeux de révision
                </p>
                <p className="text-sm text-slate-300">
                  Photo→nom + variantes (type/niveau/grips/tips) sur tes positions débloquées ({isPremium ? "ou toutes si premium" : "libérées via cours"}).
                </p>
              </div>
            </div>
          </Link>
        </div>
      </section>

      <section className="panel p-6">
        <h3 className="text-lg font-semibold text-white">Historique achats</h3>
        <p className="text-sm text-slate-300">
          Achats simulés (statut PAYÉ). Montants TTC, TVA 20%, devise EUR.
        </p>
        <div className="mt-3 space-y-2">
          {purchases.length === 0 && (
            <p className="text-sm text-slate-400">Aucun achat pour l’instant.</p>
          )}
          {purchases.map((p: { id: string; createdAt: Date; amountCents?: number | null; offerName: string; kind: string; vatPercent?: number | null; creditsGranted?: number | null; isPremiumGranted?: boolean }) => {
            const created = new Date(p.createdAt).toLocaleString("fr-FR", { hour12: false });
            const amount = (p.amountCents ?? 0) / 100;
            return (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
              >
                <div className="space-y-0.5">
                  <p className="font-semibold text-white">
                    {p.offerName} ({p.kind})
                  </p>
                  <p className="text-xs text-slate-300">
                    {amount.toFixed(2)} € TTC · TVA {p.vatPercent ?? 20}% · Crédits :{" "}
                    {p.creditsGranted ?? 0}
                    {p.isPremiumGranted ? " + Premium" : ""}
                  </p>
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
