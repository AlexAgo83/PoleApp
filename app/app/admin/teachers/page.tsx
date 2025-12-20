import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 10;

type SearchParams =
  | {
      page?: string;
      q?: string;
      premium?: string;
    }
  | Promise<{
      page?: string;
      q?: string;
      premium?: string;
    }>;

export default async function AdminTeachersPage({ searchParams }: { searchParams?: SearchParams }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SCHOOL_ADMIN") {
    redirect("/access-denied");
  }
  if (!session.user.schoolId) {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-3 px-0 py-6 md:gap-6 md:px-8 md:py-10">
        <section className="panel p-4 md:p-6">
          <h1 className="text-3xl font-semibold text-white">Professeurs</h1>
          <p className="text-slate-300">Aucune école associée à ce compte.</p>
        </section>
      </main>
    );
  }

  const params = (await Promise.resolve(searchParams)) ?? {};
  const rawPage = Number(params.page ?? "1");
  const currentPage = Math.max(1, Number.isFinite(rawPage) ? rawPage : 1);
  const q = params.q?.toString().trim() || "";
  const premiumFilter = params.premium === "true";
  const activeFilters = [q && q.length > 0 ? "q" : null, premiumFilter ? "premium" : null].filter(Boolean)
    .length;

  const whereClause: Prisma.UserWhereInput = {
    schoolId: session.user.schoolId,
    role: "TEACHER",
    ...(premiumFilter ? { isPremium: true } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: Prisma.QueryMode.insensitive } },
            { email: { contains: q, mode: Prisma.QueryMode.insensitive } },
          ],
        }
      : {}),
  };

  const totalCount = await prisma.user.count({ where: whereClause });
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const skip = (safePage - 1) * PAGE_SIZE;

  const teachers = await prisma.user.findMany({
    where: whereClause,
    select: { id: true, name: true, email: true, isPremium: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    skip,
    take: PAGE_SIZE,
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-3 px-0 py-6 md:gap-6 md:px-8 md:py-10">
      <header className="panel p-4 md:p-6">
        <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Admin</p>
        <h1 className="text-3xl font-semibold text-white">Professeurs</h1>
        <p className="text-sm text-slate-300">
          Liste des professeurs de l’école. Filtre par recherche et premium.
        </p>
        <div className="mt-4 flex flex-wrap justify-end gap-3 text-sm">
          <Link
            href="/app/admin/users?role=TEACHER"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            Gérer via utilisateurs
          </Link>
          <Link
            href="/app/admin"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            ← Retour dashboard
          </Link>
        </div>
      </header>

      <section className="panel p-6">
        <details className="group">
          <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-white">
            <span className="inline-flex items-center gap-2">
              <span>Filtres</span>
              {activeFilters > 0 && (
                <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[11px] font-semibold text-cyan-100">
                  {activeFilters}
                </span>
              )}
            </span>
            <span className="text-xs text-slate-300 transition-transform group-open:rotate-180">
              ▼
            </span>
          </summary>
          <form
            method="get"
            className="mt-3 grid w-full gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-indigo-900/20 md:grid-cols-3 md:items-end"
          >
            <label className="text-sm text-slate-200 md:col-span-2">
              Recherche (nom ou email)
              <input
                name="q"
                defaultValue={q}
                placeholder="Nom ou email"
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              />
            </label>
            <label className="mt-1 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-200">
              <input
                type="checkbox"
                name="premium"
                value="true"
                defaultChecked={premiumFilter}
                className="h-4 w-4 rounded border-white/20 bg-white/5"
              />
              Premium
            </label>
            <div className="md:col-span-3 flex flex-wrap items-center justify-end gap-2">
              <button
                type="submit"
                className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-400"
              >
                Filtrer
              </button>
              <Link
                href="/app/admin/teachers"
                className="rounded-full border border-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
              >
                Réinitialiser
              </Link>
            </div>
          </form>
        </details>
      </section>

      <section className="panel space-y-4 p-6">
        <h2 className="text-lg font-semibold text-white">Résultats</h2>
        {teachers.length === 0 ? (
          <p className="text-slate-300">Aucun professeur trouvé.</p>
        ) : (
          <div className="divide-y divide-white/10">
            {teachers.map((teacher) => (
              <div
                key={teacher.id}
                className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-base font-semibold text-white">{teacher.name ?? "Professeur"}</p>
                  <p className="text-sm text-slate-300">{teacher.email}</p>
                  <p className="text-xs text-slate-400">
                    Créé le {new Date(teacher.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {teacher.isPremium && (
                    <span className="rounded-full border border-amber-300/50 bg-amber-400/15 px-3 py-1 text-[12px] font-semibold text-amber-100">
                      Premium
                    </span>
                  )}
                  <Link
                    href={`/app/admin/users?role=TEACHER&q=${encodeURIComponent(teacher.email)}`}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
                  >
                    Voir fiche
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-200">
        <span>
          Page {safePage} / {totalPages} · {totalCount} profs
        </span>
        <div className="flex items-center gap-2">
          <Link
            href={`/app/admin/teachers?page=${Math.max(1, safePage - 1)}${q ? `&q=${encodeURIComponent(q)}` : ""}${premiumFilter ? `&premium=true` : ""}`}
            aria-disabled={safePage === 1}
            className={`rounded-full border border-white/10 px-3 py-2 ${
              safePage === 1
                ? "cursor-not-allowed text-slate-500"
                : "bg-white/5 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
            }`}
          >
            Précédent
          </Link>
          <Link
            href={`/app/admin/teachers?page=${Math.min(totalPages, safePage + 1)}${q ? `&q=${encodeURIComponent(q)}` : ""}${premiumFilter ? `&premium=true` : ""}`}
            aria-disabled={safePage === totalPages}
            className={`rounded-full border border-white/10 px-3 py-2 ${
              safePage === totalPages
                ? "cursor-not-allowed text-slate-500"
                : "bg-white/5 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
            }`}
          >
            Suivant
          </Link>
        </div>
      </div>
    </main>
  );
}
