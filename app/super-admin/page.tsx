import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import {
  assignSchoolAdminAction,
  createSchoolAction,
  deleteCreditPackOfferAction,
  deleteSubscriptionOfferAction,
  promoteSuperAdminAction,
  toggleArchiveSchoolAction,
  updateSettingsAction,
  upsertCreditPackOfferAction,
  upsertSubscriptionOfferAction,
} from "./actions";
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

export default async function SuperAdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/access-denied");
  }

  const [settings, schools, subscriptions, packs, audits] = await Promise.all([
    prisma.globalSetting.upsert({
      where: { id: "global" },
      update: {},
      create: { id: "global", defaultVatPercent: 20, currency: "EUR" },
    }),
    prisma.school.findMany({
      orderBy: { name: "asc" },
      include: {
        users: {
          where: { role: "SCHOOL_ADMIN" },
          select: { id: true, name: true, email: true },
        },
      },
    }),
    prisma.subscriptionOffer.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.creditPackOffer.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { actor: { select: { email: true } } },
    }),
  ]);

  const currency = settings.currency || "EUR";
  const activeSchools = schools.filter((s) => !s.archivedAt).length;

  return (
    <div className="grid gap-4 md:gap-6">
      <section className="panel border-cyan-300/25 p-5 shadow-cyan-900/30">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-cyan-200">Paramètres globaux</p>
            <h2 className="text-xl font-semibold text-white">TVA & devise</h2>
            <p className="text-sm text-slate-300">
              Paramètres appliqués aux offres globales (abonnements/packs). TVA par défaut utilisée pour les
              nouveaux items.
            </p>
          </div>
          <div className="flex gap-3 text-sm text-slate-200">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
              Écoles actives : <strong className="text-white">{activeSchools}</strong>
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
              Admins d&apos;écoles :{" "}
              <strong className="text-white">
                {schools.reduce((acc, s) => acc + s.users.length, 0)}
              </strong>
            </span>
          </div>
        </div>

        <form action={updateSettingsAction} className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-200">Devise</span>
            <input
              name="currency"
              defaultValue={settings.currency}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-cyan-400/70 focus:outline-none"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-200">TVA (%)</span>
            <input
              name="vatPercent"
              type="number"
              min={0}
              max={100}
              defaultValue={settings.defaultVatPercent}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-cyan-400/70 focus:outline-none"
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-xl border border-cyan-400/60 bg-cyan-500/20 px-3 py-2 font-semibold text-white transition hover:border-cyan-300/80 hover:bg-cyan-500/30"
            >
              Mettre à jour
            </button>
          </div>
        </form>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
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
            {subscriptions.map((offer) => (
              <div key={offer.id} className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/20">
                <form action={upsertSubscriptionOfferAction} className="grid gap-3 md:grid-cols-2">
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
                    <input
                      name="defaultTerm"
                      defaultValue={offer.defaultTerm ?? "MONTHLY"}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-white"
                    />
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
                  <input type="hidden" name="id" value={offer.id} />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-full border border-red-400/60 bg-red-500/15 px-3 py-2 text-sm font-semibold text-red-50 transition hover:border-red-300/70 hover:bg-red-500/25"
                  >
                    Supprimer
                  </button>
                </form>
              </div>
            ))}

            <div className="rounded-xl border border-dashed border-white/15 bg-white/5 p-4 shadow-inner shadow-black/20">
              <p className="text-sm font-semibold text-white">Nouvelle offre abonnement</p>
              <form action={upsertSubscriptionOfferAction} className="mt-3 grid gap-2 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs text-slate-300">Nom</span>
                  <input
                    name="name"
                    placeholder="Nom"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-white"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-slate-300">Crédits mensuels</span>
                  <input
                    name="credits"
                    type="number"
                    min={0}
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
                    defaultValue={subscriptions.length + 1}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-white"
                  />
                </label>
                <label className="space-y-1 md:col-span-2">
                  <span className="text-xs text-slate-300">Term par défaut</span>
                  <input
                    name="defaultTerm"
                    defaultValue="MONTHLY"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-white"
                  />
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
        </div>

        <div className="panel space-y-3 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-cyan-200">Packs crédits</p>
              <h3 className="text-lg font-semibold text-white">Catalogue global</h3>
              <p className="text-sm text-slate-300">Packs TTC en {currency}, crédits inclus, état actif/ouvert.</p>
            </div>
          </div>

          <div className="space-y-3">
            {packs.map((pack) => (
              <div key={pack.id} className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/20">
                <form action={upsertCreditPackOfferAction} className="grid gap-3 md:grid-cols-2">
                  <input type="hidden" name="id" value={pack.id} />
                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-slate-300">Nom</span>
                    <input
                      name="name"
                      defaultValue={pack.name}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-white"
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
                      min={0}
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
                  <input type="hidden" name="id" value={pack.id} />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-full border border-red-400/60 bg-red-500/15 px-3 py-2 text-sm font-semibold text-red-50 transition hover:border-red-300/70 hover:bg-red-500/25"
                  >
                    Supprimer
                  </button>
                </form>
              </div>
            ))}

            <div className="rounded-xl border border-dashed border-white/15 bg-white/5 p-4 shadow-inner shadow-black/20">
              <p className="text-sm font-semibold text-white">Nouveau pack</p>
              <form action={upsertCreditPackOfferAction} className="mt-3 grid gap-2 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs text-slate-300">Nom</span>
                  <input
                    name="name"
                    placeholder="Pack 500"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-white"
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
        </div>
      </section>

      <section className="panel space-y-4 border-indigo-300/20 p-5 shadow-indigo-900/30">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-indigo-200">Écoles</p>
            <h3 className="text-lg font-semibold text-white">Gestion écoles & admins</h3>
            <p className="text-sm text-slate-300">
              Créer/archiver des écoles, assigner un admin par email (le compte bascule en SCHOOL_ADMIN).
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-dashed border-white/15 bg-white/5 p-4">
            <p className="text-sm font-semibold text-white">Créer une école</p>
            <form action={createSchoolAction} className="mt-3 space-y-2">
              <label className="space-y-1">
                <span className="text-xs text-slate-300">Nom</span>
                <input
                  name="name"
                  placeholder="Nouvelle école"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-white"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-300">Site web (optionnel)</span>
                <input
                  name="website"
                  placeholder="https://"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-white"
                />
              </label>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full border border-indigo-400/60 bg-indigo-500/20 px-3 py-2 text-sm font-semibold text-white transition hover:border-indigo-300/70 hover:bg-indigo-500/30"
              >
                Créer
              </button>
            </form>
          </div>

          <div className="rounded-xl border border-dashed border-white/15 bg-white/5 p-4">
            <p className="text-sm font-semibold text-white">Assigner un admin à une école</p>
            <form action={assignSchoolAdminAction} className="mt-3 grid gap-2 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs text-slate-300">Email user</span>
                <input
                  name="email"
                  type="email"
                  placeholder="admin@exemple.com"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-white"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-300">École</span>
                <select
                  name="schoolId"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-white"
                  defaultValue={schools[0]?.id}
                >
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-full border border-indigo-400/60 bg-indigo-500/20 px-3 py-2 text-sm font-semibold text-white transition hover:border-indigo-300/70 hover:bg-indigo-500/30"
                >
                  Assigner comme admin
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {schools.map((school) => (
            <div key={school.id} className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/20">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h4 className="text-lg font-semibold text-white">{school.name}</h4>
                  <p className="text-xs text-slate-300">
                    {school.website ? (
                      <a href={school.website} className="underline" target="_blank" rel="noreferrer">
                        {school.website}
                      </a>
                    ) : (
                      "Site non renseigné"
                    )}
                  </p>
                  <p className="text-xs text-slate-400">
                    {school.archivedAt ? "Archivée" : "Active"} — Admins : {school.users.length || 0}
                  </p>
                </div>
                <form action={toggleArchiveSchoolAction}>
                  <input type="hidden" name="schoolId" value={school.id} />
                  <input type="hidden" name="mode" value={school.archivedAt ? "restore" : "archive"} />
                  <button
                    type="submit"
                    className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                      school.archivedAt
                        ? "border border-emerald-300/60 bg-emerald-500/15 text-emerald-50 hover:border-emerald-300/80"
                        : "border border-amber-300/60 bg-amber-500/15 text-amber-50 hover:border-amber-300/80"
                    }`}
                  >
                    {school.archivedAt ? "Restaurer" : "Archiver"}
                  </button>
                </form>
              </div>
              <div className="mt-3 space-y-1 text-sm text-slate-200">
                {school.users.length === 0 && <p className="text-slate-400">Aucun admin assigné.</p>}
                {school.users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                    <div>
                      <p className="font-semibold text-white">{u.name || u.email}</p>
                      <p className="text-xs text-slate-300">{u.email}</p>
                    </div>
                    <span className="rounded-full border border-indigo-300/50 bg-indigo-500/20 px-2 py-1 text-[11px] uppercase tracking-[0.12em] text-indigo-100">
                      Admin
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel space-y-4 border-red-300/20 p-5 shadow-red-900/30">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-red-200">Super Admin</p>
            <h3 className="text-lg font-semibold text-white">Promotion / Dégradation</h3>
            <p className="text-sm text-slate-300">
              Promouvoir ou retirer le rôle SUPER_ADMIN via email (sécurité recovery). Audit log automatique.
            </p>
          </div>
        </div>
        <form action={promoteSuperAdminAction} className="grid gap-2 md:grid-cols-[2fr_1fr_1fr]">
          <label className="space-y-1">
            <span className="text-xs text-slate-300">Email</span>
            <input
              name="email"
              type="email"
              placeholder="user@poleapp.test"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-white"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-slate-300">Action</span>
            <select
              name="action"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-white"
              defaultValue="promote"
            >
              <option value="promote">Promouvoir en SUPER_ADMIN</option>
              <option value="demote">Retirer (SCHOOL_ADMIN ou STUDENT)</option>
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-red-400/60 bg-red-500/20 px-3 py-2 text-sm font-semibold text-white transition hover:border-red-300/70 hover:bg-red-500/30"
            >
              Valider
            </button>
          </div>
        </form>
      </section>

      <section className="panel space-y-3 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-200">Audit</p>
            <h3 className="text-lg font-semibold text-white">10 dernières actions</h3>
          </div>
        </div>
        <div className="space-y-2">
          {audits.length === 0 && <p className="text-sm text-slate-400">Aucune action super-admin enregistrée.</p>}
          {audits.map((log) => (
            <div
              key={log.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200"
            >
              <div>
                <p className="font-semibold text-white">{log.action}</p>
                <p className="text-xs text-slate-400">
                  {log.target ? `Cible: ${log.target} — ` : ""}
                  {log.actor?.email || "N/A"}
                </p>
              </div>
              <p className="text-xs text-slate-400">
                {new Date(log.createdAt).toLocaleString("fr-FR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
