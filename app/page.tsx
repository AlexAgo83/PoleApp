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
    status: "Étape 8",
    role: "Élève / Professeur / Admin",
  },
  {
    title: "Cours",
    href: "/app/teacher/courses",
    description: "Création cours, présences, notes et mise à jour progression.",
    status: "Étape 5",
    role: "Professeur",
  },
  {
    title: "Élèves",
    href: "/app/teacher/students",
    description:
      "Fiches élèves, progression, blessures visibles par professeur.",
    status: "Étapes 3-4",
    role: "Professeur / Admin",
  },
  {
    title: "Mini-jeu",
    href: "/app/student/game",
    description: "Photo → nom, pool positions débloquées, score final.",
    status: "Étape 6",
    role: "Student",
  },
  {
    title: "Admin école",
    href: "/admin",
    description: "Pilotage école : utilisateurs, stats rapides.",
    status: "Étape 7",
    role: "Admin",
  },
  {
    title: "Profile",
    href: "/app/profile",
    description: "Consulter et mettre à jour prénom/nom, voir email, rôle et école.",
    status: "Étape 8",
    role: "Élève / Professeur / Admin",
  },
];

const buildSteps = [
  { label: "Step 0 — Bootstrap + health", done: true },
  { label: "Step 1 — Auth/RBAC (login + middleware)", done: true },
  { label: "Step 2 — Positions (browse + create professeur)", done: true },
  { label: "Step 3 — Blessures élève (UI + professeur)", done: true },
  { label: "Step 4 — Progression par position", done: true },
  { label: "Step 5 — Fiche cours (notes + progression)", done: true },
  { label: "Step 6 — Mini-jeu", done: true },
  { label: "Step 7 — Admin école", done: true },
  { label: "Step 8 — Navigation par rôle + Positions unifiées", done: true },
  { label: "Step 9 — Discovery QA", done: false },
];

export default async function Home() {
  const session = await getServerSession(authOptions);
  const homeForRole = defaultHomeForRole(session?.user?.role);
  const isAuthenticated = Boolean(session?.user);

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-10 md:px-8">
      <section className="panel relative flex flex-col gap-3 overflow-hidden p-5 text-sm text-slate-200 md:flex-row md:items-center md:justify-between">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-transparent to-cyan-400/10" />
        <div className="relative flex flex-wrap items-center gap-2">
          {session?.user ? (
            <>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-indigo-500/15 px-3 py-1 text-xs uppercase tracking-[0.14em] text-indigo-100">
                Session
                <span className="text-white text-[11px] normal-case tracking-normal">
                  {session.user.email}
                </span>
              </span>
              <span className="rounded-full border border-white/15 bg-cyan-500/15 px-3 py-1 text-xs uppercase tracking-[0.14em] text-cyan-100">
                Rôle : {session.user.role}
              </span>
            </>
          ) : (
            <span className="text-xs uppercase tracking-[0.18em] text-cyan-200">
              Pole App — MVP v0.2.1
            </span>
          )}
        </div>
        <div className="relative flex flex-wrap items-center gap-2 md:justify-end">
          {session?.user ? (
            <>
              <Link
                href={homeForRole}
                role="button"
                className="rounded-full border border-indigo-400/60 bg-indigo-500/20 px-3 py-1.5 font-semibold text-white transition hover:border-indigo-300 hover:bg-indigo-500/30"
              >
                Mon espace
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 px-4 py-2 font-semibold text-slate-900 shadow-lg transition hover:brightness-110"
              style={{ flexShrink: 0, whiteSpace: "nowrap" }}
            >
              Se connecter
            </Link>
          )}
        </div>
      </section>

      <header className="panel relative overflow-hidden p-6">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-transparent to-cyan-400/10" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            {session?.user && (
              <p className="text-sm uppercase tracking-[0.18em] text-cyan-200">
                Pole App — MVP v0.2.1
              </p>
            )}
            <h1 className="text-3xl font-semibold leading-tight text-white md:text-4xl">
              Suivi élève complet : positions, progression, cours et révision ludique.
            </h1>
            <p className="max-w-2xl text-slate-200">
              Une plateforme pour que professeurs et élèves alignent entraînement,
              sécurité et progression : base de positions, suivi des blessures,
              fiches cours et mini-jeu de révision. Cette homepage sert de guide
              vers chaque module clé, avec un bandeau de navigation commun par rôle.
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-slate-200">
              <span className="rounded-full border border-indigo-400/30 bg-indigo-500/15 px-3 py-1">
                Accès différencié élève / prof / admin
              </span>
              <span className="rounded-full border border-cyan-400/30 bg-cyan-500/15 px-3 py-1">
                Suivi sécurité : blessures visibles par le professeur
              </span>
              <span className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1">
                Progression et révision des positions
              </span>
              <span className="rounded-full border border-purple-400/30 bg-purple-500/15 px-3 py-1">
                Navigation unifiée (session, rôle, Mon espace)
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-indigo-400/20 bg-white/5 px-6 py-4 text-sm text-slate-200 shadow-lg shadow-indigo-500/20 backdrop-blur">
            {/* Mobile: collapsed by défaut */}
            <details className="group md:hidden">
              <summary className="flex cursor-pointer items-center justify-between gap-3">
                <span className="font-semibold text-white">Status build</span>
                <span className="text-sm text-slate-300 transition-transform group-open:rotate-180">
                  ▼
                </span>
              </summary>
              <div className="group-open:mt-3 group-open:space-y-3">
                <ul className="space-y-1">
                  {buildSteps.map((step) => (
                    <li key={step.label} className="flex items-center gap-2">
                      <span
                        className={`inline-flex h-2.5 w-2.5 rounded-full ${
                          step.done ? "bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]" : "bg-slate-600"
                        }`}
                      />
                      <span
                        className={step.done ? "text-white" : "text-slate-300"}
                      >
                        {step.label}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-slate-400">
                  See `/health` for runtime status, `npm run db:seed` pour la base
                  locale. Login via `/login` (seed: admin/teacher/student).
                  Création position : `/teacher/positions/new`.
                </p>
              </div>
            </details>

            {/* Desktop : expanded par défaut */}
            <details className="group hidden md:block" open>
              <summary className="flex cursor-pointer items-center justify-between gap-3">
                <span className="font-semibold text-white">Status build</span>
                <span className="text-sm text-slate-300 transition-transform group-open:rotate-180">
                  ▼
                </span>
              </summary>
              <div className="group-open:mt-3 group-open:space-y-3">
                <ul className="space-y-1">
                  {buildSteps.map((step) => (
                    <li key={step.label} className="flex items-center gap-2">
                      <span
                        className={`inline-flex h-2.5 w-2.5 rounded-full ${
                          step.done ? "bg-emerald-400" : "bg-slate-500"
                        }`}
                      />
                      <span
                        className={step.done ? "text-white" : "text-slate-300"}
                      >
                        {step.label}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-slate-400">
                  See `/health` for runtime status, `npm run db:seed` pour la base
                  locale. Login via `/login` (seed: admin/teacher/student).
                  Création position : `/teacher/positions/new`.
                </p>
              </div>
            </details>
          </div>
        </div>
      </header>

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

      <details className="panel group p-8">
        <summary className="flex cursor-pointer items-center justify-between text-2xl font-semibold text-white">
          <span>Nouveautés</span>
          <span className="text-sm text-slate-300 transition-transform group-open:rotate-180">
            ▼
          </span>
        </summary>
        <div className="mt-4 space-y-3 text-sm text-slate-300">
          <p>
            Dernière étape livrée :{" "}
            <strong>Step 8 — Navigation par rôle & Positions unifiées</strong>
            <br />
            Bandeau session/rôle/Accueil harmonisé, positions partagées en 2
            colonnes avec retour contextuel et édition réservée Professeur/Admin.
          </p>
          <div className="space-y-1">
            <p className="text-slate-200">Historique rapide :</p>
            <ul className="space-y-1">
              <li>• Step 8 : Navigation — bandeau commun, positions unifiées</li>
              <li>• Step 7 : Admin — dashboard + gestion utilisateurs</li>
              <li>• Step 6 : Mini-jeu — quiz photo→nom sur positions débloquées</li>
              <li>• Step 5 : Cours — création + progression auto</li>
              <li>• Step 4 : Progression — élève/prof</li>
              <li>• Step 3 : Blessures — déclaration élève, lecture prof</li>
              <li>• Step 2 : Positions — liste/détail + création prof</li>
              <li>• Step 1 : Auth/RBAC — login credentials + middleware</li>
              <li>• Step 0 : Bootstrap — Next.js + Prisma + seed + /health</li>
            </ul>
          </div>
          <div className="space-y-1">
            <p className="text-slate-200">Prochain focus :</p>
            <ul className="space-y-1">
              <li>• Step 9 : Discovery QA</li>
              <li>• À cadrer ensuite : journal d’audit, contre-indications, badges/UX</li>
            </ul>
          </div>
        </div>
      </details>
    </main>
  );
}
