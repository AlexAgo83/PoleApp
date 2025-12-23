import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { InvoiceStatus, Prisma } from "@prisma/client";

import { FilterPanel } from "@/components/FilterPanel";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SearchParams =
  | {
      page?: string | string[];
      status?: string | string[];
      studio?: string | string[];
      from?: string | string[];
      to?: string | string[];
      q?: string | string[];
    }
  | undefined;

const statusLabels: Record<InvoiceStatus, string> = {
  GENERATED: "Générée",
  SENT: "Envoyée",
  PAID: "Payée",
  LATE: "En retard",
  CANCELLED: "Annulée",
};

const statusClasses: Record<InvoiceStatus, string> = {
  GENERATED: "border-slate-400/50 bg-slate-500/20 text-slate-50",
  SENT: "border-cyan-300/60 bg-cyan-500/20 text-cyan-50",
  PAID: "border-emerald-300/60 bg-emerald-500/20 text-emerald-50",
  LATE: "border-amber-300/70 bg-amber-500/20 text-amber-50",
  CANCELLED: "border-red-300/60 bg-red-500/15 text-red-50",
};

function paramValue(value?: string | string[]) {
  if (Array.isArray(value)) return value[value.length - 1];
  return value;
}

function dateFromParam(value?: string) {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function formatAmount(amountCents: number, currency: string) {
  const amt = (amountCents ?? 0) / 100;
  return `${amt.toFixed(2)} ${currency}`;
}

export default async function TeacherBillingPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolved = (await searchParams) ?? {};
  const pageParam = paramValue(resolved.page);
  const rawPage = Number(pageParam ?? "1");
  const statusParam = paramValue(resolved.status);
  const studioFilter = paramValue(resolved.studio);
  const fromParam = paramValue(resolved.from);
  const toParam = paramValue(resolved.to);
  const q = paramValue(resolved.q)?.trim() || "";
  const fromDate = dateFromParam(fromParam);
  const toDate = dateFromParam(toParam);

  const session = await getServerSession(authOptions);
  if (!session?.user || !session.user.schoolId || session.user.role !== "TEACHER") {
    redirect("/access-denied");
  }

  const statusFilter =
    statusParam && Object.keys(statusLabels).includes(statusParam) ? (statusParam as InvoiceStatus) : undefined;

  const where: Prisma.InvoiceWhereInput = {
    status: statusFilter,
    course: {
      teacherId: session.user.id,
      schoolId: session.user.schoolId,
      ...(studioFilter ? { studioId: studioFilter } : {}),
      ...(q
        ? {
            title: { contains: q, mode: "insensitive" },
          }
        : {}),
      ...(fromDate || toDate
        ? {
            date: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            },
          }
        : {}),
    },
  };

  const [totalCount, studios] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.studio.findMany({
      where: { schoolId: session.user.schoolId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / 10));
  const currentPage = Math.min(Math.max(1, rawPage || 1), totalPages);
  const skip = (currentPage - 1) * 10;

  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: [
      { course: { date: "desc" } },
      { issuedAt: "desc" },
      { id: "desc" },
    ],
    skip,
    take: 10,
    include: {
      course: {
        include: {
          studio: { select: { id: true, name: true } },
          _count: { select: { attendances: true } },
        },
      },
    },
  });

  const queryParams = new URLSearchParams();
  if (statusFilter) queryParams.set("status", statusFilter);
  if (studioFilter) queryParams.set("studio", studioFilter);
  if (fromParam) queryParams.set("from", fromParam);
  if (toParam) queryParams.set("to", toParam);
  if (q) queryParams.set("q", q);
  const qs = queryParams.toString();
  const userKey = session.user.id ?? "anon";
  const activeFilters = [statusFilter, studioFilter, fromParam, toParam, q && q.length > 0 ? "q" : null].filter(Boolean)
    .length;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-3 px-0 py-6 md:gap-6 md:px-8 md:py-10">
      <header className="panel flex flex-wrap items-start justify-between gap-3 border-indigo-400/25 p-6 shadow-indigo-900/30">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-indigo-100">Professeur</p>
          <h1 className="text-3xl font-semibold text-white">Facturation (lecture)</h1>
          <p className="text-sm text-slate-300">Factures liées à vos cours, en lecture seule.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/api/teacher/invoices/export-csv${qs ? `?${qs}` : ""}`}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            Export CSV
          </Link>
          <Link
            href="/app/teacher"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-normal text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            ← Retour accueil
          </Link>
        </div>
      </header>

      <section className="panel p-4 md:p-6">
        <FilterPanel
          storageKey="filters:teacher-billing"
          title="Filtres"
          activeCount={activeFilters}
          userKey={userKey}
          contentClassName="mt-3"
        >
          <form
            method="get"
            className="grid w-full gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-indigo-900/20 md:grid-cols-4 md:items-end"
          >
            <label className="text-sm text-slate-200">
              Date min
              <input
                type="date"
                name="from"
                defaultValue={fromParam}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              />
            </label>
            <label className="text-sm text-slate-200">
              Date max
              <input
                type="date"
                name="to"
                defaultValue={toParam}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              />
            </label>
            <label className="text-sm text-slate-200">
              Studio
              <select
                name="studio"
                defaultValue={studioFilter ?? ""}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              >
                <option value="">Tous</option>
                {studios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-200">
              Statut
              <select
                name="status"
                defaultValue={statusFilter ?? ""}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              >
                <option value="">Tous</option>
                {Object.values(InvoiceStatus).map((st) => (
                  <option key={st} value={st}>
                    {statusLabels[st]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-200 md:col-span-2">
              Recherche (titre/description cours)
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Titre"
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              />
            </label>
            <div className="md:col-span-4 flex flex-wrap items-center justify-end gap-2">
              <button
                type="submit"
                className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-400"
              >
                Filtrer
              </button>
              <Link
                href="/app/teacher/billing"
                className="rounded-full border border-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
              >
                Réinitialiser
              </Link>
            </div>
          </form>
        </FilterPanel>

        {activeFilters > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-white">
            <span className="rounded-full border border-cyan-400/60 bg-cyan-500/20 px-2 py-0.5">
              {activeFilters} filtre{activeFilters > 1 ? "s" : ""} actif{activeFilters > 1 ? "s" : ""}
            </span>
            {statusFilter && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-slate-200">
                Statut : {statusLabels[statusFilter]}
              </span>
            )}
            {studioFilter && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-slate-200">
                Studio : {studioFilter}
              </span>
            )}
            {(fromParam || toParam) && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-slate-200">
                Dates : {fromParam ?? "—"} → {toParam ?? "—"}
              </span>
            )}
            {q && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-slate-200">
                Recherche : “{q}”
              </span>
            )}
          </div>
        )}

        <div className="mt-4 divide-y divide-white/10">
          {invoices.map((invoice) => {
            const course = invoice.course;
            const badgeClass = statusClasses[invoice.status];
            const badgeLabel = statusLabels[invoice.status];
            const attendees = course._count.attendances;
            const formattedDate = new Date(course.date).toLocaleString("fr-FR", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            });
            return (
              <article key={invoice.id} className="flex flex-col gap-2 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold ${badgeClass}`}
                    >
                      {badgeLabel}
                    </span>
                    <p className="text-base font-semibold text-white">
                      {course.title ?? "Cours"} · {formattedDate}
                    </p>
                  </div>
                  <div className="text-sm text-slate-200">
                    {formatAmount(invoice.amountCents, invoice.currency)}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
                  {course.studio?.name && (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[12px]">
                      Studio : {course.studio.name}
                    </span>
                  )}
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[12px]">
                    Présences : {attendees}
                  </span>
                  {invoice.paidAt && (
                    <span className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2 py-1 text-[12px] text-emerald-50">
                      Payée le {new Date(invoice.paidAt).toLocaleDateString("fr-FR")}
                    </span>
                  )}
                </div>
                {invoice.note && (
                  <p className="text-sm text-slate-300">Note : {invoice.note}</p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/app/teacher/courses/${course.id}?from=/app/teacher/billing`}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
                  >
                    Voir le cours
                  </Link>
                  <Link
                    href={`/api/teacher/invoices/${invoice.id}/print`}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Imprimer
                  </Link>
                </div>
              </article>
            );
          })}
          {invoices.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/15 bg-white/5 p-4 text-sm text-slate-300">
              Aucune facture trouvée. Ajuste les filtres ou vérifie les cours.
            </div>
          )}
        </div>

        {totalCount > 10 && (
          <div className="mt-6 flex items-center justify-between">
            <Link
              href={`/app/teacher/billing?page=${Math.max(1, currentPage - 1)}${qs ? `&${qs}` : ""}`}
              className={`rounded-full px-3 py-2 text-sm font-semibold ${
                currentPage === 1
                  ? "cursor-not-allowed border border-white/10 text-slate-500"
                  : "border border-white/10 text-white hover:border-cyan-400/70 hover:bg-white/5"
              }`}
              aria-disabled={currentPage === 1}
            >
              Précédent
            </Link>
            <span className="text-sm text-slate-300">
              Page {currentPage} / {totalPages}
            </span>
            <Link
              href={`/app/teacher/billing?page=${Math.min(totalPages, currentPage + 1)}${qs ? `&${qs}` : ""}`}
              className={`rounded-full px-3 py-2 text-sm font-semibold ${
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
