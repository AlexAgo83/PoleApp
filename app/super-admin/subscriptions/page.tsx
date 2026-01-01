import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { deleteSubscriptionOfferAction, upsertSubscriptionOfferAction } from "../actions";
import { PersistedPanel } from "@/components/PersistedPanel";
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

export default async function SuperAdminSubscriptionsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
} = {}) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/access-denied");
  }

  const resolvedParams = (await searchParams) ?? {};
  const getValue = (value?: string | string[]) =>
    Array.isArray(value) ? value[0] : value;
  const flash = getValue(resolvedParams.flash);
  const flashError = getValue(resolvedParams.error);

  const getPage = (key: string) => {
    const raw = getValue(resolvedParams[key]);
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  };

  const [settings, subscriptions] = await Promise.all([
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
    prisma.subscriptionOffer.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  const currency = settings.currency || "EUR";
  const subscriptionsPerPage = 5;
  const subscriptionsTotalPages = Math.max(1, Math.ceil(subscriptions.length / subscriptionsPerPage));
  const subscriptionsPage = Math.min(Math.max(getPage("subsPage"), 1), subscriptionsTotalPages);
  const paginatedSubscriptions = subscriptions.slice(
    (subscriptionsPage - 1) * subscriptionsPerPage,
    subscriptionsPage * subscriptionsPerPage,
  );

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
      {flash === "invalid-offer" && (
        <div className="rounded-xl border border-amber-300/60 bg-amber-500/15 px-4 py-3 text-sm text-amber-50 shadow-lg shadow-amber-900/30">
          Offre abonnement invalide : vérifie le nom et les montants.
          {flashError && (
            <span className="ml-2 font-normal text-amber-100/80">({flashError})</span>
          )}
        </div>
      )}

      <section className="space-y-4">
        <div className="panel space-y-3 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-cyan-200">Abonnements</p>
              <h3 className="text-lg font-semibold text-white">Offres globales</h3>
              <p className="text-sm text-slate-300">
                Prix TTC en {currency}, crédits mensuels et disponibilité (actif/ouvert).
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {subscriptions.length === 0 && (
              <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
                Aucune offre pour le moment.
              </p>
            )}
            {paginatedSubscriptions.map((offer) => (
              <div key={offer.id} className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/20">
                <form action={upsertSubscriptionOfferAction} className="grid gap-3 md:grid-cols-2">
                  <input type="hidden" name="redirectTo" value="/super-admin/subscriptions" />
                  <input type="hidden" name="id" value={offer.id} />
                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-slate-300">Nom</span>
                    <input
                      name="name"
                      defaultValue={offer.name}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-white"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-slate-300">Crédits mensuels</span>
                    <input
                      name="credits"
                      type="number"
                      min={0}
                      defaultValue={offer.monthlyCredits}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-white"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-slate-300">Prix mensuel TTC</span>
                    <input
                      name="monthly"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={(offer.monthlyPriceCents ?? 0) / 100}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-white"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-slate-300">Prix annuel TTC</span>
                    <input
                      name="annual"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={(offer.annualPriceCents ?? 0) / 100}
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
                      defaultValue={offer.vatPercent}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-white"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-slate-300">Ordre</span>
                    <input
                      name="sortOrder"
                      type="number"
                      min={0}
                      defaultValue={offer.sortOrder}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-white"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-200">
                    <input type="checkbox" name="isActive" defaultChecked={offer.isActive} /> Actif
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-200">
                    <input type="checkbox" name="isOpen" defaultChecked={offer.isOpen} /> Ouvert à la vente
                  </label>
                  <label className="space-y-1 md:col-span-2">
                    <span className="text-xs font-semibold text-slate-300">Term par défaut</span>
                    <select
                      name="defaultTerm"
                      defaultValue={offer.defaultTerm ?? "MONTHLY"}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-white"
                      required
                    >
                      <option value="MONTHLY">Mensuel</option>
                      <option value="ANNUAL">Annuel</option>
                    </select>
                  </label>
                  <div className="flex flex-wrap items-center gap-2 md:col-span-2">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 rounded-full border border-cyan-400/60 bg-cyan-500/20 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-300/70 hover:bg-cyan-500/30"
                    >
                      Enregistrer
                    </button>
                    <span className="text-xs text-slate-400">
                      {formatAmount(offer.monthlyPriceCents, currency)} / mois — {offer.monthlyCredits} crédits
                    </span>
                  </div>
                </form>
                <form action={deleteSubscriptionOfferAction} className="mt-2 inline-flex">
                  <input type="hidden" name="redirectTo" value="/super-admin/subscriptions" />
                  <input type="hidden" name="id" value={offer.id} />
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

          {subscriptionsTotalPages > 1 &&
            renderPager(subscriptionsPage, subscriptionsTotalPages, "subsPage")}
          <div className="mt-4 border-t border-white/10 pt-4">
            <h4 className="text-base font-semibold text-white">Nouvelle offre abonnement</h4>
            <form action={upsertSubscriptionOfferAction} className="mt-3 grid gap-2 md:grid-cols-2">
              <input type="hidden" name="redirectTo" value="/super-admin/subscriptions" />
              <label className="space-y-1">
                <span className="text-xs text-slate-300">Nom</span>
                <input
                  name="name"
                  placeholder="Nom"
                  required
                  minLength={2}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-white"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-300">Crédits mensuels</span>
                <input
                  name="credits"
                  type="number"
                  min={0}
                  step="1"
                  defaultValue={1000}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-white"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-300">Prix mensuel TTC</span>
                <input
                  name="monthly"
                  type="number"
                  step="0.01"
                  min={0}
                  defaultValue={(settings.defaultVatPercent ?? 0) ? 9.99 : 0}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-white"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-300">Prix annuel TTC</span>
                <input
                  name="annual"
                  type="number"
                  step="0.01"
                  min={0}
                  defaultValue={59.9}
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
                  step="0.1"
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
                  step="1"
                  defaultValue={subscriptions.length + 1}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-white"
                />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-xs text-slate-300">Term par défaut</span>
                <select
                  name="defaultTerm"
                  defaultValue="MONTHLY"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-white"
                  required
                >
                  <option value="MONTHLY">Mensuel</option>
                  <option value="ANNUAL">Annuel</option>
                </select>
              </label>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-full border border-cyan-400/60 bg-cyan-500/20 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-300/70 hover:bg-cyan-500/30"
                >
                  Ajouter l&apos;offre
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
