"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type CreditPack = {
  id: string;
  name: string;
  credits: number;
  price: string;
};

const CREDIT_PACKS: CreditPack[] = [
  { id: "starter", name: "Pack découverte", credits: 100, price: "€9.90" },
  { id: "booster", name: "Pack booster", credits: 250, price: "€19.90" },
  { id: "pro", name: "Pack illimité 30 jours", credits: 1000, price: "€39.90" },
];

type Props = {
  currentCredits: number;
  showUpgrade?: boolean;
};

export function BuyCreditsButton({ currentCredits, showUpgrade }: Props) {
  const [mounted, setMounted] = useState(false);
  const [isCreditsOpen, setIsCreditsOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [selectedPack, setSelectedPack] = useState<CreditPack>(CREDIT_PACKS[1]);
  const projectedTotal = currentCredits + selectedPack.credits;

  useEffect(() => {
    setMounted(true);
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
          {CREDIT_PACKS.map((pack) => {
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
                <p className="text-sm font-semibold">{pack.price}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-5 rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
          Paiement sécurisé en ligne arrive bientôt. En attendant, contacte ton école
          pour recharger ton compte : nous appliquerons automatiquement le pack
          sélectionné ({selectedPack.name}).
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            className="rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-300/70 hover:bg-white/10"
            onClick={() => setIsCreditsOpen(false)}
          >
            Fermer
          </button>
          <button
            type="button"
            className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 opacity-70 transition"
            disabled
            aria-label="Paiement indisponible pour l'instant"
          >
            Continuer (bientôt)
          </button>
        </div>
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
            <p className="text-sm text-slate-300">
              Le paiement en ligne arrive bientôt. Prévisualise ci-dessous ce que tu obtiendras en passant premium.
            </p>
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
              <li>• Crédits bonus de bienvenue : 1000</li>
            </ul>
          </div>
          <div className="rounded-xl border border-cyan-300/30 bg-cyan-400/10 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-cyan-100">
              Offre de lancement
            </p>
            <p className="mt-1 text-base font-semibold text-white">€39.90 / 30 jours</p>
            <p className="text-xs text-cyan-50/90">
              Activation manuelle par l&apos;école le temps que le paiement en ligne arrive.
            </p>
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
            className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 opacity-70 transition"
            disabled
            aria-label="Paiement premium indisponible pour l'instant"
          >
            Continuer (bientôt)
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          onClick={() => {
            setIsUpgradeOpen(false);
            setIsCreditsOpen(true);
          }}
        >
          Acheter des crédits
        </button>
        {showUpgrade ? (
          <button
            type="button"
            className="rounded-full border border-cyan-400/70 bg-cyan-400/10 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-cyan-400/20"
            onClick={() => {
              const proPack =
                CREDIT_PACKS.find((pack) => pack.id === "pro") ??
                CREDIT_PACKS[CREDIT_PACKS.length - 1];
              setSelectedPack(proPack);
              setIsCreditsOpen(false);
              setIsUpgradeOpen(true);
            }}
          >
            Passer premium
          </button>
        ) : null}
      </div>

      {mounted && isCreditsOpen ? createPortal(creditModal, document.body) : null}
      {mounted && isUpgradeOpen ? createPortal(upgradeModal, document.body) : null}
    </>
  );
}
