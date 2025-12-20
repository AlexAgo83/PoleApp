import Link from "next/link";
import { getServerSession } from "next-auth";

import { createUserAction, deleteUserAction, updateUserAction } from "./actions";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?:
    | {
        success?: string;
        error?: string;
        page?: string;
        role?: string;
        premium?: string;
        q?: string;
      }
    | Promise<{
        success?: string;
        error?: string;
        page?: string;
        role?: string;
        premium?: string;
        q?: string;
      }>;
}) {
  const params = (await Promise.resolve(searchParams)) ?? {};
  const rawPage = Number(params.page ?? "1");
  const roleFilter =
    params.role && ["STUDENT", "TEACHER", "SCHOOL_ADMIN"].includes(params.role)
      ? params.role
      : undefined;
  const premiumFilter = params.premium === "true";
  const q = params.q?.toString().trim() || "";
  const activeFilters = [roleFilter, premiumFilter ? "premium" : null, q && q.length > 0 ? "q" : null].filter(Boolean).length;
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

  const whereClause = {
    schoolId: session.user.schoolId,
    ...(roleFilter ? { role: roleFilter as any } : {}),
    ...(premiumFilter ? { isPremium: true } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const totalCount = await prisma.user.count({
    where: whereClause,
  });
  const totalPages = Math.max(1, Math.ceil(totalCount / 10));
  const currentPage = Math.min(Math.max(1, rawPage || 1), totalPages);
  const skip = (currentPage - 1) * 10;

  const users = await prisma.user.findMany({
    where: whereClause,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isPremium: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    skip,
    take: 10,
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
            Prénom
            <input
              name="firstName"
              type="text"
              required
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
            />
          </label>
          <label className="grid gap-1 text-sm text-slate-200">
            Nom
            <input
              name="lastName"
              type="text"
              required
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
            />
          </label>
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
              defaultValue="change-me-password"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
            />
          </label>
          <label className="mt-2 inline-flex items-center gap-2 text-sm text-slate-200">
            <input type="checkbox" name="isPremium" className="h-4 w-4" />
            Premium ?
          </label>
          <div className="flex items-end justify-end md:col-span-2">
            <button
              type="submit"
              className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-400"
            >
              Créer
            </button>
          </div>
        </form>
      </section>

      <section className="panel space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-white">Utilisateurs existants</h2>
          <p className="text-sm text-slate-300">
            Page {currentPage} / {totalPages} · {totalCount} comptes
          </p>
        </div>
        <details className="group" open>
          <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-white">
            <span className="inline-flex items-center gap-2">
              <span>Filtres</span>
              {activeFilters > 0 && (
                <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[11px] font-semibold text-cyan-100">
                  {activeFilters}
                </span>
              )}
            </span>
            <span className="text-xs text-slate-300 transition-transform group-open:rotate-180">▼</span>
          </summary>
          <form
            key={`filters-${roleFilter ?? "all"}-${premiumFilter ? "premium" : "all"}-${q || "all"}`}
            method="get"
            className="mt-3 grid w-full gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-indigo-900/20 md:grid-cols-4 md:items-end"
          >
            <label className="text-sm text-slate-200 md:col-span-2">
              Recherche (nom ou email)
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Nom, prénom ou email"
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              />
            </label>
            <label className="text-sm text-slate-200">
              Rôle
              <select
                key={roleFilter ?? "all-roles"}
                name="role"
                defaultValue={roleFilter ?? ""}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              >
                <option value="">Tous les rôles</option>
                <option value="STUDENT">Student</option>
                <option value="TEACHER">Teacher</option>
                <option value="SCHOOL_ADMIN">School admin</option>
              </select>
            </label>
            <label className="mt-1 inline-flex flex-wrap items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-200">
              <input
                type="checkbox"
                name="premium"
                value="true"
                defaultChecked={premiumFilter}
                key={premiumFilter ? "premium-only" : "all-users"}
                className="h-4 w-4 rounded border-white/20 bg-white/5"
              />
              Premium uniquement
            </label>
            <div className="md:col-span-4 flex flex-wrap items-center justify-end gap-2">
              <button
                type="submit"
                className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-400"
              >
                Filtrer
              </button>
              <Link
                href="/app/admin/users"
                className="rounded-full border border-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
              >
                Réinitialiser
              </Link>
            </div>
          </form>
        </details>
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
              <div className="flex w-full flex-col gap-2 text-sm">
                <form
                  action={updateUserAction}
                  className="flex flex-wrap items-center gap-2"
                  id={`update-${user.id}`}
                >
                  <input type="hidden" name="userId" value={user.id} />
                  <input
                    type="text"
                    name="firstName"
                    defaultValue={user.name?.split(" ")[0] ?? ""}
                    placeholder="Prénom"
                    className="min-w-[120px] rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-white"
                    required
                  />
                  <input
                    type="text"
                    name="lastName"
                    defaultValue={user.name?.split(" ").slice(1).join(" ") ?? ""}
                    placeholder="Nom"
                    className="min-w-[120px] rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-white"
                    required
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
                </form>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="submit"
                    form={`update-${user.id}`}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-2 font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
                  >
                    Mettre à jour
                  </button>
                  <form action={deleteUserAction}>
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
            </div>
          ))}
          {users.length === 0 && <p className="py-4 text-slate-200">Aucun utilisateur.</p>}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2 text-sm text-slate-200">
          <Link
            href={`/app/admin/users?page=${Math.max(1, currentPage - 1)}${roleFilter ? `&role=${roleFilter}` : ""}${premiumFilter ? "&premium=true" : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            aria-disabled={currentPage === 1}
            className={`rounded-full border border-white/10 px-3 py-2 ${
              currentPage === 1
                ? "cursor-not-allowed text-slate-500"
                : "bg-white/5 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
            }`}
          >
            Précédent
          </Link>
          <Link
            href={`/app/admin/users?page=${Math.min(totalPages, currentPage + 1)}${roleFilter ? `&role=${roleFilter}` : ""}${premiumFilter ? "&premium=true" : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            aria-disabled={currentPage === totalPages}
            className={`rounded-full border border-white/10 px-3 py-2 ${
              currentPage === totalPages
                ? "cursor-not-allowed text-slate-500"
                : "bg-white/5 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
            }`}
          >
            Suivant
          </Link>
        </div>
      </section>
    </main>
  );
}
