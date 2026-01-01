/* eslint-disable @typescript-eslint/no-explicit-any */
import { getServerSession } from "next-auth";
import Link from "next/link";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AVATAR_PLACEHOLDER } from "@/lib/placeholders";
import { resolveAvatarUrl } from "@/lib/avatar";
import { BuyCreditsButton } from "./BuyCreditsButton";
import { appSignature } from "@/lib/appMeta";

export default async function StudentDashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return null;
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, isPremium: true, credits: true, schoolId: true, avatarUrl: true, avatarPublicId: true },
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
  const avatarUrl = resolveAvatarUrl({
    avatarPublicId: user?.avatarPublicId,
    avatarUrl: user?.avatarUrl ?? session.user.image ?? null,
    placeholder: AVATAR_PLACEHOLDER,
  });
  const avatarInitial = (displayName?.[0] ?? "É").toUpperCase();
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
      <section className="panel p-6">
        <div className="flex flex-wrap items-center justify-end gap-3">
          <BuyCreditsButton
            currentCredits={credits}
            packs={packs}
            subscriptions={subs}
            buttonLabel={`Crédits : ${credits}`}
            buttonClassName="border-amber-300/60 bg-amber-500/25 px-2.5 py-1 text-[11px] font-semibold text-amber-50 shadow-inner shadow-amber-500/20"
          />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Link
            href="/app/student/progress"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <div className="flex items-center gap-3">
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
              </div>
            </div>
          </Link>
          <Link
            href="/app/student/injuries"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <div className="flex items-center gap-3">
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
              </div>
            </div>
          </Link>
          <Link
            href="/app/profile"
            className="relative rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <span
              className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${
                isPremium
                  ? "border border-emerald-400/70 bg-emerald-400/15 text-emerald-50"
                  : "border border-white/15 bg-white/10 text-white/80"
              }`}
            >
              {isPremium ? "Premium" : "Freemium"}
            </span>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-white/10 bg-white/5">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 12a5 5 0 100-10 5 5 0 000 10z" />
                  <path d="M3 21a9 9 0 0118 0" />
                </svg>
              </span>
              <div className="space-y-1">
                <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
                  Fiche élève
                </p>
                <p className="text-base font-semibold text-white">
                  Photo, infos, positions préférées
                </p>
              </div>
            </div>
          </Link>
          <Link
            href="/app/student/teachers"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <div className="flex items-center gap-3">
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
              </div>
            </div>
          </Link>
          <Link
            href="/app/student/courses/agenda?view=month"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <div className="flex items-center gap-3">
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
                  Historique cours
                </p>
                <p className="text-base font-semibold text-white">
                  Historique des cours réservés
                </p>
              </div>
            </div>
          </Link>
          <Link
            href="/app/student/school"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-white/10 bg-white/5">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 4l8 4-8 4-8-4 8-4z" />
                  <path d="M4 12v5.5a1.5 1.5 0 001.5 1.5H9v-5.5" />
                  <path d="M20 12v5.5a1.5 1.5 0 01-1.5 1.5H15v-5.5" />
                </svg>
              </span>
              <div className="space-y-1">
                <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
                  Réservation & studios
                </p>
                <p className="text-base font-semibold text-white">
                  Réserver et voir les studios
                </p>
              </div>
            </div>
          </Link>
          <Link
            href="/positions"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <div className="flex items-center gap-3">
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
              </div>
            </div>
          </Link>
          <Link
            href="/presets"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <div className="flex items-center gap-3">
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
                  Combos
                </p>
                <p className="text-base font-semibold text-white">
                  Parcourir et acheter les combos
                </p>
              </div>
            </div>
          </Link>
          <Link
            href="/app/student/game"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <div className="flex items-center gap-3">
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
              </div>
            </div>
          </Link>
          <Link
            href="/app/student/purchases"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-white/10 bg-white/5">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18" />
                  <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  <path d="M7 11h10" />
                  <path d="M7 15h6" />
                  <rect x="3" y="6" width="18" height="14" rx="2" />
                </svg>
              </span>
              <div className="space-y-1">
                <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
                  Historique achats
                </p>
                <p className="text-base font-semibold text-white">
                  Packs / abonnements
                </p>
              </div>
            </div>
          </Link>
          <BuyCreditsButton
            asCard
            currentCredits={credits}
            showUpgrade={!isPremium}
            packs={packs}
            subscriptions={subs}
          />
          {!isPremium && (
            <BuyCreditsButton
              asCard
              mode="upgrade"
              currentCredits={credits}
              showUpgrade={!isPremium}
              packs={packs}
              subscriptions={subs}
              title="Passer premium"
              subtitle="Abonnement"
            />
          )}
          <Link
            href="/app/student/partners"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-white/10 bg-white/5">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8a6 6 0 00-9.33-5" />
                  <path d="M5 22a7 7 0 0010-6.71" />
                  <path d="M16 8a6 6 0 00-9.33-5" />
                  <path d="M2 22a7 7 0 0010-6.71" />
                  <path d="M7 10h10" />
                  <path d="M7 14h10" />
                </svg>
              </span>
              <div className="space-y-1">
                <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
                  Partenaires
                </p>
                <p className="text-base font-semibold text-white">
                  Offres et liens sponsorisés
                </p>
              </div>
            </div>
          </Link>
        </div>
      </section>

      <div className="pb-4 text-center text-xs text-slate-300/80">{appSignature}</div>
    </main>
  );
}
