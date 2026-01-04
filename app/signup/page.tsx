import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { defaultHomeForRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { SignupForm } from "./SignupForm";

export default async function SignupPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role) {
    // Already logged in: send back to home to avoid creating duplicate accounts
    return (
      <main className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-6 py-12">
        <div className="panel w-full max-w-xl space-y-3 p-8 text-center text-slate-200">
          <p className="text-sm uppercase tracking-[0.14em] text-cyan-200">Inscription</p>
          <h1 className="text-2xl font-semibold text-white">Déjà connecté</h1>
          <p className="text-sm text-slate-300">
            Tu es déjà connecté, inutile de créer un nouveau compte.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link
              href={defaultHomeForRole(session.user.role)}
              className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-400"
            >
              Aller à mon espace
            </Link>
            <Link
              href="/"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
            >
              Accueil
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const [schools, resolvedParams] = await Promise.all([
    prisma.school.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    Promise.resolve(searchParams),
  ]);
  const error = resolvedParams?.error;

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-4 py-10 md:px-6">
      <section className="panel w-full max-w-xl border-indigo-400/25 p-8 shadow-indigo-900/30 md:p-10">
        <p className="text-sm uppercase tracking-[0.14em] text-cyan-200">Inscription</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Créer un compte élève</h1>
        <p className="mt-2 text-slate-300">
          Création self-serve réservée aux élèves. Les comptes prof/admin restent gérés par l’école.
        </p>

        {error && (
          <p className="mt-3 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
            {error}
          </p>
        )}

        <SignupForm schools={schools} error={error} />
      </section>
    </main>
  );
}
