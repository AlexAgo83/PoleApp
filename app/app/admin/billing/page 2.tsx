import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { InvoiceStatus, Prisma } from "@prisma/client";

import { FilterPanel } from "@/components/FilterPanel";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { backfillInvoicesAction, updateInvoiceStatusAction } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams =
  | {
      page?: string | string[];
      status?: string | string[];
      teacher?: string | string[];
      studio?: string | string[];
      from?: string | string[];
      to?: string | string[];
      flash?: string | string[];
      threshold?: string | string[];
      sort?: string | string[];
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
  PAID: "border-emerald-300/60 bg-emerald-500/20 text-emerald-50 shadow-[0_0_10px_rgba(16,185,129,0.4)]",
  LATE: "border-amber-300/70 bg-amber-500/20 text-amber-50 shadow-[0_0_14px_rgba(251,191,36,0.6)] animate-[pulse_1.8s_ease-in-out_infinite]",
  CANCELLED: "border-red-300/60 bg-red-500/15 text-red-50",
};

type SortKey = "date_desc" | "date_asc" | "amount_desc" | "amount_asc" | "status" | "teacher";

const sortOptions: Record<SortKey, { label: string; orderBy: Prisma.InvoiceOrderByWithRelationInput[] }> = {
  date_desc: {
    label: "Date (récent > ancien)",
    orderBy: [
      { course: { date: "desc" } },
      { issuedAt: "desc" },
      { id: "desc" },
    ],
  },
  date_asc: {
    label: "Date (ancien > récent)",
    orderBy: [
      { course: { date: "asc" } },
      { issuedAt: "asc" },
      { id: "asc" },
    ],
  },
  amount_desc: {
    label: "Montant décroissant",
    orderBy: [
      { amountCents: "desc" },
      { course: { date: "desc" } },
      { id: "desc" },
    ],
  },
  amount_asc: {
    label: "Montant croissant",
    orderBy: [
      { amountCents: "asc" },
      { course: { date: "desc" } },
      { id: "desc" },
    ],
  },
  status: {
    label: "Statut (A→Z)",
    orderBy: [
      { status: "asc" },
      { course: { date: "desc" } },
      { id: "desc" },
    ],
  },
  teacher: {
    label: "Prof (A→Z)",
    orderBy: [
      { course: { teacher: { name: "asc" } } },
      { course: { date: "desc" } },
      { id: "desc" },
    ],
  },
};

function paramValue(value?: string | string[]) {
  if (Array.isArray(value)) return value[value.length - 1];
  return value;
}

function formatAmount(amountCents: number, currency: string) {
  const amt = (amountCents ?? 0) / 100;
  return `${amt.toFixed(2)} ${currency}`;
}

function dateFromParam(value?: string) {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export default async function AdminBillingPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolved = (await searchParams) ?? {};
  const pageParam = paramValue(resolved.page);
  const rawPage = Number(pageParam ?? "1");
  const statusParam = paramValue(resolved.status);
  const teacherFilter = paramValue(resolved.teacher);
  const studioFilter = paramValue(resolved.studio);
  const fromParam = paramValue(resolved.from);
  const toParam = paramValue(resolved.to);
  const flash = paramValue(resolved.flash);
  const thresholdParam = paramValue(resolved.threshold);
  const sortParam = paramValue(resolved.sort);
  const threshold = Number.parseInt(thresholdParam ?? "", 10);
  const creditThreshold = Number.isFinite(threshold) && threshold > 0 ? threshold : 200;
  const fromDate = dateFromParam(fromParam);
  const toDate = dateFromParam(toParam);
  const sortKey: SortKey = sortParam && sortOptions[sortParam as SortKey] ? (sortParam as SortKey) : "date_desc";
  const sortEntries = Object.entries(sortOptions) as [SortKey, { label: string }][];

  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SCHOOL_ADMIN" || !session.user.schoolId) {
    redirect("/access-denied");
  }

  const statusFilter =
    statusParam && Object.keys(statusLabels).includes(statusParam) ? (statusParam as InvoiceStatus) : undefined;

  const where: Prisma.InvoiceWhereInput = {
    status: statusFilter,
    course: {
      schoolId: session.user.schoolId,
      ...(teacherFilter ? { teacherId: teacherFilter } : {}),
      ...(studioFilter ? { studioId: studioFilter } : {}),
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

  const [totalCount, teachers, studios, students] = await Promise.all([
    prisma.invoice.count({ where }),
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
    prisma.user.findMany({
      where: { schoolId: session.user.schoolId, role: "STUDENT" },
      select: { id: true, name: true, email: true, credits: true },
      orderBy: { credits: "asc" },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / 10));
  const currentPage = Math.min(Math.max(1, rawPage || 1), totalPages);
  const skip = (currentPage - 1) * 10;

  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: sortOptions[sortKey].orderBy,
    skip,
    take: 10,
    include: {
      course: {
        include: {
          teacher: { select: { id: true, name: true, email: true } },
          studio: { select: { id: true, name: true } },
          _count: { select: { attendances: true } },
        },
      },
    },
  });

  const queryParams = new URLSearchParams();
  if (statusFilter) queryParams.set("status", statusFilter);
  if (teacherFilter) queryParams.set("teacher", teacherFilter);
  if (studioFilter) queryParams.set("studio", studioFilter);
  if (fromParam) queryParams.set("from", fromParam);
  if (toParam) queryParams.set("to", toParam);
  if (thresholdParam) queryParams.set("threshold", thresholdParam);
  if (sortParam) queryParams.set("sort", sortKey);
  const qs = queryParams.toString();
  const userKey = session.user.id ?? "anon";
  const activeFilters = [statusFilter, teacherFilter, studioFilter, fromParam, toParam].filter(Boolean).length;
  const exportHref = `/api/admin/billing/export${qs ? `?${qs}` : ""}`;
  const totalCredits = students.reduce((acc, s) => acc + (s.credits ?? 0), 0);
  const lowCredits = students.filter((s) => (s.credits ?? 0) < creditThreshold).slice(0, 5);
  const lowCreditsCount = students.filter((s) => (s.credits ?? 0) < creditThreshold).length;
  const baseBillingPath = "/app/admin/billing";
  const qsPrefix = qs ? `?${qs}` : "";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-3 px-0 py-6 md:gap-6 md:px-8 md:py-10">
      <header className="panel flex flex-wrap items-start justify-between gap-3 border-indigo-400/25 p-6 shadow-indigo-900/30">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Admin</p>
          <h1 className="text-3xl font-semibold text-white">Facturation</h1>
          <p className="text-sm text-slate-300">
            Liste des factures par cours. Filtres par date, professeur, studio et statut.
          </p>
        </div>
        <Link
          href="/app/admin"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-normal text-white transition hover:border-cyan-400/70 hover:bg-white/10"
      >
        ← Retour dashboard
      </Link>
      <form action={backfillInvoicesAction} className="w-full">
        <input type="hidden" name="redirectTo" value="/app/admin/billing?flash=backfill" />
        <button
          type="submit"
          className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/60 bg-emerald-500/15 px-3 py-2 text-sm font-semibold text-emerald-50 transition hover:border-emerald-300/70 hover:bg-emerald-500/25"
        >
          Générer les factures manquantes
        </button>
      </form>
    </header>

      {flash === "backfill" && (
        <div className="rounded-xl border border-emerald-400/50 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-50">
          Factures manquantes générées avec succès.
        </div>
      )}
      {flash === "updated" && (
        <div className="rounded-xl border border-cyan-400/50 bg-cyan-500/15 px-4 py-3 text-sm text-cyan-50">
          Statut/montant mis à jour.
        </div>
      )}

      <section className="panel p-4 md:p-6">
        <FilterPanel
          storageKey="filters:admin-billing"
          title="Filtres"
          activeCount={activeFilters}
          userKey={userKey}
          contentClassName="mt-3"
        >
          <form
            method="get"
            className="grid w-full gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-indigo-900/20 md:grid-cols-6 md:items-end"
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
              Professeur
              <select
                name="teacher"
                defaultValue={teacherFilter ?? ""}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              >
                <option value="">Tous</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name ?? t.email}
                  </option>
                ))}
              </select>
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
              Seuil crédits
              <input
                type="number"
                name="threshold"
                min="1"
                defaultValue={thresholdParam ?? creditThreshold}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              />
            </label>
            <label className="text-sm text-slate-200">
              Tri
              <select
                name="sort"
                defaultValue={sortKey}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              >
                {sortEntries.map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.label}
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
            <div className="md:col-span-6 flex flex-wrap items-center justify-end gap-2">
              <button
                type="submit"
                className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-400"
              >
                Filtrer
              </button>
              <Link
                href="/app/admin/billing"
                className="rounded-full border border-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
              >
                Réinitialiser
              </Link>
              <Link
                href={exportHref}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
              >
                Export CSV
              </Link>
            </div>
          </form>
        </FilterPanel>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Crédits élèves</p>
            <p className="text-2xl font-semibold text-white">{totalCredits} crédits</p>
            <p className="text-sm text-slate-300">Somme totale sur les élèves de l’école.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-amber-200">Crédits faibles (&lt;200)</p>
            <p className="text-2xl font-semibold text-white">{lowCreditsCount}</p>
            <p className="text-sm text-slate-300">Seuil : {creditThreshold} crédits.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-emerald-200">Top alertes</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-200">
              {lowCredits.length === 0 && <li className="text-slate-400">Aucune alerte</li>}
          {lowCredits.map((s) => (
            <li key={s.id} className="flex items-center justify-between">
              <Link
                href={`/app/teacher/students/${s.id}`}
                className="truncate text-cyan-100 underline underline-offset-2"
                  >
                    {s.name ?? s.email ?? "Élève"}
                  </Link>
                  <span className="rounded-full border border-amber-400/50 bg-amber-500/15 px-2 py-0.5 text-[12px] text-amber-50">
                    {s.credits} cr
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

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
            const redirectUpdated = `${baseBillingPath}${qsPrefix}${qs ? "&" : "?"}flash=updated#invoice-${invoice.id}`;
            return (
              <article id={`invoice-${invoice.id}`} key={invoice.id} className="flex flex-col gap-3 py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold ${badgeClass}`}
                    >
                      {badgeLabel}
                    </span>
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-white">
                        {course.title ?? "Cours"} · {formattedDate}
                      </p>
                      <p className="text-xs text-slate-300">
                        ID cours : {course.id}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-right">
                    <div className="text-lg font-semibold text-white">
                      {formatAmount(invoice.amountCents, invoice.currency)}
                    </div>
                    {invoice.paidAt && (
                      <span className="inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-[12px] text-emerald-50">
                        Payée le {new Date(invoice.paidAt).toLocaleDateString("fr-FR")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[12px]">
                    Prof : {course.teacher?.name ?? course.teacher?.email ?? "N/A"}
                  </span>
                  {course.studio?.name && (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[12px]">
                      Studio : {course.studio.name}
                    </span>
                  )}
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[12px]">
                    Présences : {attendees}
                  </span>
                  {invoice.note && (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[12px]">
                      Note : {invoice.note}
                    </span>
                  )}
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 shadow-inner shadow-indigo-900/20">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/app/teacher/courses/${course.id}?from=/app/admin/billing`}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
                      >
                        Voir le cours
                      </Link>
                      {course.teacher?.id && (
                        <Link
                          href={`/app/teachers/${course.teacher.id}?from=/app/admin/billing`}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
                        >
                          Voir le prof
                        </Link>
                      )}
                    </div>
                    <form
                      action={updateInvoiceStatusAction}
                      className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end"
                    >
                      <input type="hidden" name="invoiceId" value={invoice.id} />
                      <input type="hidden" name="redirectTo" value={redirectUpdated} />
                      <label className="text-xs text-slate-300">
                        Montant (€)
                        <input
                          type="number"
                          name="amount"
                          step="0.01"
                          defaultValue={(invoice.amountCents / 100).toFixed(2)}
                          className="ml-2 w-28 rounded-lg border border-white/10 bg-white/10 px-2 py-1 text-xs text-white outline-none focus:border-cyan-400"
                        />
                      </label>
                      <label className="text-xs text-slate-300">
                        Note
                        <input
                          type="text"
                          name="note"
                          defaultValue={invoice.note ?? ""}
                          placeholder="Note"
                          className="ml-2 w-40 rounded-lg border border-white/10 bg-white/10 px-2 py-1 text-xs text-white outline-none focus:border-cyan-400"
                        />
                      </label>
                      <input type="hidden" name="status" value={invoice.status} />
                      <button
                        type="submit"
                        className="rounded-full bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-cyan-400"
                        title="Mettre à jour montant/note"
                      >
                        Sauvegarder
                      </button>
                    </form>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-end gap-2 text-[11px]">
                    {[InvoiceStatus.SENT, InvoiceStatus.PAID, InvoiceStatus.CANCELLED, InvoiceStatus.LATE].map(
                      (target) => (
                        <form key={target} action={updateInvoiceStatusAction} className="inline-flex">
                          <input type="hidden" name="invoiceId" value={invoice.id} />
                          <input type="hidden" name="amount" value={(invoice.amountCents / 100).toFixed(2)} />
                          <input type="hidden" name="note" value={invoice.note ?? ""} />
                          <input type="hidden" name="redirectTo" value={redirectUpdated} />
                          <input type="hidden" name="status" value={target} />
                          <button
                            type="submit"
                            className={`rounded-full border px-2 py-1 font-semibold text-white transition shadow-sm ${
                              target === InvoiceStatus.PAID
                                ? "border-emerald-400/80 bg-emerald-500/40 hover:bg-emerald-400/70"
                                : target === InvoiceStatus.SENT
                                ? "border-cyan-400/80 bg-cyan-500/30 hover:bg-cyan-400/60"
                                : target === InvoiceStatus.LATE
                                ? "border-amber-400/80 bg-amber-500/30 hover:bg-amber-400/60"
                                : "border-red-400/80 bg-red-500/30 hover:bg-red-400/60"
                            }`}
                            title={`Marquer ${statusLabels[target]}`}
                          >
                            {statusLabels[target]}
                          </button>
                        </form>
                      )
                    )}
                  </div>
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
              href={`/app/admin/billing?page=${Math.max(1, currentPage - 1)}${qs ? `&${qs}` : ""}`}
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
              href={`/app/admin/billing?page=${Math.min(totalPages, currentPage + 1)}${qs ? `&${qs}` : ""}`}
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
