"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { InvoiceStatus } from "@prisma/client";

import { FilterPanel } from "@/components/FilterPanel";

type InvoiceDTO = {
  id: string;
  amountCents: number;
  currency: string;
  status: InvoiceStatus;
  paidAt: string | null;
  issuedAt: string | null;
  course: {
    id: string;
    date: string;
    title: string | null;
    teacher: { id: string | null; name: string | null; email: string | null } | null;
    studio: { id: string; name: string } | null;
    _count: { attendances: number };
  };
};

type Props = {
  initialQuery: string;
  teachers: { id: string; name: string | null; email: string | null }[];
  studios: { id: string; name: string }[];
  statusLabels: Record<InvoiceStatus, string>;
  statusClasses: Record<InvoiceStatus, string>;
  activeCount: number;
  userKey: string;
};

type ApiResponse = {
  invoices: InvoiceDTO[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  creditThreshold: number;
  totalCredits: number;
  lowCredits: { id: string; name: string | null; email: string | null; credits: number | null }[];
  lowCreditsCount: number;
  activeCount: number;
  premiumCount: number;
  creditUsersCount: number;
  vatPercent: number;
  subsMonthCount: number;
  packsMonthCount: number;
  error?: string;
};

export function BillingList({ initialQuery, teachers, studios, statusClasses, statusLabels, activeCount, userKey }: Props) {
  const [searchParams, setSearchParams] = useState<URLSearchParams>(() => new URLSearchParams(initialQuery));
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, startTransition] = useTransition();
  const [flash, setFlash] = useState<string | null>(() => new URLSearchParams(initialQuery).get("flash"));
  const [mutatingId, setMutatingId] = useState<string | null>(null);

  const qs = useMemo(() => {
    const clone = new URLSearchParams(searchParams);
    clone.delete("flash");
    return clone.toString();
  }, [searchParams]);

  const fetchData = () => {
    startTransition(async () => {
      const url = `/api/admin/billing/list${qs ? `?${qs}` : ""}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        setData({
          invoices: [],
          totalCount: 0,
          totalPages: 1,
          currentPage: 1,
          creditThreshold: 200,
          totalCredits: 0,
          lowCredits: [],
          lowCreditsCount: 0,
          activeCount: 0,
          premiumCount: 0,
          creditUsersCount: 0,
          vatPercent: 20,
          error: "fail",
        });
        setFlash("error");
        return;
      }
      const json: ApiResponse = await res.json();
      setData(json);
    });
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs]);

  useEffect(() => {
    if (flash) {
      const t = setTimeout(() => setFlash(null), 3500);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [flash]);

  const handlePage = (page: number) => {
    const clone = new URLSearchParams(searchParams);
    clone.set("page", String(page));
    setSearchParams(clone);
  };

  const filteredQs = qs ? `?${qs}` : "";

  const applyUpdate = async (payload: { invoiceId: string; status: InvoiceStatus; amount?: string }) => {
    setMutatingId(payload.invoiceId);
    setFlash(null);
    try {
      const res = await fetch("/api/admin/billing/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setFlash("error");
        return;
      }
      const json = (await res.json()) as { invoice: InvoiceDTO };
      setData((prev) =>
        prev
          ? {
              ...prev,
              invoices: prev.invoices.map((inv) => (inv.id === json.invoice.id ? { ...inv, ...json.invoice } : inv)),
            }
          : prev
      );
      setFlash("updated");
    } catch (err) {
      console.error(err);
      setFlash("error");
    } finally {
      setMutatingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {data && (
        <section className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Crédits élèves</p>
            <p className="text-2xl font-semibold text-white">{data.totalCredits} crédits</p>
            <p className="text-sm text-slate-300">Somme totale sur les élèves de l’école.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-emerald-200">Élèves actifs (mois en cours)</p>
            <p className="text-2xl font-semibold text-white">{data.activeCount}</p>
            <p className="text-sm text-slate-300">Actifs = Premium ou crédits &gt; 0.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-indigo-200">Répartition (mois)</p>
            <div className="mt-2 space-y-2 text-sm text-slate-200">
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <span>Premium</span>
                <span className="rounded-full border border-emerald-400/60 bg-emerald-500/20 px-2 py-0.5 text-[12px] text-emerald-50">
                  {data.premiumCount}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <span>Crédits &gt; 0 (forfait/pack)</span>
                <span className="rounded-full border border-cyan-400/60 bg-cyan-500/20 px-2 py-0.5 text-[12px] text-cyan-50">
                  {data.creditUsersCount}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <span>Abos achetés (mois)</span>
                <span className="rounded-full border border-indigo-300/60 bg-indigo-500/20 px-2 py-0.5 text-[12px] text-indigo-50">
                  {data.subsMonthCount}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <span>Packs achetés (mois)</span>
                <span className="rounded-full border border-amber-300/60 bg-amber-500/20 px-2 py-0.5 text-[12px] text-amber-50">
                  {data.packsMonthCount}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {flash && (
        <div className="fixed bottom-4 right-4 z-30 space-y-2">
          {flash === "backfill" && (
            <div className="rounded-xl border border-emerald-300/60 bg-emerald-600/85 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/40">
              Factures manquantes générées avec succès.
            </div>
          )}
          {flash === "updated" && (
            <div className="rounded-xl border border-emerald-300/60 bg-emerald-600/85 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/40">
              Statut/montant mis à jour.
            </div>
          )}
          {flash === "error" && (
            <div className="rounded-xl border border-red-400/60 bg-red-600/85 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-red-900/40">
              Action invalide ou droits insuffisants.
            </div>
          )}
          {flash === "filter" && (
            <div className="rounded-xl border border-cyan-300/60 bg-cyan-600/85 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-900/40">
              Filtres appliqués.
            </div>
          )}
        </div>
      )}

      <section className="panel p-4 md:p-6">
      <div className="flex flex-col gap-2">
        <FilterPanel
          storageKey="filters:admin-billing"
          title="Filtres"
          activeCount={activeCount}
          userKey={userKey}
          contentClassName="mt-3"
          className="w-full"
          titleClassName="text-sm font-semibold text-white"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const fd = new FormData(form);
              const clone = new URLSearchParams();
              ["from", "to", "teacher", "studio", "threshold", "status", "sort"].forEach((k) => {
                const v = fd.get(k)?.toString() ?? "";
                if (v) clone.set(k, v);
              });
              setFlash("filter");
              setSearchParams(clone);
            }}
            className="mt-4 grid w-full gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-indigo-900/20 md:grid-cols-6 md:items-end"
          >
            <label className="text-sm text-slate-200">
              Date min
              <input
                type="date"
                name="from"
                defaultValue={searchParams.get("from") ?? ""}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              />
            </label>
            <label className="text-sm text-slate-200">
              Date max
              <input
                type="date"
                name="to"
                defaultValue={searchParams.get("to") ?? ""}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              />
            </label>
            <label className="text-sm text-slate-200">
              Professeur
              <select
                name="teacher"
                defaultValue={searchParams.get("teacher") ?? ""}
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
                defaultValue={searchParams.get("studio") ?? ""}
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
                defaultValue={searchParams.get("threshold") ?? ""}
                placeholder="200"
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              />
            </label>
            <label className="text-sm text-slate-200">
              Tri
              <select
                name="sort"
                defaultValue={searchParams.get("sort") ?? "date_desc"}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              >
                <option value="date_desc">Date (récent &gt; ancien)</option>
                <option value="date_asc">Date (ancien &gt; récent)</option>
                <option value="amount_desc">Montant décroissant</option>
                <option value="amount_asc">Montant croissant</option>
                <option value="status">Statut (A→Z)</option>
                <option value="teacher">Prof (A→Z)</option>
              </select>
            </label>
            <label className="text-sm text-slate-200">
              Statut
              <select
                name="status"
                defaultValue={searchParams.get("status") ?? ""}
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
              <button
                type="button"
                onClick={() => {
                  setFlash(null);
                  setSearchParams(new URLSearchParams());
                }}
                className="rounded-full border border-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
              >
                Réinitialiser
              </button>
              <a
                href={`/api/admin/billing/export${filteredQs}`}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
              >
                Export CSV
              </a>
            </div>
          </form>
        </FilterPanel>

        {activeCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-white">
            <span className="rounded-full border border-cyan-400/60 bg-cyan-500/20 px-2 py-0.5">
              {activeCount} filtre{activeCount > 1 ? "s" : ""} actif{activeCount > 1 ? "s" : ""}
            </span>
            {searchParams.get("status") && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-slate-200">
                Statut :{" "}
                {statusLabels[searchParams.get("status") as keyof typeof statusLabels] ??
                  searchParams.get("status")}
              </span>
            )}
            {searchParams.get("teacher") && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-slate-200">
                Prof : {teachers.find((t) => t.id === searchParams.get("teacher"))?.name ?? searchParams.get("teacher")}
              </span>
            )}
            {searchParams.get("studio") && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-slate-200">
                Studio : {studios.find((s) => s.id === searchParams.get("studio"))?.name ?? searchParams.get("studio")}
              </span>
            )}
            {(searchParams.get("from") || searchParams.get("to")) && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-slate-200">
                Dates : {searchParams.get("from") ?? "—"} → {searchParams.get("to") ?? "—"}
              </span>
            )}
            {searchParams.get("threshold") && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-slate-200">
                Montant ≥ {searchParams.get("threshold")} €
              </span>
            )}
            {searchParams.get("sort") && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-slate-200">
                Tri : {searchParams.get("sort")}
              </span>
            )}
          </div>
        )}

        <div className="flex w-full justify-end">
          <p className="text-sm text-slate-300">{loading ? "Chargement..." : `${data?.totalCount ?? 0} facture(s)`}</p>
        </div>
      </div>

        <div className="mt-4 divide-y divide-white/10">
          {!data && (
            <p className="text-sm text-slate-300">Chargement des factures...</p>
          )}
          {data?.invoices.map((invoice) => {
            const badgeClass = statusClasses[invoice.status];
            const badgeLabel = statusLabels[invoice.status];
            const attendees = invoice.course._count.attendances;
            const vatPercent = data.vatPercent ?? 20;
            const vatAmountCents = Math.round(invoice.amountCents * vatPercent * 0.01);
            const totalTtcCents = invoice.amountCents + vatAmountCents;
            const formattedDate = new Date(invoice.course.date).toLocaleString("fr-FR", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            });
            const formattedPaidAt = invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString("fr-FR") : null;
            return (
              <article id={`invoice-${invoice.id}`} key={invoice.id} className="flex flex-col gap-3 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold ${badgeClass}`}
                  >
                    {badgeLabel}
                  </span>
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-white">
                      {invoice.course.title ?? "Cours"}
                    </p>
                    <p className="text-sm text-slate-200">{formattedDate}</p>
                    <p className="text-xs text-slate-300">ID cours : {invoice.course.id}</p>
                  </div>
                </div>
                  <div className="flex flex-col items-end gap-1 text-right">
                    <div className="text-lg font-semibold text-white">
                      {(invoice.amountCents / 100).toFixed(2)} {invoice.currency}
                    </div>
                    <div className="text-[12px] text-slate-200">
                      TVA {vatPercent}% : {(vatAmountCents / 100).toFixed(2)} {invoice.currency}
                    </div>
                    <div className="text-sm font-semibold text-cyan-100">
                      TTC : {(totalTtcCents / 100).toFixed(2)} {invoice.currency}
                    </div>
                    {formattedPaidAt && (
                      <span className="inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-[12px] text-emerald-50">
                        Payée le {formattedPaidAt}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[12px]">
                    Prof : {invoice.course.teacher?.name ?? invoice.course.teacher?.email ?? "N/A"}
                  </span>
                  {invoice.course.studio?.name && (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[12px]">
                      Studio : {invoice.course.studio.name}
                    </span>
                  )}
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[12px]">
                    Présences : {attendees}
                  </span>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 shadow-inner shadow-indigo-900/20">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/app/teacher/courses/${invoice.course.id}?from=/app/admin/billing${filteredQs}`}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
                      >
                        Voir le cours
                      </Link>
                      {invoice.course.teacher?.id && (
                        <Link
                          href={`/app/teachers/${invoice.course.teacher.id}?from=/app/admin/billing${filteredQs}`}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
                        >
                          Voir le prof
                        </Link>
                      )}
                    </div>
                    <form
                      className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget);
                        void applyUpdate({
                          invoiceId: invoice.id,
                          status: invoice.status,
                          amount: fd.get("amount")?.toString(),
                        });
                      }}
                    >
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
                      <button
                        type="submit"
                        className="rounded-full bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-cyan-400 disabled:opacity-60"
                        disabled={mutatingId === invoice.id}
                        title="Mettre à jour montant/note"
                      >
                        Sauvegarder
                      </button>
                    </form>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-end gap-2 text-[11px]">
                    {[InvoiceStatus.SENT, InvoiceStatus.PAID, InvoiceStatus.CANCELLED, InvoiceStatus.LATE].map(
                      (target) => (
                        <button
                          key={target}
                          type="button"
                          onClick={() =>
                            applyUpdate({
                              invoiceId: invoice.id,
                              status: target,
                              amount: (invoice.amountCents / 100).toFixed(2),
                            })
                          }
                          className={`rounded-full border px-2 py-1 font-semibold text-white transition shadow-sm ${
                            target === InvoiceStatus.PAID
                              ? "border-emerald-400/80 bg-emerald-500/40 hover:bg-emerald-400/70"
                              : target === InvoiceStatus.SENT
                              ? "border-cyan-400/80 bg-cyan-500/30 hover:bg-cyan-400/60"
                              : target === InvoiceStatus.LATE
                              ? "border-amber-400/80 bg-amber-500/30 hover:bg-amber-400/60"
                              : "border-red-400/80 bg-red-500/30 hover:bg-red-400/60"
                          } ${mutatingId === invoice.id ? "opacity-60" : ""}`}
                          title={`Marquer ${statusLabels[target]}`}
                          disabled={mutatingId === invoice.id}
                        >
                          {statusLabels[target]}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </article>
            );
          })}
          {data?.invoices.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/15 bg-white/5 p-4 text-sm text-slate-300">
              Aucune facture trouvée. Ajuste les filtres ou vérifie les cours.
            </div>
          )}
        </div>

        {data && data.totalCount > 10 && (
          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => handlePage(Math.max(1, (data.currentPage ?? 1) - 1))}
              className={`rounded-full px-3 py-2 text-sm font-semibold ${
                data.currentPage === 1
                  ? "cursor-not-allowed border border-white/10 text-slate-500"
                  : "border border-white/10 text-white hover:border-cyan-400/70 hover:bg-white/5"
              }`}
              aria-disabled={data.currentPage === 1}
            >
              Précédent
            </button>
            <span className="text-sm text-slate-300">
              Page {data.currentPage} / {data.totalPages}
            </span>
            <button
              type="button"
              onClick={() => handlePage(Math.min(data.totalPages, (data.currentPage ?? 1) + 1))}
              className={`rounded-full px-3 py-2 text-sm font-semibold ${
                data.currentPage === data.totalPages
                  ? "cursor-not-allowed border border-white/10 text-slate-500"
                  : "border border-white/10 text-white hover:border-cyan-400/70 hover:bg-white/5"
              }`}
              aria-disabled={data.currentPage === data.totalPages}
            >
              Suivant
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
