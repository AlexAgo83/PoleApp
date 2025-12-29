"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import { buyPackAction, buySubscriptionAction } from "./actions";

type CreditPack = {
  id: string;
  name: string;
  credits: number;
  priceCents: number;
  vatPercent?: number;
};

type SubscriptionOffer = {
  id: string;
  name: string;
  monthlyCredits: number;
  monthlyPriceCents: number;
  vatPercent?: number;
};

type Props = {
  currentCredits: number;
  showUpgrade?: boolean;
  packs: CreditPack[];
  subscriptions: SubscriptionOffer[];
  asCard?: boolean;
  mode?: "credits" | "upgrade";
  title?: string;
  subtitle?: string;
  description?: string;
};

function formatPrice(cents: number) {
  return `${(cents / 100).toFixed(2)} €`;
}

export function BuyCreditsButton({
  currentCredits,
  showUpgrade,
  packs,
  subscriptions,
  asCard,
  mode = "credits",
  title,
  subtitle,
  description,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  const [isCreditsOpen, setIsCreditsOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [selectedPack, setSelectedPack] = useState<CreditPack>(packs[0] ?? { id: "", name: "", credits: 0, priceCents: 0 });
  const [selectedSub, setSelectedSub] = useState<SubscriptionOffer>(subscriptions[0] ?? { id: "", name: "", monthlyCredits: 1000, monthlyPriceCents: 0 });
  const projectedTotal = currentCredits + selectedPack.credits;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    const handler = () => setIsUpgradeOpen(true);
    window.addEventListener("open-premium-modal", handler);
    return () => {
      window.removeEventListener("open-premium-modal", handler);
    };
  }, []);

  const creditModal = (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        aria-hidden="true"
        onClick={() => setIsCreditsOpen(false)}
      />
      <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl shadow-cyan-500/10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">
              Achat de crédits (démo)
            </p>
            <h3 className="text-xl font-semibold text-white">
              Bientôt disponible en ligne
            </h3>
            <p className="text-sm text-slate-300">
              Il te reste{" "}
              <span className="font-semibold text-white">{currentCredits}</span>{" "}
              crédits. Choisis un pack pour prévisualiser le futur parcours de paiement.
            </p>
            <p className="mt-1 text-sm text-cyan-100">
              Total après ce pack :{" "}
              <span className="font-semibold text-white">{projectedTotal}</span>{" "}
              crédits.
            </p>
          </div>
          <button
            type="button"
            className="text-slate-300 transition hover:text-white"
            onClick={() => setIsCreditsOpen(false)}
            aria-label="Fermer la modal d'achat"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          {packs.map((pack) => {
            const isSelected = pack.id === selectedPack.id;
            return (
              <button
                key={pack.id}
                type="button"
                onClick={() => setSelectedPack(pack)}
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                  isSelected
                    ? "border-cyan-400/80 bg-cyan-400/10 text-white shadow-lg shadow-cyan-500/15"
                    : "border-white/10 bg-white/5 text-slate-200 hover:border-cyan-400/60 hover:bg-white/10"
                }`}
              >
                <div>
                  <p className="text-sm font-semibold">{pack.name}</p>
                  <p className="text-xs text-slate-300">{pack.credits} crédits</p>
                </div>
                <p className="text-sm font-semibold">{formatPrice(pack.priceCents)}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-5 rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
          Paiement simulé : l&apos;achat crédite immédiatement ton compte et génère un reçu interne. TVA {selectedPack.vatPercent ?? 20}% incluse.
        </div>

        <form
          action={(formData) =>
            startTransition(async () => {
              await buyPackAction(formData);
              setIsCreditsOpen(false);
              router.refresh();
            })
          }
          className="mt-6 flex items-center justify-end gap-3"
        >
          <input type="hidden" name="packId" value={selectedPack.id} />
          <button
            type="button"
            className="rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-300/70 hover:bg-white/10"
            onClick={() => setIsCreditsOpen(false)}
          >
            Fermer
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
            aria-label="Acheter le pack"
          >
            {pending ? "Chargement..." : "Payer (simulé)"}
          </button>
        </form>
      </div>
    </div>
  );

  const upgradeModal = (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        aria-hidden="true"
        onClick={() => setIsUpgradeOpen(false)}
      />
      <div className="relative w-full max-w-lg rounded-2xl border border-cyan-300/30 bg-slate-900/95 p-6 shadow-2xl shadow-cyan-500/15">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">
              Passer Premium (démo)
            </p>
            <h3 className="text-xl font-semibold text-white">
              Accès illimité aux positions et au suivi
            </h3>
            <p className="text-sm text-slate-300">Paiement simulé : accès premium instantané + crédits offerts.</p>
          </div>
          <button
            type="button"
            className="text-slate-300 transition hover:text-white"
            onClick={() => setIsUpgradeOpen(false)}
            aria-label="Fermer la modal premium"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 grid gap-3 text-sm text-slate-200">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-cyan-200">
              Avantages premium
            </p>
            <ul className="mt-2 space-y-1.5 text-slate-100">
              <li>• Accès complet à toutes les positions et médias</li>
              <li>• Progression illimitée et mini-jeu sur tout le catalogue</li>
              <li>• Crédits bonus : {selectedSub?.monthlyCredits ?? 1000}</li>
            </ul>
          </div>
          <div className="rounded-xl border border-cyan-300/30 bg-cyan-400/10 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-cyan-100">
              Offre
            </p>
            {subscriptions.length === 0 ? (
              <p className="text-sm text-slate-200">Aucune offre disponible.</p>
            ) : (
              subscriptions.map((sub) => {
                const isSelected = sub.id === selectedSub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setSelectedSub(sub)}
                    className={`mt-2 w-full rounded-xl border px-3 py-2 text-left transition ${
                      isSelected
                        ? "border-cyan-300/70 bg-cyan-400/15 text-white"
                        : "border-white/10 bg-white/5 text-slate-200 hover:border-cyan-300/60 hover:bg-white/10"
                    }`}
                  >
                    <p className="text-sm font-semibold text-white">{sub.name}</p>
                    <p className="text-xs text-cyan-50/90">
                      {formatPrice(sub.monthlyPriceCents)} / mois · {sub.monthlyCredits} crédits
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            className="rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-300/70 hover:bg-white/10"
            onClick={() => setIsUpgradeOpen(false)}
          >
            Fermer
          </button>
          <button
            type="button"
            className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={pending || !selectedSub?.id}
            onClick={() =>
              startTransition(async () => {
                const fd = new FormData();
                fd.set("subscriptionId", selectedSub.id);
                await buySubscriptionAction(fd);
                setIsUpgradeOpen(false);
                router.refresh();
              })
            }
            aria-label="Acheter l'abonnement (simulé)"
          >
            {pending ? "Chargement..." : "Payer (simulé)"}
          </button>
        </div>
      </div>
    </div>
  );

  const openCredits = () => {
    setIsUpgradeOpen(false);
    setIsCreditsOpen(true);
  };
  const openUpgrade = () => {
    if (packs.length > 0) {
      setSelectedPack(packs[packs.length - 1]);
    }
    if (subscriptions.length > 0) {
      setSelectedSub(subscriptions[0]);
    }
    setIsCreditsOpen(false);
    setIsUpgradeOpen(true);
  };

  return (
    <>
      {asCard ? (
        <div
          role="button"
          tabIndex={0}
          onClick={mode === "upgrade" ? openUpgrade : openCredits}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              mode === "upgrade" ? openUpgrade() : openCredits();
            }
          }}
          className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-cyan-400/70 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-300/70"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-white/10 bg-white/5">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1v4" />
                <path d="M12 19v4" />
                <path d="M4.22 4.22l2.83 2.83" />
                <path d="M16.95 16.95l2.83 2.83" />
                <path d="M1 12h4" />
                <path d="M19 12h4" />
                <path d="M4.22 19.78l2.83-2.83" />
                <path d="M16.95 7.05l2.83-2.83" />
                <circle cx="12" cy="12" r="4" />
              </svg>
            </span>
            <div className="space-y-1">
              <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
                {title ?? (mode === "upgrade" ? "Passer premium" : "Acheter des crédits")}
              </p>
              <p className="text-base font-semibold text-white">
                {subtitle ?? (mode === "upgrade" ? "Abonnement premium" : "Packs / abonnements")}
              </p>
              <p className="text-sm text-slate-300">
                {description ??
                  (mode === "upgrade"
                    ? "Ouvre la modal premium (abonnement)."
                    : "Ouvre la modal d’achat pour simuler un pack ou un abo.")}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
            onClick={openCredits}
          >
            Acheter des crédits
          </button>
          {showUpgrade ? (
            <button
              type="button"
              className="rounded-full border border-cyan-400/70 bg-cyan-400/10 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-cyan-400/20"
              onClick={openUpgrade}
            >
              Passer premium
            </button>
          ) : null}
        </div>
      )}

      {mounted && isCreditsOpen ? createPortal(creditModal, document.body) : null}
      {mounted && isUpgradeOpen ? createPortal(upgradeModal, document.body) : null}
    </>
  );
}
