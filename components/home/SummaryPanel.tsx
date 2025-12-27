'use client';

import { useEffect, useState } from "react";

type Props = {
  appVersion: string;
};

export default function SummaryPanel({ appVersion }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const isDesktop = window.innerWidth >= 768;
    setOpen(isDesktop);
  }, []);

  return (
    <header className="panel relative overflow-hidden p-6">
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-transparent to-cyan-400/10" />
      <details
        className="relative flex flex-col gap-4 group"
        open={open}
        onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      >
        <summary className="flex w-full cursor-pointer items-center justify-between gap-3 text-left text-white">
          <div className="space-y-1">
            <p className="text-sm uppercase tracking-[0.18em] text-cyan-200">
              Pole App — v{appVersion}
            </p>
          </div>
          <span className="text-sm text-slate-300 transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="relative grid gap-6 md:grid-cols-[2fr_1.05fr]">
          <div className="space-y-5">
            <div className="max-w-2xl space-y-3 text-slate-100">
              {[
                {
                  title: "Plateforme pole & aerial",
                  desc: "relie élèves, profs et admins autour des cours et des figures.",
                },
                {
                  title: "Catalogue positions photo/vidéo",
                  desc: "avec filtres, niveaux, badges discipline et repérage créateur.",
                },
                {
                  title: "Progression gamifiée",
                  desc: "statut « vu », mastery, premium, blessures visibles et mini-jeux de révision.",
                },
                {
                  title: "Agendas interactifs",
                  desc: "(mois/semaine) pour élèves/profs/admins avec filtres studios/profs/disciplines.",
                },
                {
                  title: "Cours et crédits/abonnements",
                  desc: "liste d’attente, présences, notes et liens directs vers les positions.",
                },
                {
                  title: "Achats & facturation intégrée",
                  desc: "statuts de facture, exports CSV, historique crédit/abonnement.",
                },
                {
                  title: "Backoffice écoles",
                  desc: "utilisateurs, studios, partenaires, offres/packs, TVA/devise et statuts financiers.",
                },
                {
                  title: "Navigation multi-rôles sécurisée",
                  desc: "panels glassy harmonisés et retours contextuels conservés.",
                },
                {
                  title: "Expérience mobile soignée",
                  desc: "panneaux repliables, filtres persistés et vignettes lisibles.",
                },
                {
                  title: "Identité visuelle fuchsia/indigo",
                  desc: "pour sublimer les dashboards, positions et agendas.",
                },
              ].map((line) => (
                <div
                  key={line.title}
                  className="relative rounded-lg border border-white/10 bg-white/5 px-4 py-3 shadow-inner shadow-indigo-900/30"
                >
                  <span className="mr-2 text-fuchsia-200">✦</span>
                  <span className="font-semibold text-white">{line.title}</span>{" "}
                  <span className="text-slate-50">{line.desc}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-slate-200">
              <span className="rounded-full border border-indigo-400/30 bg-indigo-500/15 px-3 py-1">
                Catalogue positions photo/vidéo + niveaux
              </span>
              <span className="rounded-full border border-cyan-400/30 bg-cyan-500/15 px-3 py-1">
                Agendas interactifs multi-rôles
              </span>
              <span className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1">
                Progression + mini-jeux (6 modes)
              </span>
              <span className="rounded-full border border-fuchsia-400/40 bg-fuchsia-500/20 px-3 py-1">
                Disciplines: colorées + badges créateur
              </span>
              <span className="rounded-full border border-violet-400/40 bg-violet-500/20 px-3 py-1">
                Cours avec crédits + liste d’attente
              </span>
              <span className="rounded-full border border-amber-400/30 bg-amber-500/15 px-3 py-1">
                Facturation: statuts + export CSV
              </span>
              <span className="rounded-full border border-amber-400/30 bg-amber-500/15 px-3 py-1">
                Crédits/abonnements & facturation
              </span>
              <span className="rounded-full border border-sky-300/40 bg-sky-500/20 px-3 py-1">
                Vidéos sécurisées (Cloudinary signé)
              </span>
              <span className="rounded-full border border-rose-400/40 bg-rose-500/20 px-3 py-1">
                Blessures + sécurité affichée au prof
              </span>
              <span className="rounded-full border border-lime-400/40 bg-lime-500/20 px-3 py-1">
                Offres/packs
              </span>
              <span className="rounded-full border border-indigo-300/40 bg-indigo-500/20 px-3 py-1">
                Fiches prof publiques + favoris élèves
              </span>
              <span className="rounded-full border border-teal-300/40 bg-teal-500/20 px-3 py-1">
                Studios & partenaires avec filtres
              </span>
              <span className="rounded-full border border-purple-400/30 bg-purple-500/15 px-3 py-1">
                Multi-rôles sécurisé (élève/prof/admin/super admin)
              </span>
            </div>
          </div>
          <aside className="relative h-fit self-start rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200 shadow-inner shadow-indigo-900/20">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Avancement</p>
              <span className="inline-flex items-center rounded-full border border-emerald-400/50 bg-emerald-500/20 px-3 py-1 text-[12px] font-semibold text-emerald-50 shadow-inner shadow-emerald-700/30">
                Phase produit
              </span>
            </div>
            <div className="mt-3 grid gap-2">
              <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <div>
                  <p className="text-[12px] uppercase tracking-[0.12em] text-slate-400">S006 — Partenaires & facturation admin</p>
                  <p className="text-white font-semibold">Filtres persistés, exports CSV, toasts, agenda admin</p>
                  <p className="text-xs text-slate-400">Avancement 100% (QA validée)</p>
                </div>
                <span className="inline-flex min-w-[86px] items-center justify-center rounded-full border border-emerald-400/60 bg-emerald-500/20 px-3 py-1 text-[12px] font-semibold text-emerald-50 shadow-[0_0_10px_rgba(16,185,129,0.45)]">
                  Livré
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <div>
                  <p className="text-[12px] uppercase tracking-[0.12em] text-slate-400">S005 — Agenda teacher & générateur cours</p>
                  <p className="text-white font-semibold">Filtres multi, badges appliqué/forcé/exclu, scoring équilibré</p>
                  <p className="text-xs text-slate-400">Avancement 100% (QA validée)</p>
                </div>
                <span className="inline-flex min-w-[86px] items-center justify-center rounded-full border border-emerald-400/60 bg-emerald-500/20 px-3 py-1 text-[12px] font-semibold text-emerald-50 shadow-[0_0_10px_rgba(16,185,129,0.45)]">
                  Livré
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <div>
                  <p className="text-[12px] uppercase tracking-[0.12em] text-slate-400">S010 — DRY_007</p>
                  <p className="text-white font-semibold">Muscles/blessures, générateur, reset MDP</p>
                  <p className="text-xs text-slate-400">Avancement 75% (P0/P1 quasi livrés, QA à faire)</p>
                </div>
                <span className="inline-flex min-w-[86px] items-center justify-center rounded-full border border-amber-300 bg-amber-400/30 px-3 py-1 text-[12px] font-semibold text-amber-50 shadow-[0_0_16px_rgba(251,191,36,0.7)] animate-[pulse_1.5s_ease-in-out_infinite]">
                  En cours
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <div>
                  <p className="text-[12px] uppercase tracking-[0.12em] text-slate-400">S009 — Super-admin & audit</p>
                  <p className="text-white font-semibold">Audit log/2FA (placeholder), promo/dégrad, panels harmonisés</p>
                  <p className="text-xs text-slate-400">Avancement 80% (UI harmonisée, reste QA audit/logs)</p>
                </div>
                <span className="inline-flex min-w-[86px] items-center justify-center rounded-full border border-amber-300 bg-amber-400/30 px-3 py-1 text-[12px] font-semibold text-amber-50 shadow-[0_0_16px_rgba(251,191,36,0.7)] animate-[pulse_1.5s_ease-in-out_infinite]">
                  En cours
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <div>
                  <p className="text-[12px] uppercase tracking-[0.12em] text-slate-400">S008 — Admin/élève</p>
                  <p className="text-white font-semibold">Billing, CRUD disciplines, achats élève</p>
                  <p className="text-xs text-slate-400">Avancement 85% (mail reset prod à finaliser, QA achats/disciplines)</p>
                </div>
                <span className="inline-flex min-w-[86px] items-center justify-center rounded-full border border-amber-300 bg-amber-400/30 px-3 py-1 text-[12px] font-semibold text-amber-50 shadow-[0_0_16px_rgba(251,191,36,0.7)] animate-[pulse_1.5s_ease-in-out_infinite]">
                  En cours
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <div>
                  <p className="text-[12px] uppercase tracking-[0.12em] text-slate-400">S011 — Retours QA S012</p>
                  <p className="text-white font-semibold">Combos associés, agenda studio, parcours élève/premium, facturation, statuts financiers</p>
                  <p className="text-xs text-slate-400">Avancement 0% (backlog validé, implémentation à planifier)</p>
                </div>
                <span className="inline-flex min-w-[86px] items-center justify-center rounded-full border border-slate-300 bg-slate-500/30 px-3 py-1 text-[12px] font-semibold text-slate-100">
                  À faire
                </span>
              </div>
            </div>
          </aside>
        </div>
      </details>
    </header>
  );
}
