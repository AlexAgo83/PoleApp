import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import {
  createInjuryAction,
  deleteInjuryAction,
  updateInjuryAction,
} from "./actions";

export default async function StudentInjuriesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return null;
  }

  const [injuryTypes, injuries] = await Promise.all([
    prisma.injuryType.findMany({ orderBy: { name: "asc" } }),
    prisma.studentInjury.findMany({
      where: { studentId: session.user.id },
      include: { injuryType: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="panel p-6">
        <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">
          Élève
        </p>
        <h1 className="text-3xl font-semibold text-white">Mes blessures</h1>
        <p className="text-sm text-slate-300">
          Déclare ou mets à jour tes blessures actives pour que le prof adapte
          les cours.
        </p>
      </header>

      <section className="panel p-6">
        <h2 className="text-lg font-semibold text-white">Ajouter</h2>
        <form action={createInjuryAction} className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="text-sm text-slate-200">
            Type de blessure
            <select
              name="injuryTypeId"
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
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
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
            />
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-400"
            >
              Ajouter
            </button>
          </div>
        </form>
      </section>

      <section className="panel p-6">
        <h2 className="text-lg font-semibold text-white">Mes blessures</h2>
        <div className="mt-4 flex flex-col divide-y divide-white/5">
          {injuries.map((injury) => (
            <article
              key={injury.id}
              className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between"
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
                    className="w-48 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
                  />
                  <button
                    type="submit"
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
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
            <p className="py-4 text-slate-200">Aucune blessure déclarée.</p>
          )}
        </div>
      </section>
    </main>
  );
}
