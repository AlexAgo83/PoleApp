import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { deleteCreditPackOfferAction, upsertCreditPackOfferAction } from "../actions";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatAmount(cents: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format((cents ?? 0) / 100);
}

export default async function SuperAdminPacksPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
} = {}) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/access-denied");
  }

  const resolvedParams = (await searchParams) ?? {};
  const getValue = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value);
  const flash = getValue(resolvedParams.flash);
  const flashError = getValue(resolvedParams.error);

  const getPage = (key: string) => {
    const raw = getValue(resolvedParams[key]);
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  };

  const [settings, packs] = await Promise.all([
    prisma.globalSetting.upsert({
      where: { id: "global" },
      update: {},
      create: {
        id: "global",
        defaultVatPercent: 20,
        currency: "EUR",
        timezone: process.env.GLOBAL_TIMEZONE || "Europe/Paris",
        icsDefaultAlarmMinutes: 30,
      },
    }),
    prisma.creditPackOffer.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  const currency = settings.currency || "EUR";
  const packsPerPage = 5;
  const packsTotalPages = Math.max(1, Math.ceil(packs.length / packsPerPage));
  const packsPage = Math.min(Math.max(getPage("packsPage"), 1), packsTotalPages);
  const paginatedPacks = packs.slice((packsPage - 1) * packsPerPage, packsPage * packsPerPage);

  const renderPager = (page: number, total: number, key: string) => {
    const disablePrev = page <= 1;
    const disableNext = page >= total;
    const baseButton =
      "inline-flex items-center justify-center rounded-full border border-white/10 px-3 py-1 text-sm font-semibold transition";
    const enabled =
      " text-white hover:border-cyan-300/70 hover:bg-cyan-500/20 hover:text-white";
    const disabled = " cursor-not-allowed opacity-40";
    const buildHref = (target: number) => {
      const params = new URLSearchParams();
      Object.entries(resolvedParams).forEach(([k, v]) => {
        if (k === key) return;
        const val = getValue(v);
        if (val) params.set(k, val);
      });
      params.set(key, String(target));
      return `?${params.toString()}`;
    };
    return (
      <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
        <span>
          Page {page} / {total}
        </span>
        <div className="flex gap-2">
          <Link
            href={buildHref(Math.max(1, page - 1))}
            aria-disabled={disablePrev}
            tabIndex={disablePrev ? -1 : undefined}
            className={`${baseButton}${disablePrev ? disabled : enabled}`}
          >
            Précédent
          </Link>
          <Link
            href={buildHref(Math.min(total, page + 1))}
            aria-disabled={disableNext}
            tabIndex={disableNext ? -1 : undefined}
            className={`${baseButton}${disableNext ? disabled : enabled}`}
          >
            Suivant
          </Link>
        </div>
      </div>
    );
  };

  return (
    <main className="grid gap-4 md:gap-6">
      {flash === "invalid-pack" && (
        <div className="rounded-xl border border-amber-300/60 bg-amber-500/15 px-4 py-3 text-sm text-amber-50 shadow-lg shadow-amber-900/30">
          Pack invalide : vérifie le nom, le prix ou les crédits.
          {flashError && <span className="ml-2 font-normal text-amber-100/80">({flashError})</span>}
        </div>
      )}

      <section className="space-y-4">
        <div className="panel space-y-3 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-cyan-200">Packs crédits</p>
              <h3 className="text-lg font-semibold text-white">Catalogue global</h3>
              <p className="text-sm text-slate-300">Packs TTC en {currency}, crédits inclus, état actif/ouvert.</p>
            </div>
          </div>

          <div className="space-y-3">
            {packs.length === 0 && (
              <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
                Aucun pack crédit pour le moment.
              </p>
            )}
            {paginatedPacks.map((pack) => (
              <div key={pack.id} className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/20">
                <form action={upsertCreditPackOfferAction} className="grid gap-3 md:grid-cols-2">
                  <input type="hidden" name="redirectTo" value="/super-admin/packs" />
                  <input type="hidden" name="id" value={pack.id} />
                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-slate-300">Nom</span>
                    <input
                      name="name"
                      defaultValue={pack.name}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-white"
                      required
                      minLength={2}
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-slate-300">Crédits</span>
                    <input
                      name="credits"
                      type="number"
                      min={0}
                      defaultValue={pack.credits}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-white"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-slate-300">Prix TTC</span>
                    <input
                      name="price"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={(pack.priceCents ?? 0) / 100}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-white"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-slate-300">TVA %</span>
                    <input
                      name="vat"
                      type="number"
                      min={0}
                      max={100}
                      defaultValue={pack.vatPercent}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-white"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-slate-300">Ordre</span>
                    <input
                      name="sortOrder"
                      type="number"
                      min={0}
                      defaultValue={pack.sortOrder}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-white"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-200">
                    <input type="checkbox" name="isActive" defaultChecked={pack.isActive} /> Actif
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-200">
                    <input type="checkbox" name="isOpen" defaultChecked={pack.isOpen} /> Ouvert à la vente
                  </label>
                  <div className="flex flex-wrap items-center gap-2 md:col-span-2">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 rounded-full border border-cyan-400/60 bg-cyan-500/20 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-300/70 hover:bg-cyan-500/30"
                    >
                      Enregistrer
                    </button>
                    <span className="text-xs text-slate-400">
                      {pack.credits} crédits — {formatAmount(pack.priceCents, currency)}
                    </span>
                  </div>
                </form>
                <form action={deleteCreditPackOfferAction} className="mt-2 inline-flex">
                  <input type="hidden" name="redirectTo" value="/super-admin/packs" />
                  <input type="hidden" name="id" value={pack.id} />
                  <ConfirmDeleteButton
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-full border border-red-400/60 bg-red-500/15 px-3 py-2 text-sm font-semibold text-red-50 transition hover:border-red-300/70 hover:bg-red-500/25"
                  >
                    Supprimer
                  </ConfirmDeleteButton>
                </form>
              </div>
            ))}
          </div>

          {packsTotalPages > 1 && renderPager(packsPage, packsTotalPages, "packsPage")}
          <div className="mt-4 border-t border-white/10 pt-4">
            <h4 className="text-base font-semibold text-white">Nouveau pack crédits</h4>
            <form action={upsertCreditPackOfferAction} className="mt-3 grid gap-2 md:grid-cols-2">
              <input type="hidden" name="redirectTo" value="/super-admin/packs" />
              <label className="space-y-1">
                <span className="text-xs text-slate-300">Nom</span>
                <input
                  name="name"
                  placeholder="Pack 500"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-white"
                  required
                  minLength={2}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-300">Crédits</span>
                <input
                  name="credits"
                  type="number"
                  min={0}
                  defaultValue={500}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-white"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-300">Prix TTC</span>
                <input
                  name="price"
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={9.99}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-white"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-300">TVA %</span>
                <input
                  name="vat"
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={settings.defaultVatPercent}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-white"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-300">Ordre</span>
                <input
                  name="sortOrder"
                  type="number"
                  min={0}
                  defaultValue={packs.length + 1}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-white"
                />
              </label>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-full border border-cyan-400/60 bg-cyan-500/20 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-300/70 hover:bg-cyan-500/30"
                >
                  Ajouter le pack
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
