import Link from "next/link";
import { getServerSession } from "next-auth";

import { SignOutButton } from "@/components/auth/SignOutButton";
import { HealthBadge } from "@/components/HealthBadge";
import { authOptions } from "@/lib/auth";
import { defaultHomeForRole } from "@/lib/rbac";

const moduleSections = [
  {
    title: "Positions",
    href: "/positions",
    description: "Base positions + médias, filtres, progression par élève.",
    status: "Étape 2",
    role: "Public / Prof",
  },
  {
    title: "Cours",
    href: "/app/teacher/courses",
    description: "Création cours, présences, notes et mise à jour progression.",
    status: "Étape 5",
    role: "Prof",
  },
  {
    title: "Élèves",
    href: "/app/teacher/students",
    description: "Fiches élèves, progression, blessures visibles par prof.",
    status: "Étapes 3-4",
    role: "Prof / Admin",
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
];

const buildSteps = [
  { label: "Step 0 — Bootstrap + health", done: true },
  { label: "Step 1 — Auth/RBAC (login + middleware)", done: true },
  { label: "Step 2 — Positions (browse + create prof)", done: true },
  { label: "Step 3 — Blessures élève (UI + prof)", done: true },
  { label: "Step 4 — Progression par position", done: true },
  { label: "Step 5 — Fiche cours (notes + progression)", done: true },
  { label: "Step 6 — Mini-jeu", done: true },
  { label: "Step 7 — Admin école", done: true },
];

export default async function Home() {
  const session = await getServerSession(authOptions);
  const homeForRole = defaultHomeForRole(session?.user?.role);

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-12 md:px-10">
      <section className="panel flex flex-wrap items-center justify-between gap-3 p-4 text-sm text-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.14em] text-cyan-200">
            Session
          </span>
          {session?.user ? (
            <>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                {session.user.email}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                Rôle : {session.user.role}
              </span>
              <Link
                href={homeForRole}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
              >
                Aller à ta vue
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-cyan-500 px-4 py-2 font-semibold text-slate-900 transition hover:bg-cyan-400"
            >
              Se connecter
            </Link>
          )}
        </div>
        <div className="text-xs text-slate-400">
          Accès différencié élève / prof / admin via NextAuth + RBAC.
        </div>
      </section>

      <header className="panel relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-transparent to-amber-400/10" />
        <div className="relative flex flex-col gap-4 p-10 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.18em] text-cyan-200">
              Pole App — MVP v0.1.0
            </p>
            <h1 className="text-3xl font-semibold leading-tight md:text-4xl">
              Suivi élève complet : positions, progression, cours et révision ludique.
            </h1>
            <p className="max-w-2xl text-slate-300">
              Une plateforme pour que profs et élèves alignent entraînement,
              sécurité et progression : base de positions, suivi des blessures,
              fiches cours et mini-jeu de révision. Cette homepage sert de guide
              vers chaque module clé.
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-slate-300">
              <span className="rounded-full bg-white/10 px-3 py-1">
                Accès différencié élève / prof / admin
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1">
                Suivi sécurité : blessures visibles par le prof
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1">
                Progression et révision des positions
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm text-slate-200 shadow-lg backdrop-blur">
            <p className="font-semibold text-white">Status build</p>
            <ul className="mt-2 space-y-1">
              {buildSteps.map((step) => (
                <li key={step.label} className="flex items-center gap-2">
                  <span
                    className={`inline-flex h-2.5 w-2.5 rounded-full ${
                      step.done ? "bg-emerald-400" : "bg-slate-500"
                    }`}
                  />
                  <span className={step.done ? "text-white" : "text-slate-300"}>
                    {step.label}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-slate-400">
              See `/health` for runtime status, `npm run db:seed` pour la base
              locale. Login via `/login` (seed: admin/teacher/student). Création
              position : `/teacher/positions/new`.
            </p>
          </div>
        </div>
      </header>

      <details className="panel group p-8">
        <summary className="flex cursor-pointer items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">Modules (Debug Technique)</h2>
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
              className="group flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:-translate-y-0.5 hover:border-cyan-400/60 hover:bg-white/10"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">
                  {module.title}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-slate-200">
                    {module.role}
                  </span>
                  <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-200">
                    {module.status}
                  </span>
                </div>
              </div>
              <p className="text-sm text-slate-300">{module.description}</p>
              <div className="flex items-center gap-2 text-sm font-semibold text-cyan-300">
                <span>Voir la route</span>
                <span className="transition-transform group-hover:translate-x-1">
                  →
                </span>
              </div>
            </a>
          ))}
        </div>
      </details>

      <details className="panel group p-8">
        <summary className="flex cursor-pointer items-center justify-between text-lg font-semibold text-white">
          <span>Nouveautés</span>
          <span className="text-sm text-slate-300 transition-transform group-open:rotate-180">
            ▼
          </span>
        </summary>
        <div className="mt-4 space-y-3 text-sm text-slate-300">
          <p>
            Dernière étape livrée : <strong>Step 7 — Admin école</strong>
            <br />
            Dashboard admin (stats école) et gestion des utilisateurs (création
            prof/élève/admin, premium, suppression) sur `/app/admin` et
            `/app/admin/users`.
          </p>
          <div className="space-y-1">
            <p className="text-slate-200">Historique rapide :</p>
            <ul className="space-y-1">
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
              <li>• Stabilisation & QA</li>
            </ul>
          </div>
        </div>
      </details>
    </main>
  );
}
