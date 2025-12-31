import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { createStudioAction } from "./actions";
import { authOptions } from "@/lib/auth";
import { FilterPanel } from "@/components/FilterPanel";
import { PersistedPanel } from "@/components/PersistedPanel";
import { prisma } from "@/lib/prisma";
import { StudioCard } from "./StudioCard";

export const dynamic = "force-dynamic";

type PageProps =
  | { searchParams?: { page?: string | string[]; q?: string | string[]; flash?: string | string[] } }
  | {
      searchParams?: Promise<{
        page?: string | string[];
        q?: string | string[];
        flash?: string | string[];
      }>;
    };

function paramValue(value?: string | string[]) {
  if (Array.isArray(value)) return value[value.length - 1];
  return value;
}

export default async function AdminStudiosPage({ searchParams }: PageProps) {
  const resolvedParams = await Promise.resolve(searchParams);
  const pageParam = paramValue(resolvedParams?.page);
  const q = (paramValue(resolvedParams?.q) ?? "").toString().trim();
  const flash = paramValue(resolvedParams?.flash);
  const rawPage = Number(pageParam ?? "1");

  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SCHOOL_ADMIN") {
    redirect("/access-denied");
  }
  const userKey = session.user.id ?? "anon";
  if (!session.user.schoolId) {
    return (
      <main className="flex min-h-screen w-full flex-col gap-4">
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
  } catch {
    return (
      <main className="flex min-h-screen w-full flex-col gap-4">
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
    <main className="flex min-h-screen w-full flex-col gap-4">
      {flash && (
        <div className="fixed bottom-4 right-4 z-30 space-y-2">
          {flash === "created" && (
            <div className="rounded-xl border border-emerald-300/60 bg-emerald-600/85 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/40">
              Studio créé.
            </div>
          )}
          {flash === "updated" && (
            <div className="rounded-xl border border-cyan-300/60 bg-cyan-600/85 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-900/40">
              Studio mis à jour.
            </div>
          )}
          {flash === "deleted" && (
            <div className="rounded-xl border border-red-400/60 bg-red-600/85 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-red-900/40">
              Studio supprimé.
            </div>
          )}
        </div>
      )}
      <section className="panel p-4 md:p-6">
        <PersistedPanel
          storageKey="panel:admin-studios-create"
          title="Ajouter un studio"
          className="group"
          contentClassName="mt-4"
          userKey={userKey}
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
            <label className="text-sm text-slate-200">
              Photo (URL)
              <input
                name="photoUrl"
                type="url"
                placeholder="https://..."
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
              />
            </label>
            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-400"
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
            userKey={userKey}
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
                  className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-400"
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
        <div className="grid gap-4 md:grid-cols-2">
          {studios.map((studio) => {
            return <StudioCard key={studio.id} studio={studio} />;
          })}
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
