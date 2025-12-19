const moduleSections = [
  {
    title: "Positions",
    href: "/positions",
    description: "Base positions + médias, filtres, progression par élève.",
    status: "Étape 2",
  },
  {
    title: "Cours",
    href: "/teacher/courses",
    description: "Création cours, présences, notes et mise à jour progression.",
    status: "Étape 5",
  },
  {
    title: "Élèves",
    href: "/teacher/students",
    description: "Fiches élèves, progression, blessures visibles par prof.",
    status: "Étapes 3-4",
  },
  {
    title: "Mini-jeu",
    href: "/student/game",
    description: "Photo → nom, pool positions débloquées, score final.",
    status: "Étape 6",
  },
  {
    title: "Admin école",
    href: "/admin",
    description: "Pilotage école : utilisateurs, stats rapides.",
    status: "Étape 7",
  },
];

const buildSteps = [
  { label: "Step 0 — Bootstrap + health", done: true },
  { label: "Step 1 — Auth/RBAC (login + middleware)", done: true },
  { label: "Step 2 — Positions (browse + create prof)", done: true },
  { label: "Step 3 — Blessures élève (UI + prof)", done: true },
  { label: "Step 4 — Progression par position", done: false },
  { label: "Step 5 — Fiche cours (notes + progression)", done: false },
  { label: "Step 6 — Mini-jeu", done: false },
  { label: "Step 7 — Admin école", done: false },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-12 md:px-10">
      <header className="panel relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-transparent to-amber-400/10" />
        <div className="relative flex flex-col gap-4 p-10 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.18em] text-cyan-200">
              Pole App — MVP
            </p>
            <h1 className="text-3xl font-semibold leading-tight md:text-4xl">
              Positions, élèves, cours et mini-jeu, réunis en une web app rapide.
            </h1>
            <p className="max-w-2xl text-slate-300">
              Lecture des specs (Markdown) → implémentation Next.js, Prisma,
              Tailwind. Cette homepage servira de table d’orientation pour les
              modules à venir.
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-slate-300">
              <span className="rounded-full bg-white/10 px-3 py-1">
                Next.js App Router
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1">
                Prisma + PostgreSQL
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1">
                Auth + RBAC (prochaines étapes)
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

      <section className="panel p-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">Modules</h2>
            <p className="text-slate-300">
              Routes clés décrites dans 04_ROUTES_AND_SCREENS.md
            </p>
          </div>
          <a
            href="/health"
            className="inline-flex items-center gap-2 rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            Vérifier /health
          </a>
        </div>
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
                <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-200">
                  {module.status}
                </span>
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
      </section>

      <section className="panel p-8">
        <div className="space-y-3">
          <h3 className="text-xl font-semibold text-white">Nouveautés</h3>
          <p className="text-slate-300">
            Dernière étape livrée : <strong>Step 3 — Blessures</strong>
            <br />
            Élève : déclaration/édition/suppression sur `/app/student/injuries`.
            Prof : lecture des blessures élèves dans `/app/teacher/students` et
            la fiche détail.
          </p>
          <div className="space-y-2 text-sm text-slate-300">
            <p className="text-slate-200">Historique rapide :</p>
            <ul className="space-y-1">
              <li>• Step 2 : Positions — liste/détail + création prof</li>
              <li>• Step 1 : Auth/RBAC — login credentials + middleware</li>
              <li>• Step 0 : Bootstrap — Next.js + Prisma + seed + /health</li>
            </ul>
          </div>
          <div className="space-y-1 text-sm text-slate-300">
            <p className="text-slate-200">Prochain focus :</p>
            <ul className="space-y-1">
              <li>• Step 4 : Progression par position (élève/prof)</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
