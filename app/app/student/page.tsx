import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import Link from "next/link";

export default async function StudentDashboard() {
  const session = await getServerSession(authOptions);
  const isPremium = Boolean(session?.user?.isPremium);
  const displayName =
    session?.user?.name?.split(" ")[0] ??
    session?.user?.name ??
    session?.user?.email ??
    "élève";

  return (
    <main className="grid gap-6">
      <section className="panel space-y-4 p-6">
        <h2 className="text-xl font-semibold text-white">Bonjour {displayName}</h2>
        <p className="text-slate-300">
          Accès réservé aux rôles étudiant. Suis ta progression, tes blessures et révise via le mini-jeu.
        </p>
      </section>

      <section className="panel p-6">
        <h3 className="text-lg font-semibold text-white">
          Tes modules et actions
        </h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Link
            href="/app/student/progress"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
              Progression
            </p>
            <p className="text-base font-semibold text-white">
              Voir ta progression par position
            </p>
            <p className="text-sm text-slate-300">
              Accès complet si premium, sinon positions vues en cours.
            </p>
          </Link>
          <Link
            href="/app/student/injuries"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
              Blessures
            </p>
            <p className="text-base font-semibold text-white">
              Déclarer et gérer tes blessures
            </p>
            <p className="text-sm text-slate-300">
              Permet au prof de tenir compte des contre-indications.
            </p>
          </Link>
          <Link
            href="/app/student/courses"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
              Cours
            </p>
            <p className="text-base font-semibold text-white">
              Historique de cours
            </p>
            <p className="text-sm text-slate-300">
              Voir les cours où tu es présent et les positions travaillées.
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
              Consulter les figures
            </p>
            <p className="text-sm text-slate-300">
              Parcours filtrable des positions (images seed). Accès complet si premium, sinon selon progression.
            </p>
          </Link>
          <Link
            href="/app/student/game"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
              Mini-jeu
            </p>
            <p className="text-base font-semibold text-white">
              Quiz photo → nom
            </p>
            <p className="text-sm text-slate-300">
              Pool basé sur tes positions débloquées ({isPremium ? "ou toutes si premium" : "libérées via cours"}).
            </p>
          </Link>
        </div>
      </section>
    </main>
  );
}
