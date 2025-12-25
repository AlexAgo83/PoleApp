import Link from "next/link";
import { getServerSession } from "next-auth";

import { signupStudentAction } from "./actions";
import { authOptions } from "@/lib/auth";
import { defaultHomeForRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

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

        <form action={signupStudentAction} className="mt-6 space-y-5">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm text-slate-200">
              Prénom (optionnel)
              <input
                name="firstName"
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-indigo-400"
                autoComplete="given-name"
              />
            </label>
            <label className="text-sm text-slate-200">
              Nom (optionnel)
              <input
                name="lastName"
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-indigo-400"
                autoComplete="family-name"
              />
            </label>
          </div>

          <label className="text-sm text-slate-200">
            Email
            <input
              name="email"
              type="email"
              required
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-indigo-400"
              autoComplete="email"
            />
          </label>

          <label className="text-sm text-slate-200">
            Mot de passe
            <input
              name="password"
              type="password"
              required
              minLength={8}
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-indigo-400"
              autoComplete="new-password"
            />
            <span className="mt-1 block text-xs text-slate-400">
              Minimum 8 caractères. L’email doit être unique.
            </span>
          </label>

          <div className="space-y-2">
            <label className="text-sm text-slate-200">École</label>
            <select
              name="schoolId"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-indigo-400"
            >
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap justify-between gap-3 text-sm text-slate-200">
            <Link
              href="/login"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 font-semibold text-white transition hover:border-indigo-300/70 hover:bg-white/10"
            >
              Déjà inscrit ? Connexion
            </Link>
            <button
              type="submit"
              className="rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 px-4 py-2 font-semibold text-white shadow-lg transition hover:brightness-110"
            >
              Créer mon compte élève
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
