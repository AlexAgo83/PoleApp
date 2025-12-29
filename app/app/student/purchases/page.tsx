import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function StudentPurchasesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return null;
  }

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

  try {
    const client: any = prisma as any;
    if (client.purchase?.findMany) {
      purchases = await client.purchase.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    }
  } catch {
    purchases = [];
  }

  return (
    <main className="flex min-h-screen w-full flex-col gap-4">
      <header className="panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-indigo-100">Élève</p>
            <h1 className="text-3xl font-semibold text-white">Historique achats</h1>
            <p className="text-sm text-slate-300">
              Achats simulés (statut PAYÉ). Montants TTC, TVA 20%, devise EUR.
            </p>
          </div>
          <Link
            href="/app/student"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-normal text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            ← Retour accueil
          </Link>
        </div>
      </header>

      <section className="panel p-6">
        <div className="space-y-2">
          {purchases.length === 0 && (
            <p className="text-sm text-slate-400">Aucun achat pour l’instant.</p>
          )}
          {purchases.map((p) => {
            const created = new Date(p.createdAt).toLocaleString("fr-FR", { hour12: false });
            const amount = (p.amountCents ?? 0) / 100;
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
                    {amount.toFixed(2)} € TTC · TVA {p.vatPercent ?? 20}% · Crédits :{" "}
                    {p.creditsGranted ?? 0}
                    {p.isPremiumGranted ? " + Premium" : ""}
                  </p>
                </div>
                <span className="text-[12px] text-cyan-100">{created}</span>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
