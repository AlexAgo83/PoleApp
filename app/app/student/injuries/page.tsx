import { getServerSession } from "next-auth";
import Link from "next/link";

import { authOptions } from "@/lib/auth";
import { FilterPanel } from "@/components/FilterPanel";
import { prisma } from "@/lib/prisma";

import {
  createInjuryAction,
  deleteInjuryAction,
  updateInjuryAction,
} from "./actions";

const PAGE_SIZE = 10;

export default async function StudentInjuriesPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; success?: string; error?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return null;
  }
  const userKey = session.user.id ?? "anon";

  const resolvedParams = (await searchParams) ?? {};
  const pageParam = Array.isArray(resolvedParams.page)
    ? resolvedParams.page[0]
    : resolvedParams.page;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const [injuryTypes, injuryCount, injuries] = await Promise.all([
    prisma.injuryType.findMany({ orderBy: { name: "asc" } }),
    prisma.studentInjury.count({ where: { studentId: session.user.id } }),
    prisma.studentInjury.findMany({
      where: { studentId: session.user.id },
      include: { injuryType: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(injuryCount / PAGE_SIZE));
  const success = resolvedParams.success?.toString();
  const error = resolvedParams.error?.toString();

  return (
    <main className="flex min-h-screen w-full flex-col gap-4">
      <section className="panel border-indigo-400/15 p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-indigo-100">
              Élève
            </p>
            <h1 className="text-3xl font-semibold text-white">Mes blessures</h1>
            <p className="text-sm text-slate-200">
              Déclare ou mets à jour tes blessures actives pour que le prof adapte les cours.
            </p>
          </div>
          <Link
            href="/app/student"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-normal text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            ← Retour accueil
          </Link>
        </div>

        {(success || error) && (
          <div
            className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
              error
                ? "border-amber-300/40 bg-amber-500/10 text-amber-100"
                : "border-emerald-300/40 bg-emerald-500/10 text-emerald-100"
            }`}
          >
            {error ?? success}
          </div>
        )}
        <h2 className="text-lg font-semibold text-white">Mes blessures</h2>
        <div className="grid gap-4">
          {injuries.map((injury) => (
            <article
              key={injury.id}
              className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-950/50 via-slate-900/40 to-cyan-900/40 p-5 shadow-lg shadow-black/20"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-lg font-semibold text-white">
                      {injury.injuryType.name}
                    </p>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                        injury.isActive
                          ? "border border-red-300/70 bg-red-500/30 text-red-50 shadow-inner shadow-red-500/30 animate-pulse"
                          : "border border-emerald-300/60 bg-emerald-500/20 text-emerald-50"
                      }`}
                    >
                      {injury.isActive ? "Active" : "Résolue"}
                    </span>
                  </div>
                  {injury.notes && (
                    <p className="rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-sm text-slate-100">
                      Notes : {injury.notes}
                    </p>
                  )}
                  <p className="text-xs text-slate-300">
                    Créée le {new Date(injury.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <details className="group flex w-full flex-col items-end gap-2 md:w-auto">
                    <div className="order-1 hidden w-full group-open:block">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                        <form
                          action={updateInjuryAction}
                          className="flex flex-wrap items-center gap-3"
                        >
                          <input type="hidden" name="injuryId" value={injury.id} />
                          <input
                            type="hidden"
                            name="isActive"
                            value={injury.isActive ? "false" : "true"}
                          />
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              name="notes"
                              defaultValue={injury.notes ?? ""}
                              placeholder="Notes"
                              className="w-56 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-indigo-400"
                            />
                            <button
                              type="submit"
                              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-indigo-300/70 hover:bg-white/10"
                            >
                              Sauver
                            </button>
                            <button
                              type="submit"
                              className="rounded-full bg-amber-500 px-3 py-2 text-[13px] font-semibold text-white transition hover:bg-amber-400"
                            >
                              Marquer {injury.isActive ? "résolue" : "active"}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                    <summary className="order-2 inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-indigo-300/70 hover:bg-white/10 [&::marker]:hidden">
                      Éditer
                      <span className="text-xs text-slate-300 group-open:rotate-180 transition">▼</span>
                    </summary>
                  </details>
                  <form action={deleteInjuryAction}>
                    <input type="hidden" name="injuryId" value={injury.id} />
                    <button
                      type="submit"
                      className="rounded-full border border-red-500/40 bg-red-500/20 px-3 py-2 text-sm font-semibold text-red-50 transition hover:border-red-300 hover:bg-red-400/30"
                    >
                      Supprimer
                    </button>
                  </form>
                </div>
              </div>
            </article>
          ))}
          {injuries.length === 0 && (
            <div className="mt-2 rounded-2xl border border-dashed border-white/15 bg-white/5 p-4 text-sm text-slate-200">
              Aucune blessure déclarée pour le moment.
            </div>
          )}
        </div>

        {injuries.length > 0 && (
          <div className="mt-6 flex items-center justify-center gap-3 text-sm text-slate-200">
            <Link
              aria-disabled={page <= 1}
              href={page <= 1 ? "#" : `/app/student/injuries?page=${page - 1}`}
              className={`rounded-full border px-3 py-1 font-semibold transition ${
                page <= 1
                  ? "cursor-not-allowed border-white/10 text-slate-500"
                  : "border-white/20 hover:border-cyan-400 hover:text-cyan-200"
              }`}
            >
              Précédent
            </Link>
            <span>
              Page {page} / {totalPages}
            </span>
            <Link
              aria-disabled={page >= totalPages}
              href={
                page >= totalPages
                  ? "#"
                  : `/app/student/injuries?page=${page + 1}`
              }
              className={`rounded-full border px-3 py-1 font-semibold transition ${
                page >= totalPages
                  ? "cursor-not-allowed border-white/10 text-slate-500"
                  : "border-white/20 hover:border-cyan-400 hover:text-cyan-200"
              }`}
            >
              Suivant
            </Link>
          </div>
        )}
      </section>

      <section className="panel border-indigo-400/15 p-6">
        <FilterPanel
          storageKey="filters:student-injuries-add"
          title="Ajouter une blessure"
          titleClassName="text-lg font-semibold"
          userKey={userKey}
        >
          <form action={createInjuryAction} className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="text-sm text-slate-200">
              Type de blessure
              <select
                name="injuryTypeId"
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-indigo-400"
              >
                {injuryTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-200">
              Notes (optionnel)
              <input
                name="notes"
                placeholder="Douleur à l'épaule droite, éviter inversions."
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-indigo-400"
              />
            </label>
            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
              >
                Ajouter
              </button>
            </div>
          </form>
        </FilterPanel>
      </section>
    </main>
  );
}
