import Link from "next/link";
import { getServerSession } from "next-auth";

import { SignOutButton } from "@/components/auth/SignOutButton";
import HealthBadge from "@/components/HealthBadge";
import { authOptions } from "@/lib/auth";
import { defaultHomeForRole } from "@/lib/rbac";

const moduleSections = [
  {
    title: "Positions",
    href: "/positions",
    description:
      "Base positions + médias, filtres, vignettes 2 colonnes, détail partageable, retour contextuel.",
    status: "Étape 8-9",
    role: "Élève / Professeur / Admin",
    icon: "🌀",
  },
  {
    title: "Cours",
    href: "/app/teacher/courses",
    description: "Création cours, présences, notes, durée et mise à jour progression.",
    status: "Étape 5-9",
    role: "Professeur",
    icon: "📅",
  },
  {
    title: "Élèves",
    href: "/app/teacher/students",
    description:
      "Fiches élèves, progression, blessures visibles par professeur.",
    status: "Étapes 3-4",
    role: "Professeur / Admin",
    icon: "🧑‍🎓",
  },
  {
    title: "Mini-jeu",
    href: "/app/student/game",
    description: "6 modes (photo/type/niveau/grips/description + blitz), historique et leaderboard.",
    status: "Étape 6-9",
    role: "Élève / Prof / Admin",
    icon: "🎯",
  },
  {
    title: "Admin école",
    href: "/admin",
    description: "Pilotage école : utilisateurs, stats rapides, studios et partenaires.",
    status: "Étape 7",
    role: "Admin",
    icon: "🏢",
  },
  {
    title: "Agenda (élève)",
    href: "/app/student/courses/agenda",
    description: "Vue agenda mensuelle + semaine, filtres studios/profs/« mes cours » sans scroll mobile.",
    status: "Étape 9",
    role: "Élève",
    icon: "🗓️",
  },
  {
    title: "Agenda (prof/admin)",
    href: "/app/teacher/courses/agenda",
    description: "Agenda cours avec filtres studio/prof, navigation mois + vue semaine.",
    status: "Étape 9",
    role: "Professeur / Admin",
    icon: "📆",
  },
  {
    title: "École (élève)",
    href: "/app/student/school",
    description: "Studios/partenaires + agenda école (semaine/mois) et prochains cours.",
    status: "Étape 9",
    role: "Élève",
    icon: "🏫",
  },
  {
    title: "Crédits & achats",
    href: "/app/student",
    description: "Solde crédits visible, bouton Acheter des crédits (demo) et règles d’inscription.",
    status: "Étape 9",
    role: "Élève",
    icon: "💳",
  },
  {
    title: "Facturation (admin)",
    href: "/app/admin/billing",
    description: "Factures cours avec filtres/statuts, export CSV, backfill, actions guidées.",
    status: "Livré (0.6.8)",
    role: "Admin",
    icon: "💼",
  },
  {
    title: "Facturation (prof)",
    href: "/app/teacher/billing",
    description: "Vue lecture factures de mes cours (montants/statuts).",
    status: "Livré (0.6.8)",
    role: "Professeur",
    icon: "🧾",
  },
  {
    title: "Studios & partenaires",
    href: "/app/admin/studios",
    description: "Gestion studios (toggle lecture/édition), accès partenaires et navigation admin.",
    status: "Étape 9",
    role: "Admin",
    icon: "🏬",
  },
  {
    title: "Profile",
    href: "/app/profile",
    description: "Consulter et mettre à jour prénom/nom, voir email, rôle et école.",
    status: "Étape 8",
    role: "Élève / Professeur / Admin",
    icon: "👤",
  },
];

const roleLabels: Record<string, string> = {
  STUDENT: "Élève",
  TEACHER: "Professeur",
  SCHOOL_ADMIN: "Admin école",
};

export default async function Home() {
  const session = await getServerSession(authOptions);
  const homeForRole = defaultHomeForRole(session?.user?.role);
  const isAuthenticated = Boolean(session?.user);

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-3 px-2 py-6 md:gap-6 md:px-8 md:py-10">
      <section className="panel relative flex flex-col gap-3 overflow-hidden p-5 text-sm text-slate-200 md:flex-row md:items-center md:justify-between">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-transparent to-cyan-400/10" />
        <div className="relative flex flex-wrap items-center gap-2">
          {isAuthenticated && (
            <>
              <span className="inline-flex items-center gap-2 rounded-full border border-indigo-400/50 bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-white shadow-inner shadow-indigo-500/20">
                <span className="text-[11px] uppercase tracking-[0.14em] text-indigo-100">
                  Session
                </span>
                <span className="truncate">{session?.user?.email}</span>
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/50 bg-cyan-500/15 px-3 py-1 text-xs font-semibold text-white shadow-inner shadow-cyan-500/20">
                <span className="text-[11px] uppercase tracking-[0.14em] text-cyan-100">
                  Rôle
                </span>
                <span>
                  {roleLabels[session?.user?.role ?? ""] ?? session?.user?.role}
                </span>
              </span>
            </>
          )}
        </div>
        <div className="relative flex flex-wrap items-center gap-2 md:justify-end">
          {session?.user ? (
            <>
              <Link
                href={homeForRole}
                role="button"
                className="inline-flex items-center gap-2 rounded-full border border-indigo-400/60 bg-indigo-500/20 px-3 py-1.5 font-semibold text-white transition hover:border-indigo-300 hover:bg-indigo-500/30"
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
              className="rounded-full border border-cyan-100/80 bg-cyan-500 px-4 py-2 font-semibold text-white shadow-lg shadow-indigo-900/30 transition hover:bg-cyan-400 hover:border-cyan-50 hover:-translate-y-0.5 active:translate-y-[1px]"
              style={{ flexShrink: 0, whiteSpace: "nowrap" }}
            >
              Se connecter
            </Link>
          )}
        </div>
      </section>

      <header className="panel relative overflow-hidden p-6">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-transparent to-cyan-400/10" />
        <details className="relative flex flex-col gap-4 group" open>
          <summary className="flex w-full cursor-pointer items-center justify-between gap-3 text-left text-white">
            <div className="space-y-1">
              <p className="text-sm uppercase tracking-[0.18em] text-cyan-200">
                Pole App — v0.6.8
              </p>
            </div>
            <span className="text-sm text-slate-300 transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="relative grid gap-4 md:grid-cols-[2fr_1.05fr]">
            <div className="space-y-3">
              <p className="max-w-2xl text-slate-200">
                Plateforme unifiée élève/prof/admin : positions sans gating côté staff, suivi des blessures,
                cours avec crédits + liste d’attente (rang), mini-jeux parité rôles (6 modes + leaderboard),
                agendas élève (cours + école) et prof/admin avec pastilles d’état, studios/partenaires éditables,
                navigation par rôle.
              </p>
              <div className="flex flex-wrap gap-3 text-sm text-slate-200">
                <span className="rounded-full border border-indigo-400/30 bg-indigo-500/15 px-3 py-1">
                  Accès différencié élève / prof / admin
                </span>
                <span className="rounded-full border border-cyan-400/30 bg-cyan-500/15 px-3 py-1">
                  Suivi sécurité : blessures visibles par le professeur
                </span>
                <span className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1">
                  Progression + mini-jeux (6 modes) avec leaderboard
                </span>
                <span className="rounded-full border border-purple-400/30 bg-purple-500/15 px-3 py-1">
                  Navigation unifiée (session, rôle, Mon espace)
                </span>
                <span className="rounded-full border border-amber-400/30 bg-amber-500/15 px-3 py-1">
                  Crédits + liste d’attente (rang) sur les cours
                </span>
                <span className="rounded-full border border-blue-400/30 bg-blue-500/15 px-3 py-1">
                  Agendas multi-rôles (élève / prof / admin)
                </span>
              </div>
            </div>
            <aside className="relative rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200 shadow-inner shadow-indigo-900/20">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Avancement</p>
                <span className="inline-flex items-center rounded-full border border-emerald-400/50 bg-emerald-500/20 px-3 py-1 text-[12px] font-semibold text-emerald-50 shadow-inner shadow-emerald-700/30">
                  Phase produit
                </span>
              </div>
              <div className="mt-3 grid gap-2">
                <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <div>
                    <p className="text-[12px] uppercase tracking-[0.12em] text-slate-400">S007 — Élève</p>
                    <p className="text-white font-semibold">Agendas + mini-jeux</p>
                    <p className="text-xs text-slate-400">Avancement 80% (planning élève livré)</p>
                  </div>
                  <span className="inline-flex min-w-[86px] items-center justify-center rounded-full border border-emerald-400/60 bg-emerald-500/25 px-3 py-1 text-[12px] font-semibold text-emerald-50 shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                    Livré
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <div>
                    <p className="text-[12px] uppercase tracking-[0.12em] text-slate-400">S006 — Admin</p>
                    <p className="text-white font-semibold">Studios/positions OK, reste factu/agenda</p>
                    <p className="text-xs text-slate-400">Avancement 45%</p>
                  </div>
                  <span className="inline-flex min-w-[86px] items-center justify-center rounded-full border border-amber-300 bg-amber-400/30 px-3 py-1 text-[12px] font-semibold text-amber-50 shadow-[0_0_16px_rgba(251,191,36,0.7)] animate-[pulse_1.5s_ease-in-out_infinite]">
                    En cours
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <div>
                    <p className="text-[12px] uppercase tracking-[0.12em] text-slate-400">S005 — Prof</p>
                    <p className="text-white font-semibold">Agenda studio + générateur + factu</p>
                    <p className="text-xs text-slate-400">Avancement 15%</p>
                  </div>
                  <span className="inline-flex min-w-[86px] items-center justify-center rounded-full border border-blue-400/60 bg-blue-500/25 px-3 py-1 text-[12px] font-semibold text-blue-50 shadow-inner shadow-blue-900/30">
                    À lancer
                  </span>
                </div>
              </div>
            </aside>
          </div>
        </details>
      </header>

      {session?.user?.role === "SCHOOL_ADMIN" && (
        <details className="panel group p-8 border-indigo-400/25 shadow-indigo-900/30">
          <summary className="flex cursor-pointer items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">Modules</h2>
              <p className="text-slate-300">
                Modules disponibles selon les rôles (élève, prof, admin)
              </p>
            </div>
            <div className="flex items-center gap-3">
              <HealthBadge />
              <span className="text-sm text-slate-300 transition-transform group-open:rotate-180">
                ▼
              </span>
            </div>
          </summary>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {moduleSections.map((module) => (
              <a
                key={module.title}
                href={module.href}
                className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:-translate-y-0.5 hover:border-indigo-300/70 hover:shadow-xl hover:shadow-indigo-900/30"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-cyan-400/10 opacity-0 transition group-hover:opacity-100" />
                <div className="relative">
                <div className="flex items-center gap-2 text-sm text-indigo-100">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-base">
                    {module.icon}
                  </span>
                  <span className="text-xs uppercase tracking-[0.14em] text-indigo-100">
                    Module
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-white">
                  {module.title}
                </h3>
                <p className="text-sm text-slate-300">{module.description}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/10 bg-indigo-500/15 px-3 py-1 text-[11px] font-semibold text-indigo-50">
                    {module.role}
                  </span>
                  <span className="rounded-full border border-amber-400/30 bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-50">
                    {module.status}
                  </span>
                </div>
                <div className="relative mt-2 flex items-center gap-2 text-sm font-semibold text-cyan-200">
                  <span>Voir la route</span>
                  <span className="transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </div>
                </div>
              </a>
            ))}
          </div>
        </details>
      )}

    </main>
  );
}
