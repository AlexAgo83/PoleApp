import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { InvoiceStatus } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { backfillInvoicesAction } from "./actions";
import { BillingList } from "./BillingList";
import { FoxPageHeader } from "@/components/FoxPageHeader";

export const dynamic = "force-dynamic";

type SearchParams =
  | {
      flash?: string | string[];
      status?: string | string[];
      teacher?: string | string[];
      studio?: string | string[];
      from?: string | string[];
      to?: string | string[];
      threshold?: string | string[];
      sort?: string | string[];
      page?: string | string[];
    }
  | undefined;

const statusLabels: Record<InvoiceStatus, string> = {
  GENERATED: "Générée",
  SENT: "Reçue",
  PAID: "Payée",
  LATE: "En retard",
  CANCELLED: "Annulée",
  REFUNDED: "Remboursée",
};

const statusClasses: Record<InvoiceStatus, string> = {
  GENERATED: "border-slate-400/50 bg-slate-500/20 text-slate-50",
  SENT: "border-cyan-300/60 bg-cyan-500/20 text-cyan-50",
  PAID: "border-emerald-300/60 bg-emerald-500/20 text-emerald-50 shadow-[0_0_10px_rgba(16,185,129,0.4)]",
  LATE: "border-amber-300/70 bg-amber-500/20 text-amber-50 shadow-[0_0_14px_rgba(251,191,36,0.6)] animate-[pulse_1.8s_ease-in-out_infinite]",
  CANCELLED: "border-red-300/60 bg-red-500/15 text-red-50",
  REFUNDED: "border-cyan-300/70 bg-cyan-500/20 text-cyan-50 shadow-[0_0_12px_rgba(59,130,246,0.35)]",
};

function paramValue(value?: string | string[]) {
  if (Array.isArray(value)) return value[value.length - 1];
  return value;
}

export default async function AdminBillingPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const resolved = (await searchParams) ?? {};
  const flash = paramValue(resolved.flash);
  const statusParam = paramValue(resolved.status);
  const teacherFilter = paramValue(resolved.teacher);
  const studioFilter = paramValue(resolved.studio);
  const fromParam = paramValue(resolved.from);
  const toParam = paramValue(resolved.to);
  const thresholdParam = paramValue(resolved.threshold);
  const sortParam = paramValue(resolved.sort);

  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SCHOOL_ADMIN" || !session.user.schoolId) {
    redirect("/access-denied");
  }

  const [teachers, studios] = await Promise.all([
    prisma.user.findMany({
      where: { schoolId: session.user.schoolId, role: "TEACHER" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.studio.findMany({
      where: { schoolId: session.user.schoolId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const queryParams = new URLSearchParams();
  if (flash) queryParams.set("flash", flash);
  if (statusParam) queryParams.set("status", statusParam);
  if (teacherFilter) queryParams.set("teacher", teacherFilter);
  if (studioFilter) queryParams.set("studio", studioFilter);
  if (fromParam) queryParams.set("from", fromParam);
  if (toParam) queryParams.set("to", toParam);
  if (thresholdParam) queryParams.set("threshold", thresholdParam);
  if (sortParam) queryParams.set("sort", sortParam);
  const activeFilters = [statusParam, teacherFilter, studioFilter, fromParam, toParam].filter(Boolean).length;
  const userKey = session.user.id ?? "anon";
  const backfillRedirect = (() => {
    const clone = new URLSearchParams(queryParams);
    clone.delete("flash");
    const qs = clone.toString();
    return `/app/admin/billing${qs ? `?${qs}&flash=backfill` : "?flash=backfill"}`;
  })();

  return (
    <main className="flex min-h-screen w-full flex-col gap-4">
      <FoxPageHeader
        eyebrow="Admin"
        title="Facturation"
        buttons={[
          { label: "Retour dashboard", href: "/app/admin" },
          { label: "Voir achats", href: "/app/admin/purchases" },
        ]}
        foxHref="/"
      >
        <form action={backfillInvoicesAction} className="inline-flex">
          <input type="hidden" name="redirectTo" value={backfillRedirect} />
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full border border-emerald-400/60 bg-emerald-500/15 px-3 py-2 text-sm font-semibold text-emerald-50 transition hover:border-emerald-300/70 hover:bg-emerald-500/25"
          >
            Générer les factures manquantes
          </button>
        </form>
      </FoxPageHeader>

      <BillingList
        initialQuery={queryParams.toString()}
        teachers={teachers}
        studios={studios}
        statusLabels={statusLabels}
        statusClasses={statusClasses}
        activeCount={activeFilters}
        userKey={userKey}
      />
    </main>
  );
}
