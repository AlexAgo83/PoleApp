import { getServerSession } from "next-auth";
import Link from "next/link";

import { authOptions } from "@/lib/auth";
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
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-3 px-0 py-6 md:gap-6 md:px-8 md:py-10">
      <header className="panel border-indigo-400/25 p-6 shadow-indigo-900/30">
        <p className="text-xs uppercase tracking-[0.14em] text-indigo-100">
          Élève
        </p>
        <h1 className="text-3xl font-semibold text-white">Mes blessures</h1>
        <p className="text-sm text-slate-200">
          Déclare ou mets à jour tes blessures actives pour que le prof adapte
          les cours.
        </p>
        <div className="mt-3 flex w-full justify-end">
          <Link
            href="/app/student"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-normal text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            ← Retour accueil
          </Link>
        </div>
      </header>

      <section className="panel border-indigo-400/15 p-6">
        <details className="group">
          <summary className="flex cursor-pointer items-center justify-between text-lg font-semibold text-white">
            <span>Ajouter une blessure</span>
            <span className="text-xs text-slate-300 transition-transform group-open:rotate-180">
              ▼
            </span>
          </summary>
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
                className="rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg transition hover:brightness-110"
              >
                Ajouter
              </button>
            </div>
          </form>
        </details>
      </section>

      <section className="panel border-indigo-400/15 p-6">
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
        <div className="mt-4 flex flex-col divide-y divide-white/5">
          {injuries.map((injury) => (
            <article
              key={injury.id}
              className="flex flex-col gap-3 rounded-2xl border border-white/5 py-4 px-3 transition hover:border-indigo-300/50 hover:bg-indigo-500/10 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="text-base font-semibold text-white">
                  {injury.injuryType.name}
                </p>
                <p className="text-sm text-slate-300">
                  Statut :{" "}
                  <span className={injury.isActive ? "text-amber-200" : "text-green-200"}>
                    {injury.isActive ? "Active" : "Résolue"}
                  </span>
                </p>
                {injury.notes && (
                  <p className="text-sm text-slate-200">Notes : {injury.notes}</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <form action={updateInjuryAction} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="injuryId" value={injury.id} />
                  <input
                    type="hidden"
                    name="isActive"
                    value={injury.isActive ? "false" : "true"}
                  />
                  <input
                    name="notes"
                    defaultValue={injury.notes ?? ""}
                    placeholder="Notes"
                    className="w-48 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-indigo-400"
                  />
                  <button
                    type="submit"
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-indigo-300/70 hover:bg-white/10"
                  >
                    Sauver
                  </button>
                  <button
                    type="submit"
                    className="rounded-full bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-amber-400"
                  >
                    Marquer {injury.isActive ? "résolue" : "active"}
                  </button>
                </form>
                <form action={deleteInjuryAction}>
                  <input type="hidden" name="injuryId" value={injury.id} />
                  <button
                    type="submit"
                    className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-100 transition hover:border-red-400 hover:bg-red-500/20"
                  >
                    Supprimer
                  </button>
                </form>
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
    </main>
  );
}
