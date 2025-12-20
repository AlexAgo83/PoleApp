import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { createPartnerAction, deletePartnerAction, updatePartnerAction } from "./actions";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPartnersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SCHOOL_ADMIN") {
    redirect("/access-denied");
  }
  if (!session.user.schoolId) {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-10">
        <section className="panel p-6">
          <h1 className="text-3xl font-semibold text-white">Partenaires</h1>
          <p className="text-slate-300">Aucune école associée à ce compte.</p>
        </section>
      </main>
    );
  }

  const partners = await prisma.partner.findMany({
    where: { schoolId: session.user.schoolId },
    orderBy: { name: "asc" },
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="panel p-6">
        <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Admin</p>
        <h1 className="text-3xl font-semibold text-white">Partenaires</h1>
        <p className="text-sm text-slate-300">
          Gère les partenaires de l’école (revendeurs et services).
        </p>
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
        <h2 className="text-lg font-semibold text-white">Ajouter un partenaire</h2>
        <form action={createPartnerAction} className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="text-sm text-slate-200">
            Nom
            <input
              name="name"
              required
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
            />
          </label>
          <label className="text-sm text-slate-200">
            Type
            <input
              name="kind"
              placeholder="SERVICE ou REVENDEUR"
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
              defaultValue="SERVICE"
            />
          </label>
          <label className="text-sm text-slate-200 md:col-span-2">
            Site web (optionnel)
            <input
              name="website"
              type="url"
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
            />
          </label>
          <label className="text-sm text-slate-200 md:col-span-2">
            Description (optionnel)
            <textarea
              name="description"
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
              rows={2}
            />
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
        <h2 className="text-lg font-semibold text-white">Partenaires existants</h2>
        {partners.length === 0 && (
          <p className="text-slate-200">Aucun partenaire pour le moment.</p>
        )}
        <div className="divide-y divide-white/5">
          {partners.map((partner) => (
            <div
              key={partner.id}
              className="flex flex-col gap-2 py-4 md:flex-row md:items-center md:justify-between"
            >
              <form
                action={updatePartnerAction}
                className="flex flex-wrap items-center gap-2 text-sm text-slate-200"
              >
                <input type="hidden" name="partnerId" value={partner.id} />
                <input
                  name="name"
                  defaultValue={partner.name}
                  className="w-48 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
                  required
                />
                <input
                  name="kind"
                  defaultValue={partner.kind}
                  className="w-36 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
                  placeholder="SERVICE/REVENDEUR"
                />
                <input
                  name="website"
                  type="url"
                  defaultValue={partner.website ?? ""}
                  placeholder="https://..."
                  className="w-48 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
                />
                <input
                  name="description"
                  defaultValue={partner.description ?? ""}
                  placeholder="Description"
                  className="w-56 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
                />
                <button
                  type="submit"
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-2 font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
                >
                  Sauvegarder
                </button>
              </form>
              <form action={deletePartnerAction}>
                <input type="hidden" name="partnerId" value={partner.id} />
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
