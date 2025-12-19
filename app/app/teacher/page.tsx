import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

export default async function TeacherDashboard() {
  const session = await getServerSession(authOptions);
  const displayName =
    session?.user?.name?.split(" ")[0] ??
    session?.user?.name ??
    session?.user?.email ??
    "professeur";

  return (
    <main className="grid gap-6">
      <section className="panel space-y-4 p-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-white">
            Bonjour {displayName}
          </h2>
          <Link
            href="/app/profile"
            className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-white/90 transition hover:border-cyan-400/70 hover:text-white"
            aria-label="Éditer le profil"
          >
            Éditer
          </Link>
        </div>
        <p className="text-slate-300">
          Accès réservé aux profs/admins de l’école pour gérer élèves, cours et progression.
        </p>
      </section>

      <section className="panel p-6">
        <h3 className="text-lg font-semibold text-white">
          Modules et actions prof
        </h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Link
            href="/app/teacher/students"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
              Élèves
            </p>
            <p className="text-base font-semibold text-white">
              Liste et fiches élèves
          </p>
          <p className="text-sm text-slate-300">
            Voir blessures et progression par position, filtré sur ton école.
          </p>
        </Link>
          <Link
            href="/app/teacher/courses"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
              Cours
            </p>
            <p className="text-base font-semibold text-white">
              Créer et suivre les cours
          </p>
          <p className="text-sm text-slate-300">
            Présences, positions, notes élève×position, impact progression.
          </p>
        </Link>
        <Link
            href="/positions"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
              Positions
            </p>
            <p className="text-base font-semibold text-white">
              Gérer les positions
            </p>
            <p className="text-sm text-slate-300">
              Voir/ajouter des positions (types, niveaux, médias) utilisables en cours.
            </p>
          </Link>
          <Link
            href="/app/admin"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
              Admin (si autorisé)
            </p>
            <p className="text-base font-semibold text-white">
              Gestion école
            </p>
            <p className="text-sm text-slate-300">
              Dashboard et gestion utilisateurs (réservé School Admin).
            </p>
          </Link>
        </div>
      </section>
    </main>
  );
}
