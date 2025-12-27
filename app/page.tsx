import Link from "next/link";
import { getServerSession } from "next-auth";

import { SignOutButton } from "@/components/auth/SignOutButton";
import HealthBadge from "@/components/HealthBadge";
import { authOptions } from "@/lib/auth";
import { defaultHomeForRole } from "@/lib/rbac";
import { CircularRedFox, PlainRedFox } from "@/components/FoxVignette";
import packageJson from "../package.json";

const appVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? packageJson.version ?? "0.0.0";
const billingStatus = `Livré (${appVersion})`;

const moduleSections = [
  {
    title: "Super Admin",
    href: "/super-admin",
    description: "Backoffice global : écoles, admins, TVA/devise, offres abonnements/packs, audit.",
    status: "v0.8.2",
    role: "Super Admin",
    icon: "🛡️",
  },
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
    status: billingStatus,
    role: "Admin",
    icon: "💼",
  },
  {
    title: "Facturation (prof)",
    href: "/app/teacher/billing",
    description: "Vue lecture factures de mes cours (montants/statuts).",
    status: billingStatus,
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
  SUPER_ADMIN: "Super Admin",
};

export default async function Home() {
  const session = await getServerSession(authOptions);
  const homeForRole = defaultHomeForRole(session?.user?.role);
  const isAuthenticated = Boolean(session?.user);

  return (
    <main className="relative mx-auto flex min-h-screen max-w-6xl flex-col gap-3 px-2 py-6 md:gap-6 md:px-8 md:py-10">
      <section className="panel relative min-h-[50px] overflow-visible p-5 text-sm text-slate-200 md:min-h-[115px]">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-transparent to-cyan-400/10" />
        <div className="relative grid h-full grid-cols-1 items-center gap-4 md:grid-cols-[1fr_auto_1fr] md:gap-6">
          <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start">
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
          <div className="flex justify-center">
            <CircularRedFox sizeClass="h-20 w-20 md:h-28 md:w-28" />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 md:justify-end">
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
        </div>
      </section>

      <header className="panel relative overflow-hidden p-6">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-transparent to-cyan-400/10" />
        <details className="relative flex flex-col gap-4 group" open>
          <summary className="flex w-full cursor-pointer items-center justify-between gap-3 text-left text-white">
            <div className="space-y-1">
              <p className="text-sm uppercase tracking-[0.18em] text-cyan-200">
                Pole App — v{appVersion}
              </p>
            </div>
            <span className="text-sm text-slate-300 transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="relative grid gap-4 md:grid-cols-[2fr_1.05fr]">
            <div className="space-y-3">
              <div className="max-w-2xl space-y-3 text-slate-200">
                <p>
                  <span className="font-semibold">Suite pole & aerial complète</span> :{" "}
                  <span className="font-semibold">catalogue positions photo/vidéo</span> (niveaux, badges discipline,
                  créateur, badge vidéo) avec <span className="font-semibold">progression gamifiée</span> (mastery, “vu”,
                  niveaux unifiés, badges “Créé par” et disciplines colorées) et{" "}
                  <span className="font-semibold">mini-jeux</span> pour ancrer les figures (6 modes, leaderboard).{" "}
                  <span className="font-semibold">Agendas interactifs</span> élève/prof/admin (mois + semaine, filtres
                  studio/prof/discipline/recherche, prochaines séances, navigation liste/agenda) et{" "}
                  <span className="font-semibold">navigation multi-rôles sécurisée</span> pour passer des cours aux
                  positions sans friction, retour contextuel conservé.
                </p>
                <p>
                  <span className="font-semibold">Expérience élève</span> : découverte guidée des positions débloquées
                  via les cours, accès premium clair, compteur “vu”/progression, mini-jeux pour réviser, agenda personnel
                  (liste/agenda) avec filtres mémorisés et achats crédits/abos en un clic.
                </p>
                <p>
                  <span className="font-semibold">Expérience professeur</span> : gestion rapide des cours (liste + agenda
                  semaine/mois), filtres studio/prof/discipline, accès direct aux positions avec droits d’édition,
                  suivi blessures/progression des élèves, et navigation retour vers la liste pour garder le contexte.
                </p>
                <p>
                  <span className="font-semibold">Expérience école/admin</span> : pilotage des utilisateurs, studios et
                  partenaires, agenda consolidé de l’école, filtres persistés, stats rapides et harmonisation des panneaux
                  (création prof/élève/admin, studios/partenaires, promo/dégrad). Navigation cohérente et panels glassy
                  pour une vision claire de l’activité.
                </p>
                <p>
                  Côté business : <span className="font-semibold">achats crédits/abonnements</span> élève (TVA/€,
                  historique, badges premium), <span className="font-semibold">facturation intégrée</span> (statuts
                  Générée/Envoyée/Reçue/Payée, exports CSV, toasts, filtres persistés) et{" "}
                  <span className="font-semibold">offres/packs super-admin</span> (devise/TVA, panels repliables,
                  pagination). <span className="font-semibold">Panels backoffice harmonisés</span> et{" "}
                  <span className="font-semibold">thème glassy</span> aux{" "}
                  <span className="font-semibold">accents fuchsia</span> pour sublimer cours, positions et dashboards,
                  avec gradients atténués pour la lisibilité.
                </p>
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
                  Disciplines colorées + badges créateur
                </span>
                <span className="rounded-full border border-violet-400/40 bg-violet-500/20 px-3 py-1">
                  Cours avec crédits + liste d’attente
                </span>
                <span className="rounded-full border border-amber-400/30 bg-amber-500/15 px-3 py-1">
                  Facturation statuts + export CSV
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
                  Offres/packs super-admin (TVA/EUR)
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
