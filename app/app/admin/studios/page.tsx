import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { createStudioAction, deleteStudioAction, updateStudioAction } from "./actions";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminStudiosPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SCHOOL_ADMIN") {
    redirect("/access-denied");
  }
  if (!session.user.schoolId) {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-10">
        <section className="panel p-6">
          <h1 className="text-3xl font-semibold text-white">Studios</h1>
          <p className="text-slate-300">Aucune école associée à ce compte.</p>
        </section>
      </main>
    );
  }

  let studios: Awaited<ReturnType<typeof prisma.studio.findMany>> = [];
  try {
    studios = await prisma.studio.findMany({
      where: { schoolId: session.user.schoolId },
      orderBy: { name: "asc" },
    });
  } catch (err) {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-10">
        <section className="panel p-6">
          <h1 className="text-3xl font-semibold text-white">Studios</h1>
          <p className="text-sm text-amber-200">
            Modèle Studio indisponible. Lance `npx prisma generate` et la migration pour ajouter la table.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="panel p-6">
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

      <section className="panel p-6">
        <h2 className="text-lg font-semibold text-white">Ajouter un studio</h2>
        <form action={createStudioAction} className="mt-3 grid gap-3 md:grid-cols-2">
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
      </section>

      <section className="panel space-y-4 p-6">
        <h2 className="text-lg font-semibold text-white">Studios existants</h2>
        {studios.length === 0 && (
          <p className="text-slate-200">Aucun studio pour le moment.</p>
        )}
        <div className="divide-y divide-white/5">
          {studios.map((studio) => (
            <div
              key={studio.id}
              className="flex flex-col gap-2 py-4 md:flex-row md:items-center md:justify-between"
            >
              <form
                action={updateStudioAction}
                className="flex flex-wrap items-center gap-2 text-sm text-slate-200"
              >
                <input type="hidden" name="studioId" value={studio.id} />
                <input
                  name="name"
                  defaultValue={studio.name}
                  className="w-48 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
                  required
                />
                <input
                  name="address"
                  defaultValue={studio.address ?? ""}
                  placeholder="Adresse"
                  className="w-64 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
                />
                {studio.address && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(studio.address)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-cyan-300 transition hover:text-cyan-200"
                  >
                    Ouvrir dans Google Maps
                  </a>
                )}
                <button
                  type="submit"
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-2 font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
                >
                  Sauvegarder
                </button>
              </form>
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
          ))}
        </div>
      </section>
    </main>
  );
}
