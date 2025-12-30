import Link from "next/link";
import { getServerSession } from "next-auth";

import { FilterPanel } from "@/components/FilterPanel";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatEuro(cents: number | null) {
  return `${((cents ?? 0) / 100).toFixed(2)} €`;
}

export default async function StudentPurchasesPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; kind?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return null;
  }

  const resolved = (await searchParams) ?? {};
  const page = Math.max(1, Number.parseInt(resolved.page ?? "1", 10) || 1);
  const kindFilter = resolved.kind?.toString() ?? "";
  const take = 10;
  const where = {
    userId: session.user.id,
    ...(kindFilter ? { kind: kindFilter } : {}),
  };
  let purchases: {
    id: string;
    createdAt: Date;
    amountCents: number | null;
    offerName: string;
    kind: string;
    vatPercent: number | null;
    creditsGranted: number | null;
    isPremiumGranted: boolean | null;
  }[] = [];
  let count = 0;

  try {
    const client: any = prisma as any;
    if (client.purchase?.findMany) {
      [count, purchases] = await Promise.all([
        client.purchase.count({ where }),
        client.purchase.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * take,
          take,
        }),
      ]);
    }
  } catch {
    purchases = [];
  }
  const totalPages = Math.max(1, Math.ceil(count / take));
  const activeFilters = [kindFilter].filter(Boolean).length;
  const queryParams = new URLSearchParams();
  if (kindFilter) queryParams.set("kind", kindFilter);

  return (
    <main className="flex min-h-screen w-full flex-col gap-4">
      <section className="panel space-y-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-3xl font-semibold text-white">Historique achats</h1>
            <p className="text-sm text-slate-300">
              Achats simulés (statut PAYÉ). Montants TTC, TVA 20%, devise EUR.
            </p>
          </div>
        </div>

        <FilterPanel
          storageKey="filters:student-purchases"
          title="Filtres"
          activeCount={activeFilters}
          userKey={session.user.id}
          className="space-y-3"
          contentClassName="mt-3"
        >
          <form method="get" className="grid gap-3 md:grid-cols-3 md:items-end">
            <label className="text-sm text-slate-200">
              Type d&apos;achat
              <select
                name="kind"
                defaultValue={kindFilter}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              >
                <option value="">Tous</option>
                <option value="PACK">Pack crédits</option>
                <option value="SUBSCRIPTION">Abonnement</option>
                <option value="PRESET">Preset</option>
              </select>
            </label>
            <div className="flex md:col-span-2 items-end justify-end gap-2">
              <button
                type="submit"
                className="rounded-full border border-cyan-300/60 bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-white hover:border-cyan-200"
              >
                Filtrer
              </button>
              {activeFilters > 0 ? (
                <Link
                  href="/app/student/purchases"
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
                >
                  Réinitialiser
                </Link>
              ) : null}
            </div>
          </form>
        </FilterPanel>

        <div className="space-y-2">
          {purchases.length === 0 && (
            <p className="text-sm text-slate-400">Aucun achat pour l’instant.</p>
          )}
          {purchases.map((p) => {
            const created = new Date(p.createdAt).toLocaleString("fr-FR", { hour12: false });
            return (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
              >
                <div className="space-y-0.5">
                  <p className="font-semibold text-white">
                    {p.offerName} ({p.kind})
                  </p>
                  <p className="text-xs text-slate-300">
                    {formatEuro(p.amountCents)} TTC · TVA {p.vatPercent ?? 20}% · Crédits :{" "}
                    {p.creditsGranted ?? 0}
                    {p.isPremiumGranted ? " + Premium" : ""}
                  </p>
                </div>
                <span className="text-[12px] text-cyan-100">{created}</span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-sm text-slate-300">
          <span>
            Page {page} / {totalPages} · {count} achats
          </span>
          <div className="flex items-center gap-2">
            {(() => {
              const params = new URLSearchParams(queryParams);
              params.set("page", String(Math.max(1, page - 1)));
              const prevHref = `?${params.toString()}`;
              params.set("page", String(Math.min(totalPages, page + 1)));
              const nextHref = `?${params.toString()}`;
              return (
                <>
                  <a
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:border-cyan-300/60 hover:bg-cyan-500/20"
                    href={prevHref}
                  >
                    Précédent
                  </a>
                  <a
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:border-cyan-300/60 hover:bg-cyan-500/20"
                    href={nextHref}
                  >
                    Suivant
                  </a>
                </>
              );
            })()}
          </div>
        </div>
      </section>
    </main>
  );
}
