import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { createStudioAction, deleteStudioAction, updateStudioAction } from "./actions";
import { authOptions } from "@/lib/auth";
import { FilterPanel } from "@/components/FilterPanel";
import { PersistedPanel } from "@/components/PersistedPanel";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps =
  | { searchParams?: { page?: string | string[]; q?: string | string[] } }
  | { searchParams?: Promise<{ page?: string | string[]; q?: string | string[] }> };

function paramValue(value?: string | string[]) {
  if (Array.isArray(value)) return value[value.length - 1];
  return value;
}

export default async function AdminStudiosPage({ searchParams }: PageProps) {
  const resolvedParams = await Promise.resolve(searchParams);
  const pageParam = paramValue(resolvedParams?.page);
  const q = (paramValue(resolvedParams?.q) ?? "").toString().trim();
  const rawPage = Number(pageParam ?? "1");

  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SCHOOL_ADMIN") {
    redirect("/access-denied");
  }
  if (!session.user.schoolId) {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-3 px-0 py-6 md:gap-6 md:px-8 md:py-10">
        <section className="panel p-4 md:p-6">
          <h1 className="text-3xl font-semibold text-white">Studios</h1>
          <p className="text-slate-300">Aucune école associée à ce compte.</p>
        </section>
      </main>
    );
  }

  let totalCount = 0;
  let totalPages = 1;
  let currentPage = 1;
  let studios: Awaited<ReturnType<typeof prisma.studio.findMany>> = [];
  try {
    const whereClause = {
      schoolId: session.user.schoolId,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { address: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    totalCount = await prisma.studio.count({ where: { schoolId: session.user.schoolId } });
    totalCount = await prisma.studio.count({ where: whereClause });
    totalPages = Math.max(1, Math.ceil(totalCount / 10));
    currentPage = Math.min(Math.max(1, rawPage || 1), totalPages);
    const skip = (currentPage - 1) * 10;
    studios = await prisma.studio.findMany({
      where: whereClause,
      orderBy: { name: "asc" },
      skip,
      take: 10,
    });
  } catch (err) {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-3 px-0 py-6 md:gap-6 md:px-8 md:py-10">
        <section className="panel p-4 md:p-6">
          <h1 className="text-3xl font-semibold text-white">Studios</h1>
          <p className="text-sm text-amber-200">
            Modèle Studio indisponible. Lance `npx prisma generate` et la migration pour ajouter la table.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-3 px-0 py-6 md:gap-6 md:px-8 md:py-10">
      <header className="panel p-4 md:p-6">
        <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Admin</p>
        <h1 className="text-3xl font-semibold text-white">Studios</h1>
        <p className="text-sm text-slate-300">
          Gère les studios de l’école (nom, adresse) et associe-les aux cours.
        </p>
        <div className="mt-4 flex flex-wrap justify-end gap-3 text-sm">
          <Link
            href="/app/admin"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            ← Retour dashboard
          </Link>
        </div>
      </header>

      <section className="panel p-4 md:p-6">
        <PersistedPanel
          storageKey="panel:admin-studios-create"
          title="Ajouter un studio"
          className="group"
          contentClassName="mt-4"
        >
          <form action={createStudioAction} className="grid gap-3 md:grid-cols-2">
            <label className="text-sm text-slate-200">
              Nom
              <input
                name="name"
                required
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
              />
            </label>
            <label className="text-sm text-slate-200">
              Adresse (optionnel)
              <input
                name="address"
                list="studio-address-suggestions"
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
              />
              <p className="mt-1 text-xs text-slate-400">
                Astuce : saisissez l’adresse puis ouvrez Google Maps pour vérifier l’emplacement (autocomplete mock).
              </p>
              <datalist id="studio-address-suggestions">
                <option value="10 Rue de la Paix, Paris" />
                <option value="25 Avenue des Arts, Lyon" />
                <option value="3 Rue des Lilas, Marseille" />
              </datalist>
            </label>
            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-400"
              >
                Ajouter
              </button>
            </div>
          </form>
        </PersistedPanel>
      </section>

      <section className="panel space-y-4 p-4 md:p-6">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Studios existants</h2>
          <FilterPanel
            storageKey="filters:admin-studios-list"
            title="Filtres"
            className="group w-full"
            contentClassName="mt-3"
          >
            <form
              method="get"
              className="grid w-full gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-indigo-900/20 md:grid-cols-2 md:items-end"
            >
              <label className="text-sm text-slate-200 md:col-span-2">
                Recherche (nom ou adresse)
                <input
                  type="text"
                  name="q"
                  defaultValue={q}
                  placeholder="Nom ou adresse"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
                />
              </label>
              <div className="md:col-span-2 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="submit"
                  className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-400"
                >
                  Filtrer
                </button>
                <Link
                  href="/app/admin/studios"
                  className="rounded-full border border-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
                >
                  Réinitialiser
                </Link>
              </div>
            </form>
          </FilterPanel>
        </div>
        {studios.length === 0 && (
          <p className="text-slate-200">Aucun studio pour le moment.</p>
        )}
        <div className="divide-y divide-white/5">
          {studios.map((studio) => (
            <article key={studio.id} className="flex flex-col gap-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-200">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-indigo-100">
                    Studio
                  </span>
                  {studio.address && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(studio.address)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-cyan-200 underline underline-offset-2 transition hover:text-cyan-100"
                    >
                      Ouvrir dans Google Maps
                    </a>
                  )}
                </div>
                <form action={deleteStudioAction}>
                  <input type="hidden" name="studioId" value={studio.id} />
                  <button
                    type="submit"
                    className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-100 transition hover:border-red-400 hover:bg-red-500/20"
                  >
                    Supprimer
                  </button>
                </form>
              </div>

              <form
                action={updateStudioAction}
                className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-indigo-900/10 text-sm text-slate-200 md:grid-cols-2 md:gap-4"
              >
                <input type="hidden" name="studioId" value={studio.id} />
                <label className="grid gap-1">
                  Nom
                  <input
                    name="name"
                    defaultValue={studio.name}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
                    required
                  />
                </label>
                <label className="grid gap-1">
                  Adresse (optionnel)
                  <input
                    name="address"
                    defaultValue={studio.address ?? ""}
                    placeholder="Adresse"
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
                  />
                </label>
                <div className="md:col-span-2 flex justify-end">
                  <button
                    type="submit"
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
                  >
                    Sauvegarder
                  </button>
                </div>
              </form>
            </article>
          ))}
        </div>
        {totalCount > 0 && (
          <div className="mt-4 flex items-center justify-between text-sm text-slate-200">
            <Link
              href={`/app/admin/studios?page=${Math.max(1, currentPage - 1)}`}
              className={`rounded-full px-3 py-2 font-semibold ${
                currentPage === 1
                  ? "cursor-not-allowed border border-white/10 text-slate-500"
                  : "border border-white/10 text-white hover:border-cyan-400/70 hover:bg-white/5"
              }`}
              aria-disabled={currentPage === 1}
            >
              Précédent
            </Link>
            <span>
              Page {currentPage} / {totalPages}
            </span>
            <Link
              href={`/app/admin/studios?page=${Math.min(totalPages, currentPage + 1)}`}
              className={`rounded-full px-3 py-2 font-semibold ${
                currentPage === totalPages
                  ? "cursor-not-allowed border border-white/10 text-slate-500"
                  : "border border-white/10 text-white hover:border-cyan-400/70 hover:bg-white/5"
              }`}
              aria-disabled={currentPage === totalPages}
            >
              Suivant
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
