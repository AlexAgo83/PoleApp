"use server";

import { redirect } from "next/navigation";

import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type PurchaseRow = Prisma.PurchaseGetPayload<{
  include: { user: { select: { name: true; email: true; isPremium: true; credits: true } } };
}>;

function formatEuro(cents: number) {
  return `${(cents / 100).toFixed(2)} €`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date);
}

export default async function AdminPurchasesPage({
  searchParams,
}: {
  searchParams?: { kind?: string; status?: string; q?: string; page?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SCHOOL_ADMIN" || !session.user.schoolId) {
    redirect("/access-denied");
  }

  const page = Math.max(1, Number.parseInt(searchParams?.page ?? "1", 10) || 1);
  const kind = searchParams?.kind?.toUpperCase() || "";
  const status = searchParams?.status?.toUpperCase() || "";
  const q = searchParams?.q?.trim() || "";

  const where: Prisma.PurchaseWhereInput = {
    user: { schoolId: session.user.schoolId },
    ...(kind ? { kind } : {}),
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { offerName: { contains: q, mode: "insensitive" } },
            { user: { name: { contains: q, mode: "insensitive" } } },
            { user: { email: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [count, rows] = await Promise.all([
    prisma.purchase.count({ where }),
    prisma.purchase.findMany({
      where,
      include: { user: { select: { name: true, email: true, isPremium: true, credits: true } } },
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * 10,
      take: 10,
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(count / 10));

  return (
    <main className="px-4 py-6 text-white">
      <h1 className="text-2xl font-semibold">Achats (packs / abonnements)</h1>
      <p className="text-sm text-slate-300">Achats des élèves de l’école : packs crédits et abonnements.</p>

      <form className="mt-4 grid gap-3 rounded-xl border border-white/10 bg-white/5 p-4 md:grid-cols-4">
        <label className="text-sm">
          <span className="text-xs uppercase tracking-[0.12em] text-indigo-100">Type</span>
          <select name="kind" defaultValue={kind} className="mt-1 w-full rounded-lg bg-white/10 px-2 py-2 text-white">
            <option value="">Tous</option>
            <option value="PACK">Pack</option>
            <option value="SUBSCRIPTION">Abonnement</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="text-xs uppercase tracking-[0.12em] text-indigo-100">Statut</span>
          <select name="status" defaultValue={status} className="mt-1 w-full rounded-lg bg-white/10 px-2 py-2 text-white">
            <option value="">Tous</option>
            <option value="PAID">Payé</option>
            <option value="PENDING">En attente</option>
            <option value="CANCELLED">Annulé</option>
          </select>
        </label>
        <label className="text-sm md:col-span-2">
          <span className="text-xs uppercase tracking-[0.12em] text-indigo-100">Recherche élève/offre</span>
          <input
            name="q"
            defaultValue={q}
            className="mt-1 w-full rounded-lg bg-white/10 px-3 py-2 text-white"
            placeholder="Nom élève ou offre"
          />
        </label>
        <div className="md:col-span-4 flex justify-end">
          <button
            type="submit"
            className="rounded-full border border-cyan-300/60 bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-white hover:border-cyan-200"
          >
            Filtrer
          </button>
        </div>
      </form>

      <section className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
        {rows.length === 0 ? (
          <p className="text-slate-300">Aucun achat trouvé.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-slate-200">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.12em] text-indigo-100">
                  <th className="px-3 py-2">Élève</th>
                  <th className="px-3 py-2">Offre</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Montant</th>
                  <th className="px-3 py-2">Crédits</th>
                  <th className="px-3 py-2">Premium</th>
                  <th className="px-3 py-2">Statut</th>
                  <th className="px-3 py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-white/5">
                    <td className="px-3 py-2">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-white">{row.user.name ?? row.user.email}</p>
                        <p className="text-xs text-slate-400">{row.user.email}</p>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-semibold text-white">{row.offerName}</p>
                    </td>
                    <td className="px-3 py-2">
                      <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-100">
                        {row.kind}
                      </span>
                    </td>
                    <td className="px-3 py-2">{formatEuro(row.amountCents)}</td>
                    <td className="px-3 py-2">{row.creditsGranted}</td>
                    <td className="px-3 py-2">{row.isPremiumGranted ? "Oui" : "Non"}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          row.status === "PAID"
                            ? "border border-emerald-300/60 bg-emerald-500/15 text-emerald-50"
                            : row.status === "PENDING"
                              ? "border border-amber-300/60 bg-amber-500/15 text-amber-50"
                              : "border border-red-300/60 bg-red-500/15 text-red-50"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-300">{formatDate(row.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between text-sm text-slate-300">
          <span>
            Page {page} / {totalPages} · {count} achats
          </span>
          <div className="flex items-center gap-2">
            <a
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:border-cyan-300/60 hover:bg-cyan-500/20"
              href={`?${new URLSearchParams({ ...(searchParams ?? {}), page: String(Math.max(1, page - 1)) }).toString()}`}
            >
              Précédent
            </a>
            <a
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:border-cyan-300/60 hover:bg-cyan-500/20"
              href={`?${new URLSearchParams({ ...(searchParams ?? {}), page: String(Math.min(totalPages, page + 1)) }).toString()}`}
            >
              Suivant
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
