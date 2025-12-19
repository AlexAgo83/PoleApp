import Link from "next/link";
import { getServerSession } from "next-auth";

import { createUserAction, deleteUserAction, updateUserAction } from "./actions";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: { success?: string; error?: string } | Promise<{ success?: string; error?: string }>;
}) {
  const params = await searchParams;
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SCHOOL_ADMIN") {
    return null;
  }
  if (!session.user.schoolId) {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-10">
        <section className="panel p-6">
          <h1 className="text-3xl font-semibold text-white">Utilisateurs</h1>
          <p className="text-slate-300">Aucune école associée à ce compte admin.</p>
        </section>
      </main>
    );
  }

  const users = await prisma.user.findMany({
    where: { schoolId: session.user.schoolId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isPremium: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-10">
      <header className="panel p-6">
        <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Admin</p>
        <h1 className="text-3xl font-semibold text-white">Utilisateurs</h1>
        <p className="text-sm text-slate-300">
          Crée, met à jour ou supprime des comptes rattachés à ton école.
        </p>
        <div className="mt-3 text-sm text-slate-200">
          <p>
            Tu es connecté en <strong>{session.user.email}</strong>
          </p>
        </div>
        {(params?.success || params?.error) && (
          <p
            className={`mt-3 text-sm ${params?.error ? "text-amber-300" : "text-emerald-300"}`}
          >
            {params?.error ?? params?.success}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link
            href="/app/admin"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            ↩ Dashboard admin
          </Link>
        </div>
      </header>

      <section className="panel p-6">
        <h2 className="text-xl font-semibold text-white">Créer un utilisateur</h2>
        <p className="text-sm text-slate-300">
          Un mot de passe par défaut est prérempli, change-le si besoin.
        </p>
        <form action={createUserAction} className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm text-slate-200">
            Email
            <input
              name="email"
              type="email"
              required
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
            />
          </label>
          <label className="grid gap-1 text-sm text-slate-200">
            Nom (optionnel)
            <input
              name="name"
              type="text"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
            />
          </label>
          <label className="grid gap-1 text-sm text-slate-200">
            Rôle
            <select
              name="role"
              defaultValue="TEACHER"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
            >
              <option value="TEACHER">Teacher</option>
              <option value="STUDENT">Student</option>
              <option value="SCHOOL_ADMIN">School admin</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm text-slate-200">
            Mot de passe
            <input
              name="password"
              type="text"
              required
              defaultValue="poleapp123"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
            />
          </label>
          <label className="mt-2 inline-flex items-center gap-2 text-sm text-slate-200">
            <input type="checkbox" name="isPremium" className="h-4 w-4" />
            Premium ?
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-400"
            >
              Créer
            </button>
          </div>
        </form>
      </section>

      <section className="panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-white">Utilisateurs existants</h2>
          <p className="text-sm text-slate-300">{users.length} comptes</p>
        </div>
        <div className="mt-4 divide-y divide-white/5">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="text-base font-semibold text-white">
                  {user.name ?? user.email}
                </p>
                <p className="text-sm text-slate-300">
                  {user.email} · {user.role} · {user.isPremium ? "Premium" : "Free"}
                </p>
                <p className="text-xs text-slate-400">
                  Créé le {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <form
                  action={updateUserAction}
                  className="flex flex-wrap items-center gap-2"
                  id={`update-${user.id}`}
                >
                  <input type="hidden" name="userId" value={user.id} />
                  <input
                    type="text"
                    name="name"
                    defaultValue={user.name ?? ""}
                    placeholder="Nom"
                    className="min-w-[140px] rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-white"
                  />
                  <select
                    name="role"
                    defaultValue={user.role}
                    className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-white"
                  >
                    <option value="TEACHER">Teacher</option>
                    <option value="STUDENT">Student</option>
                    <option value="SCHOOL_ADMIN">School admin</option>
                  </select>
                  <label className="inline-flex items-center gap-1 text-slate-200">
                    <input
                      type="checkbox"
                      name="isPremium"
                      defaultChecked={user.isPremium}
                      className="h-4 w-4"
                    />
                    Premium
                  </label>
                  <button
                    type="submit"
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-2 font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
                  >
                    Mettre à jour
                  </button>
                </form>
                <form action={deleteUserAction} className="mt-1">
                  <input type="hidden" name="userId" value={user.id} />
                  <button
                    type="submit"
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-2 font-semibold text-amber-200 transition hover:border-red-500/70 hover:text-white"
                  >
                    Supprimer
                  </button>
                </form>
              </div>
            </div>
          ))}
          {users.length === 0 && <p className="py-4 text-slate-200">Aucun utilisateur.</p>}
        </div>
      </section>
    </main>
  );
}
