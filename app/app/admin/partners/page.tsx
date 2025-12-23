import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { SponsoredLinksField } from "@/components/SponsoredLinksField";
import { createPartnerAction, deletePartnerAction, updatePartnerAction } from "./actions";
import { authOptions } from "@/lib/auth";
import { FilterPanel } from "@/components/FilterPanel";
import { PersistedPanel } from "@/components/PersistedPanel";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 10;
type PageLink = number | "...";
type SponsoredLinkRaw = { category?: unknown; label?: unknown; url?: unknown };
const toSponsoredLinksArray = (value: unknown): SponsoredLinkRaw[] =>
  Array.isArray(value) ? (value as SponsoredLinkRaw[]) : [];
const formatSponsoredLink = (link: SponsoredLinkRaw) => ({
  label: typeof link.label === "string" && link.label.trim().length > 0 ? link.label : "Lien",
  url: typeof link.url === "string" ? link.url : "",
});

function buildPageRange(totalPages: number, currentPage: number): PageLink[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);
  pages.add(currentPage);
  pages.add(currentPage - 1);
  pages.add(currentPage + 1);
  pages.add(currentPage - 2);
  pages.add(currentPage + 2);

  const sorted = Array.from(pages)
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);

  const range: PageLink[] = [];
  for (let i = 0; i < sorted.length; i += 1) {
    const val = sorted[i];
    const prev = sorted[i - 1];
    if (i > 0 && val - (prev ?? 0) > 1) {
      range.push("...");
    }
    range.push(val);
  }
  return range;
}

export default async function AdminPartnersPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; q?: string; kind?: string; edit?: string; from?: string; to?: string; flash?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SCHOOL_ADMIN") {
    redirect("/access-denied");
  }
  const userKey = session.user.id ?? "anon";
  if (!session.user.schoolId) {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-3 px-0 py-6 md:gap-6 md:px-8 md:py-10">
        <section className="panel p-4 md:p-6">
          <h1 className="text-3xl font-semibold text-white">Partenaires</h1>
          <p className="text-slate-300">Aucune école associée à ce compte.</p>
        </section>
      </main>
    );
  }

  const resolved = (await searchParams) ?? {};
  const rawPage = Number(resolved.page ?? "1");
  const q = resolved.q?.toString().trim() || "";
  const kindFilter = resolved.kind?.toString().trim() || "";
  const currentPage = Math.max(1, Number.isFinite(rawPage) ? rawPage : 1);
  const from = resolved.from?.toString();
  const to = resolved.to?.toString();
  const flash = resolved.flash?.toString();
  const editId = resolved.edit?.toString();

  const whereClause = {
    schoolId: session.user.schoolId,
    ...(kindFilter ? { kind: kindFilter } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { kind: { contains: q, mode: "insensitive" as const } },
            { website: { contains: q, mode: "insensitive" as const } },
            { description: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const totalCount = await prisma.partner.count({
    where: whereClause,
  });
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const skip = (safePage - 1) * PAGE_SIZE;
  const pageRange = buildPageRange(totalPages, safePage);

  let partners: Awaited<ReturnType<typeof prisma.partner.findMany>> = [];
  let supportsSponsored = true;
  try {
    partners = await prisma.partner.findMany({
      where: whereClause,
      orderBy: { name: "asc" },
      include: { sponsoredLinks: true },
      skip,
      take: PAGE_SIZE,
    });
  } catch {
    supportsSponsored = false;
    partners = await prisma.partner.findMany({
      where: whereClause,
      orderBy: { name: "asc" },
      skip,
      take: PAGE_SIZE,
    });
  }

  const partnerIds = partners.map((p) => p.id);
  const eventCounts = partnerIds.length
    ? await prisma.partnerEvent
        .groupBy({
          by: ["partnerId", "type"],
          _count: { _all: true },
          where: {
            partnerId: { in: partnerIds },
            ...(from || to
              ? {
                  createdAt: {
                    ...(from ? { gte: new Date(`${from}T00:00:00`) } : {}),
                    ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}),
                  },
                }
              : {}),
          },
        })
        .then((rows) => {
          const map = new Map<string, { clicks: number; purchases: number }>();
          rows.forEach((row) => {
            const current = map.get(row.partnerId) ?? { clicks: 0, purchases: 0 };
            if (row.type === "PURCHASE") {
              current.purchases += row._count._all;
            } else {
              current.clicks += row._count._all;
            }
            map.set(row.partnerId, current);
          });
          return map;
    })
    : new Map<string, { clicks: number; purchases: number }>();
  const totalClicks = Array.from(eventCounts.values()).reduce((acc, v) => acc + v.clicks, 0);
  const totalPurchases = Array.from(eventCounts.values()).reduce((acc, v) => acc + v.purchases, 0);
  const totalCtr = totalClicks > 0 ? Math.round((totalPurchases / totalClicks) * 1000) / 10 : 0;
  const partnerName = (id: string) => partners.find((p) => p.id === id)?.name ?? "Inconnu";
  const topClicks = Array.from(eventCounts.entries())
    .map(([id, val]) => ({ id, clicks: val.clicks }))
    .sort((a, b) => b.clicks - a.clicks)[0];
  const topPurchases = Array.from(eventCounts.entries())
    .map(([id, val]) => ({ id, purchases: val.purchases }))
    .sort((a, b) => b.purchases - a.purchases)[0];

  const commonQuery = new URLSearchParams();
  if (q) commonQuery.set("q", q);
  if (kindFilter) commonQuery.set("kind", kindFilter);
  if (from) commonQuery.set("from", from);
  if (to) commonQuery.set("to", to);
  const getPartnerStats = (partnerId: string) => {
    const stats = eventCounts.get(partnerId) ?? { clicks: 0, purchases: 0 };
    const ctr = stats.clicks > 0 ? Math.round((stats.purchases / stats.clicks) * 1000) / 10 : 0;
    return { ...stats, ctr };
  };

  const pageHref = (page: number) => {
    const params = new URLSearchParams(commonQuery);
    if (page > 1) params.set("page", page.toString());
    else params.delete("page");
    const qs = params.toString();
    return `/app/admin/partners${qs ? `?${qs}` : ""}`;
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-3 px-0 py-6 md:gap-6 md:px-8 md:py-10">
      {flash && (
        <div className="fixed bottom-4 right-4 z-30 space-y-2">
          {flash === "created" && (
            <div className="rounded-xl border border-emerald-300/60 bg-emerald-600/85 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/40">
              Partenaire créé.
            </div>
          )}
          {flash === "updated" && (
            <div className="rounded-xl border border-cyan-300/60 bg-cyan-600/85 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-900/40">
              Partenaire mis à jour.
            </div>
          )}
          {flash === "deleted" && (
            <div className="rounded-xl border border-red-400/60 bg-red-600/85 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-red-900/40">
              Partenaire supprimé.
            </div>
          )}
        </div>
      )}
      <header className="panel p-4 md:p-6">
        <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Admin</p>
        <h1 className="text-3xl font-semibold text-white">Partenaires</h1>
        <p className="text-sm text-slate-300">
          Gère les partenaires de l’école (revendeurs et services).
        </p>
        <div className="mt-4 flex flex-wrap justify-end gap-3 text-sm">
          <Link
            href="/app/admin"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            ← Retour dashboard
          </Link>
        </div>
      </header>

      <section className="panel p-4 md:p-6">
        <PersistedPanel
          storageKey="panel:admin-partners-create"
          title="Ajouter un partenaire"
          className="group"
          contentClassName="mt-4"
          userKey={userKey}
        >
          <form
            action={createPartnerAction}
            className="grid gap-4 md:grid-cols-2 md:gap-6"
          >
            <label className="text-sm text-slate-200 md:col-span-2">
              Nom
              <input
                name="name"
                required
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
              />
            </label>
            <label className="text-sm text-slate-200">
              Type
              <input
                name="kind"
                placeholder="SERVICE ou REVENDEUR"
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
                defaultValue="SERVICE"
              />
            </label>
            <label className="text-sm text-slate-200 md:col-span-2">
              Site web (optionnel)
              <input
                name="website"
                type="url"
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
              />
            </label>
            <label className="text-sm text-slate-200 md:col-span-2">
              Description (optionnel)
              <textarea
                name="description"
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
                rows={2}
              />
            </label>
            {supportsSponsored ? (
              <div className="md:col-span-2">
                <SponsoredLinksField name="sponsored" initialLinks={[]} />
              </div>
            ) : (
              <input type="hidden" name="sponsored" value="[]" />
            )}
            <div className="md:col-span-2 flex flex-wrap items-center justify-end gap-2">
              <button
                type="submit"
                className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-400"
              >
                Ajouter
              </button>
            </div>
          </form>
        </PersistedPanel>
      </section>

      <section className="panel relative overflow-hidden p-4 md:p-6">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-indigo-500/10 to-transparent blur-3xl" />
        <div className="relative flex flex-col gap-2 text-sm text-slate-200">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-300/40 bg-cyan-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-50 shadow-inner shadow-cyan-900/30">
            Stats filtrées
          </div>
          <p className="text-2xl font-semibold text-white">
            {totalClicks} clics · {totalPurchases} achats
          </p>
          <p className="text-sm text-cyan-100">
            Taux de conversion global : {totalCtr.toFixed(1)}%
          </p>
          <p className="text-xs text-slate-400">
            {from || to ? (
              <>Plage appliquée : {from ?? "—"} → {to ?? "—"}</>
            ) : (
              "Aucune plage de dates, stats sur la période complète."
            )}
          </p>
          <p className="text-xs text-slate-400">
            Résultat : {totalCount} partenaire{totalCount > 1 ? "s" : ""} filtré{totalCount > 1 ? "s" : ""}.
          </p>
          <p className="text-xs text-slate-400">
            Les compteurs ci-dessous respectent les filtres (recherche, type, dates).
          </p>
          <div className="mt-3 grid gap-2 text-xs text-slate-200 md:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.12em] text-cyan-100">Top clics</p>
              <p className="font-semibold text-white">
                {topClicks && topClicks.clicks > 0 ? `${partnerName(topClicks.id)} (${topClicks.clicks})` : "—"}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.12em] text-cyan-100">Top achats</p>
              <p className="font-semibold text-white">
                {topPurchases && topPurchases.purchases > 0
                  ? `${partnerName(topPurchases.id)} (${topPurchases.purchases})`
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="panel space-y-4 p-6">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Partenaires existants</h2>
          <FilterPanel
            storageKey="filters:admin-partners-list"
            title="Filtres"
            className="group w-full"
            contentClassName="mt-3"
            userKey={userKey}
          >
            <form
              method="get"
              className="grid w-full gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-indigo-900/20 md:grid-cols-2 md:items-end"
            >
              <label className="text-sm text-slate-200 md:col-span-2">
                Recherche (nom, type, site, description)
                <input
                  type="text"
                  name="q"
                  defaultValue={q}
                  placeholder="Nom, type ou site"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
                />
              </label>
              <label className="text-sm text-slate-200">
                Type
                <input
                  type="text"
                  name="kind"
                  defaultValue={kindFilter}
                  placeholder="SERVICE ou REVENDEUR"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
                />
              </label>
              <label className="text-sm text-slate-200">
                Date min (événements)
                <input
                  type="date"
                  name="from"
                  defaultValue={from ?? ""}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
                />
              </label>
              <label className="text-sm text-slate-200">
                Date max (événements)
                <input
                  type="date"
                  name="to"
                  defaultValue={to ?? ""}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
                />
              </label>
              <div className="md:col-span-2 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="submit"
                  className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-400"
                >
                  Filtrer
                </button>
                <Link
                  href="/app/admin/partners"
                  className="rounded-full border border-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
                >
                  Réinitialiser
                </Link>
              </div>
            </form>
          </FilterPanel>
        </div>
        {partners.length === 0 && (
          <p className="text-slate-200">Aucun partenaire pour le moment.</p>
        )}
        <div className="divide-y divide-white/5">
          {partners.map((partner) => (
            <article
              key={partner.id}
              className="flex flex-col gap-4 py-4"
            >
              {(() => {
                const baseParams = new URLSearchParams(commonQuery);
                if (currentPage > 1) baseParams.set("page", currentPage.toString());
                const editParams = new URLSearchParams(baseParams);
                editParams.set("edit", partner.id);
                const editHref = `/app/admin/partners${editParams.toString() ? `?${editParams.toString()}` : ""}`;
                const cancelHref = `/app/admin/partners${baseParams.toString() ? `?${baseParams.toString()}` : ""}`;
                const isEditing = editId === partner.id;
                if (!isEditing) {
                  return (
                    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200 shadow-inner shadow-indigo-900/10">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-indigo-100">
                            {partner.kind || "PARTENAIRE"}
                          </span>
                          <Link
                            href={editHref}
                            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
                          >
                            ✏️ Éditer
                          </Link>
                          {partner.website && (
                            <Link
                              href={`/api/partners/redirect?partnerId=${partner.id}&url=${encodeURIComponent(partner.website)}&type=click`}
                              className="text-xs font-semibold text-cyan-200 underline underline-offset-2 transition hover:text-cyan-100"
                              target="_blank"
                              rel="noreferrer"
                            >
                              Ouvrir le site
                            </Link>
                          )}
                        </div>
                        <form action={deletePartnerAction}>
                          <input type="hidden" name="partnerId" value={partner.id} />
                          <button
                            type="submit"
                            className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-100 transition hover:border-red-400 hover:bg-red-500/20"
                          >
                            Supprimer
                          </button>
                        </form>
                      </div>
                      <div className="space-y-1">
                        <p className="text-base font-semibold text-white">{partner.name}</p>
                        {partner.description && (
                          <p className="text-sm text-slate-300">{partner.description}</p>
                        )}
                        {partner.website && (
                          <p className="text-xs text-slate-400 break-all">{partner.website}</p>
                        )}
                        {eventCounts.get(partner.id) ? (
                          <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">
                            {getPartnerStats(partner.id).clicks} clics · {getPartnerStats(partner.id).purchases} achats · {getPartnerStats(partner.id).ctr.toFixed(1)}% CTR
                          </p>
                        ) : null}
                        {supportsSponsored && "sponsoredLinks" in partner && partner.sponsoredLinks ? (
                          <div className="mt-1 space-y-1">
                            <p className="text-xs uppercase tracking-[0.12em] text-cyan-100">
                              Liens sponsorisés
                            </p>
                            <ul className="space-y-1">
                              {toSponsoredLinksArray(
                                (partner as unknown as { sponsoredLinks?: unknown }).sponsoredLinks
                              ).map(formatSponsoredLink).map((link, idx) => (
                                <li key={`${partner.id}-sponsored-${idx}`} className="text-xs text-slate-200">
                                  <Link
                                    href={`/api/partners/redirect?partnerId=${partner.id}&url=${encodeURIComponent(link.url)}&type=click`}
                                    className="text-cyan-200 underline underline-offset-2 transition hover:text-cyan-100"
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    {link.label}
                                  </Link>{" "}
                                  — {link.url}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                }
                return (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-cyan-400/40 bg-white/5 p-3 text-sm text-slate-200 shadow-inner shadow-indigo-900/10">
                      <Link
                        href={cancelHref}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
                      >
                        Annuler
                      </Link>
                      <form action={deletePartnerAction} className="m-0">
                        <input type="hidden" name="partnerId" value={partner.id} />
                        <button
                          type="submit"
                          className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100 transition hover:border-red-400 hover:bg-red-500/20"
                        >
                          Supprimer
                        </button>
                      </form>
                    </div>
                    <form
                      action={updatePartnerAction}
                      className="grid gap-3 rounded-2xl border border-cyan-400/40 bg-white/5 p-4 shadow-inner shadow-indigo-900/10 text-sm text-slate-200 md:grid-cols-2 md:gap-4"
                    >
                      <input type="hidden" name="partnerId" value={partner.id} />
                      <label className="grid gap-1">
                        Nom
                        <input
                          name="name"
                          defaultValue={partner.name}
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
                          required
                        />
                      </label>
                      <label className="grid gap-1">
                        Type
                        <input
                          name="kind"
                          defaultValue={partner.kind}
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
                          placeholder="SERVICE/REVENDEUR"
                        />
                      </label>
                      <label className="grid gap-1 md:col-span-2">
                        Site web (optionnel)
                        <input
                          name="website"
                          type="url"
                          defaultValue={partner.website ?? ""}
                          placeholder="https://..."
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
                        />
                      </label>
                      <label className="grid gap-1 md:col-span-2">
                        Description (optionnel)
                        <input
                          name="description"
                          defaultValue={partner.description ?? ""}
                          placeholder="Description"
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
                        />
                      </label>
                      {supportsSponsored ? (
                        <div className="md:col-span-2">
                          <SponsoredLinksField
                            name="sponsored"
                            initialLinks={
                              supportsSponsored && "sponsoredLinks" in partner
                                ? toSponsoredLinksArray((partner as unknown as { sponsoredLinks?: unknown }).sponsoredLinks)
                                : []
                            }
                          />
                        </div>
                      ) : (
                        <p className="md:col-span-2 text-xs text-amber-200">
                          Liens sponsorisés indisponibles (migration Prisma non appliquée).
                        </p>
                      )}
                      <div className="md:col-span-2 flex flex-wrap justify-end gap-2">
                        <button
                          type="submit"
                          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
                        >
                          Sauvegarder
                        </button>
                      </div>
                    </form>
                  </>
                );
              })()}
            </article>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-200">
          <span>
            Page {safePage} / {totalPages} · {totalCount} partenaires
          </span>
          <div className="flex items-center gap-2">
            <Link
              href={pageHref(Math.max(1, safePage - 1))}
              aria-disabled={safePage === 1}
              className={`rounded-full border border-white/10 px-3 py-2 ${
                safePage === 1
                  ? "cursor-not-allowed text-slate-500"
                  : "bg-white/5 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
              }`}
            >
              Précédent
            </Link>
            <Link
              href={pageHref(Math.min(totalPages, safePage + 1))}
              aria-disabled={safePage === totalPages}
              className={`rounded-full border border-white/10 px-3 py-2 ${
                safePage === totalPages
                  ? "cursor-not-allowed text-slate-500"
                  : "bg-white/5 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
              }`}
            >
              Suivant
            </Link>
            <div className="flex items-center gap-1">
              {pageRange.map((item, idx) =>
                item === "..." ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-slate-500">
                    …
                  </span>
                ) : (
                  <Link
                    key={item}
                    href={pageHref(item)}
                    className={`rounded-md px-2.5 py-1 text-sm ${
                      item === safePage
                        ? "border border-cyan-400/70 bg-cyan-500/20 text-white"
                        : "border border-white/10 bg-white/5 text-slate-200 transition hover:border-cyan-400/70 hover:bg-white/10"
                    }`}
                  >
                    {item}
                  </Link>
                )
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
