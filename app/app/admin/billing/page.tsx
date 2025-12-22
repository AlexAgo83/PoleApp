import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { InvoiceStatus, Prisma } from "@prisma/client";

import { FilterPanel } from "@/components/FilterPanel";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateInvoiceStatusAction } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams =
  | {
      page?: string | string[];
      status?: string | string[];
      teacher?: string | string[];
      studio?: string | string[];
      from?: string | string[];
      to?: string | string[];
      export?: string | string[];
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
  const exportParam = paramValue(resolved.export);
  const fromDate = dateFromParam(fromParam);
  const toDate = dateFromParam(toParam);

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

  const [totalCount, teachers, studios] = await Promise.all([
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
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / 10));
  const currentPage = Math.min(Math.max(1, rawPage || 1), totalPages);
  const skip = (currentPage - 1) * 10;

  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: { issuedAt: "desc" },
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
  if (exportParam) queryParams.set("export", exportParam);
  const qs = queryParams.toString();
  const userKey = session.user.id ?? "anon";
  const activeFilters = [statusFilter, teacherFilter, studioFilter, fromParam, toParam].filter(Boolean).length;

  if (exportParam === "csv") {
    const rows = invoices.map((invoice) => {
      const course = invoice.course;
      const formattedDate = new Date(course.date).toISOString();
      const paid = invoice.paidAt ? new Date(invoice.paidAt).toISOString() : "";
      return [
        invoice.id,
        course.title ?? "Cours",
        formattedDate,
        course.teacher?.name ?? course.teacher?.email ?? "",
        course.studio?.name ?? "",
        course._count.attendances.toString(),
        (invoice.amountCents / 100).toFixed(2),
        invoice.currency,
        invoice.status,
        invoice.note ?? "",
        paid,
      ];
    });
    const header = [
      "invoiceId",
      "courseTitle",
      "courseDate",
      "teacher",
      "studio",
      "attendances",
      "amount",
      "currency",
      "status",
      "note",
      "paidAt",
    ];
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=\"billing.csv\"",
      },
    });
  }

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
      </header>

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
            className="grid w-full gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-indigo-900/20 md:grid-cols-5 md:items-end"
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
            <div className="md:col-span-5 flex flex-wrap items-center justify-end gap-2">
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
                  {invoice.paidAt && (
                    <span className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2 py-1 text-[12px] text-emerald-50">
                      Payée le {new Date(invoice.paidAt).toLocaleDateString("fr-FR")}
                    </span>
                  )}
                </div>
                {invoice.note && (
                  <p className="text-sm text-slate-300">Note : {invoice.note}</p>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2">
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
                  <form action={updateInvoiceStatusAction} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="invoiceId" value={invoice.id} />
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
                    <label className="text-xs text-slate-300">
                      Statut
                      <select
                        name="status"
                        defaultValue={invoice.status}
                        className="ml-2 rounded-lg border border-white/10 bg-white/10 px-2 py-1 text-xs text-white outline-none focus:border-cyan-400"
                      >
                        {Object.values(InvoiceStatus).map((st) => (
                          <option key={st} value={st}>
                            {statusLabels[st]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="submit"
                      className="rounded-full bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-cyan-400"
                    >
                      Mettre à jour
                    </button>
                  </form>
                  <div className="flex flex-wrap items-center gap-1 text-[11px]">
                    {[InvoiceStatus.SENT, InvoiceStatus.PAID, InvoiceStatus.CANCELLED, InvoiceStatus.LATE].map(
                      (target) => (
                        <form key={target} action={updateInvoiceStatusAction} className="inline-flex">
                          <input type="hidden" name="invoiceId" value={invoice.id} />
                          <input type="hidden" name="amount" value={(invoice.amountCents / 100).toFixed(2)} />
                          <input type="hidden" name="note" value={invoice.note ?? ""} />
                          <input type="hidden" name="status" value={target} />
                          <button
                            type="submit"
                            className="rounded-full border border-white/10 bg-white/5 px-2 py-1 font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
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
