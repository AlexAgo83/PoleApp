import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { FilterPanel } from "@/components/FilterPanel";
import { PremiumUpsellButton } from "@/components/PremiumUpsellButton";
import { SafeImage } from "@/components/SafeImage";
import { BuyCreditsButton } from "@/app/student/BuyCreditsButton";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { defaultHomeForRole } from "@/lib/rbac";
import { buyPresetAction } from "@/app/student/actions";
import { FoxPageHeader } from "@/components/FoxPageHeader";
import { buildPresetFilters } from "./filterUtils";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 9;

type SearchParams = Promise<{
  page?: string;
  q?: string;
  discipline?: string;
  price?: string;
  flash?: string;
  owner?: string;
  purchase?: string;
  media?: string;
}>;

export default async function PresetsCatalogPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = (await Promise.resolve(searchParams ?? {})) as {
    page?: string;
    q?: string;
    discipline?: string;
    price?: string;
    flash?: string;
    owner?: string;
    purchase?: string;
    media?: string;
  };
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }
  if (!["STUDENT", "TEACHER", "SCHOOL_ADMIN"].includes(session.user.role)) {
    redirect(defaultHomeForRole(session.user.role));
  }

  const homeForRole = defaultHomeForRole(session.user.role);
  const isStudent = session.user.role === "STUDENT";
  const isTeacherOrAdmin = session.user.role === "TEACHER" || session.user.role === "SCHOOL_ADMIN";
  const schoolId = session.user.schoolId || undefined;

  const flash = params.flash?.toString() || "";

  const [studentInfo, purchasedPresetRows]: [
    { credits: number; isPremium: boolean } | null,
    { offerId: string }[]
  ] = isStudent
    ? await Promise.all([
        prisma.user.findUnique({
          where: { id: session.user.id },
          select: { credits: true, isPremium: true },
        }),
        prisma.purchase.findMany({
          where: { userId: session.user.id, kind: "PRESET", status: "PAID" },
          select: { offerId: true },
        }),
      ])
    : [null, []];
  const purchasedPresetIds = isStudent ? new Set(purchasedPresetRows.map((p) => p.offerId)) : new Set<string>();

  const { where, q, disciplineFilters, priceFilter, ownerFilter, purchaseFilter, mediaFilter, rawPage, activeFilters, queryParams } =
    buildPresetFilters({
      params,
      schoolId,
      isStudent,
      isTeacherOrAdmin,
      userId: session.user.id,
      purchasedPresetIds,
    });

  const totalCount = await prisma.preset.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, rawPage || 1), totalPages);
  const skip = (currentPage - 1) * PAGE_SIZE;

  const [presets, disciplineOptions, disciplineRows] = await Promise.all([
    prisma.preset.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        description: true,
        discipline: true,
        premiumRequired: true,
        priceCredits: true,
        imagePublicId: true,
        createdByUserId: true,
        positions: { select: { position: { select: { name: true } } } },
        createdBy: { select: { name: true, email: true } },
      },
    }),
    prisma.preset.findMany({
      where: { ...(schoolId ? { schoolId } : {}), disciplineId: { not: "" } },
      select: { disciplineId: true },
      distinct: ["disciplineId"],
      orderBy: { disciplineId: "asc" },
    }),
    prisma.discipline.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const [packOffers, subscriptionOffers] = isStudent
    ? await Promise.all([
        prisma.creditPackOffer.findMany({ where: { isActive: true, isOpen: true }, orderBy: { sortOrder: "asc" } }),
        prisma.subscriptionOffer.findMany({ where: { isActive: true, isOpen: true }, orderBy: { sortOrder: "asc" } }),
      ])
    : [[], []];

  const hasCredits = studentInfo?.credits ?? 0;
  const hasPremium = studentInfo?.isPremium ?? false;
  const disciplineNameById = new Map((disciplineRows ?? []).map((d) => [d.id, d.name]));
  const disciplineOptionList = Array.from(
    new Set(disciplineOptions.map((d) => d.disciplineId).filter(Boolean))
  ).map((id) => ({ id: id!, name: disciplineNameById.get(id!) ?? "Discipline" }));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-3 px-2 pt-0 pb-2 md:gap-6 md:px-8 md:pt-0 md:pb-4">
      <FoxPageHeader
        eyebrow={
          session.user.role === "SCHOOL_ADMIN"
            ? "Espace admin"
            : session.user.role === "TEACHER"
              ? "Espace prof"
              : "Espace élève"
        }
        title="Presets & combos"
        buttons={[
          {
            label: "Mon espace",
            href: homeForRole,
            icon: <Image src="/house.svg" alt="" className="h-4 w-4" width={16} height={16} priority />,
          },
          { label: "Déconnexion", href: "/api/auth/signout" },
        ]}
        foxHref="/"
      />

      <section className="panel panel-body lg-gap border-indigo-400/25 p-4 shadow-indigo-900/30 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-2xl font-semibold text-white">Presets & combos</h2>
          <div className="flex flex-wrap items-center justify-end gap-2 md:w-auto">
            <Link
              href="/positions"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-normal text-white transition hover:border-cyan-400/70 hover:bg-white/10"
            >
              <span className="whitespace-normal text-left leading-tight md:whitespace-nowrap">Positions</span>
            </Link>
            {(session.user.role === "TEACHER" || session.user.role === "SCHOOL_ADMIN") && (
              <Link
                href="/presets/new"
                className="rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 px-3 py-2 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
              >
                <span className="whitespace-normal text-left leading-tight md:whitespace-nowrap">
                  Créer
                </span>
              </Link>
            )}
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-200">
              <div className="flex items-center gap-1">
                <Link
                  aria-label="Page précédente"
                  className={`rounded-full border px-2 py-1 text-xs font-semibold transition ${
                    currentPage > 1
                      ? "border-white/10 bg-white/5 text-white hover:border-cyan-300/60 hover:bg-cyan-500/20"
                      : "cursor-not-allowed border-white/5 bg-white/5 text-slate-500"
                  }`}
                  href={
                    currentPage > 1
                      ? `?${(() => {
                          const params = new URLSearchParams(Object.fromEntries(queryParams.entries()));
                          params.set("page", String(Math.max(1, currentPage - 1)));
                          return params.toString();
                        })()}`
                      : "#"
                  }
                >
                  ←
                </Link>
                <Link
                  aria-label="Page suivante"
                  className={`rounded-full border px-2 py-1 text-xs font-semibold transition ${
                    currentPage < totalPages
                      ? "border-white/10 bg-white/5 text-white hover:border-cyan-300/60 hover:bg-cyan-500/20"
                      : "cursor-not-allowed border-white/5 bg-white/5 text-slate-500"
                  }`}
                  href={
                    currentPage < totalPages
                      ? `?${(() => {
                          const params = new URLSearchParams(Object.fromEntries(queryParams.entries()));
                          params.set("page", String(Math.min(totalPages, currentPage + 1)));
                          return params.toString();
                        })()}`
                      : "#"
                  }
                >
                  →
                </Link>
              </div>
            </div>
          </div>
        </div>
        {isStudent ? null : null}
        {flash === "already" && (
          <p className="rounded-lg bg-cyan-500/10 px-3 py-2 text-sm font-semibold text-cyan-100 border border-cyan-400/40">
            Preset déjà acheté.
          </p>
        )}

        {isStudent && (
          <div className="hidden" aria-hidden="true">
            <BuyCreditsButton currentCredits={hasCredits} showUpgrade packs={packOffers} subscriptions={subscriptionOffers} />
          </div>
        )}

        <details className="group text-sm text-slate-200">
          <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-white">
            <span className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-cyan-100">
              Légende
              <span className="text-[10px] text-cyan-50 group-open:hidden">▼</span>
              <span className="hidden text-[10px] text-cyan-50 group-open:inline">▲</span>
            </span>
          </summary>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-indigo-300/70 bg-indigo-600/40 px-3 py-1 text-[12px] font-semibold text-white">
              ● Discipline du preset
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/70 bg-amber-600/40 px-3 py-1 text-[12px] font-semibold text-amber-50">
              ● Premium requis
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-cyan-300/70 bg-cyan-600/40 px-3 py-1 text-[12px] font-semibold text-cyan-50">
              ● Payant en crédits
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/70 bg-emerald-600/40 px-3 py-1 text-[12px] font-semibold text-emerald-50">
              ● Gratuit
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-black/45 px-3 py-1 text-[12px] font-semibold text-slate-100">
              ● Auteur du preset
            </span>
          </div>
        </details>

        <FilterPanel
          storageKey="filters:presets-catalog"
          title="Filtres"
          activeCount={activeFilters}
          userKey={session.user.id ?? "anon"}
          className="space-y-3"
          contentClassName="mt-3"
        >
          <form
            key={`filters-${q || "all"}-${disciplineFilters.join("|") || "all"}-${priceFilter || "all"}-${ownerFilter || "all"}-${purchaseFilter || "all"}-${mediaFilter || "all"}`}
            method="get"
            className="panel-grid lg-gap rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-indigo-900/20 md:grid-cols-5 md:items-end"
          >
            <label className="text-sm text-slate-200">
              Recherche
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Titre ou description"
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              />
            </label>
            <label className="text-sm text-slate-200">
              Discipline
              <select
                name="discipline"
                defaultValue={disciplineFilters[0] ?? ""}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              >
                <option value="">Toutes disciplines</option>
                {disciplineOptionList.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-200">
              Tarification
              <select
                name="price"
                defaultValue={priceFilter}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              >
                <option value="">Tous</option>
                <option value="premium">Premium requis</option>
                <option value="credits">Payant en crédits</option>
                <option value="free">Gratuit</option>
              </select>
            </label>
            <label className="text-sm text-slate-200">
              Mes combos
              <select
                name="owner"
                defaultValue={ownerFilter}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              >
                <option value="">Tous</option>
                <option value="me">Mes combos</option>
              </select>
            </label>
            {isStudent ? (
              <label className="text-sm text-slate-200">
                Achats
                <select
                  name="purchase"
                  defaultValue={purchaseFilter}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
                >
                  <option value="">Tous</option>
                  <option value="bought">Déjà achetés</option>
                  <option value="notBought">Non achetés</option>
                </select>
              </label>
            ) : null}
            <label className="text-sm text-slate-200">
              Médias
              <select
                name="media"
                defaultValue={mediaFilter}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              >
                <option value="">Tous</option>
                <option value="image">Avec image</option>
                <option value="video">Avec vidéo</option>
              </select>
            </label>
            <div className="flex items-end justify-end">
              <button
                type="submit"
                className="rounded-full border border-cyan-300/60 bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-white hover:border-cyan-200"
              >
                Filtrer
              </button>
              <Link
                href="/presets"
                className="ml-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:border-cyan-300/60 hover:bg-white/10"
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
            {q && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-slate-200">
                Recherche : “{q}”
              </span>
            )}
            {disciplineFilters.map((d) => (
              <span key={d} className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-slate-200">
                Discipline : “{disciplineNameById.get(d) ?? d}”
              </span>
            ))}
            {priceFilter && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-slate-200">
                Tarification : {priceFilter === "premium" ? "Premium" : priceFilter === "credits" ? "Crédits" : "Gratuit"}
              </span>
            )}
            {ownerFilter === "me" && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-slate-200">Mes combos</span>
            )}
            {purchaseFilter === "bought" && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-slate-200">Achetés</span>
            )}
            {purchaseFilter === "notBought" && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-slate-200">Non achetés</span>
            )}
            {mediaFilter === "image" && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-slate-200">Avec image</span>
            )}
            {mediaFilter === "video" && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-slate-200">Avec vidéo</span>
            )}
          </div>
        )}

        {presets.length === 0 ? (
          <p className="text-slate-300">Aucun preset ne correspond aux filtres.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {presets.map((preset) => {
              const cost = preset.priceCredits ?? 0;
              const alreadyBought = purchasedPresetIds.has(preset.id);
              const premiumLocked = preset.premiumRequired && isStudent && !hasPremium;
              const insufficientCredits = isStudent && cost > 0 && hasCredits < cost;
              const disablePurchase = alreadyBought || premiumLocked || insufficientCredits;
              const detailHref = `/presets/${preset.id}?from=${encodeURIComponent(`/presets?page=${currentPage}`)}`;
              const canEditPreset =
                isTeacherOrAdmin &&
                (session.user.role === "SCHOOL_ADMIN" || preset.createdByUserId === session.user.id);

              let cta = "Voir le détail";
              if (alreadyBought) cta = "Déjà acheté";
              else if (premiumLocked) cta = "Réservé premium";
              else if (cost > 0) cta = `Acheter (${cost} crédits)`;
              else if (isStudent) cta = "Ajouter (gratuit)";

              return (
                <div
                  key={preset.id}
                  className="flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-gradient-to-br from-[#1d1b3a]/80 via-[#1b2747]/70 to-[#152437]/80 p-4 shadow-lg shadow-indigo-900/30 transition hover:border-cyan-400/70 hover:shadow-cyan-900/30"
                >
                  <Link href={detailHref ?? "#"} className="space-y-3 block">
                    <div className="-mx-4 -mt-4 overflow-hidden rounded-t-2xl border-b border-white/10">
                      <div className="relative">
                        {preset.imagePublicId ? (
                          <SafeImage
                            publicId={preset.imagePublicId}
                            alt={preset.title}
                            width={480}
                            height={360}
                            quality={65}
                            className="aspect-[4/3] w-full object-cover"
                          />
                        ) : (
                          <div className="aspect-[4/3] w-full bg-gradient-to-br from-indigo-900/60 via-slate-800/60 to-cyan-900/50" />
                        )}
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-black/25 via-transparent to-black/25" />
                        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex flex-wrap gap-1.5">
                              {preset.discipline ? (
                                <span className="rounded-full border border-indigo-300/70 bg-indigo-600/40 px-2 py-0.5 text-[11px] font-semibold text-white shadow-lg shadow-black/30">
                                  {preset.discipline}
                                </span>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap justify-end gap-1.5">
                              {preset.premiumRequired ? (
                                <span className="rounded-full border border-amber-300/70 bg-amber-600/40 px-2 py-0.5 text-[11px] font-semibold text-amber-50 shadow-lg shadow-black/30">
                                  Premium
                                </span>
                              ) : cost > 0 ? (
                                <span className="rounded-full border border-cyan-300/70 bg-cyan-600/40 px-2 py-0.5 text-[11px] font-semibold text-cyan-50 shadow-lg shadow-black/30">
                                  {cost} crédits
                                </span>
                              ) : (
                                <span className="rounded-full border border-emerald-300/70 bg-emerald-600/40 px-2 py-0.5 text-[11px] font-semibold text-emerald-50 shadow-lg shadow-black/30">
                                  Gratuit
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-end">
                            {preset.createdBy ? (
                              <span className="rounded-full border border-white/30 bg-black/45 px-2 py-0.5 text-[11px] font-semibold text-slate-100 shadow-lg shadow-black/30">
                                Créé par {preset.createdBy.name ?? preset.createdBy.email}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-semibold text-white">{preset.title}</h3>
                      <p className="text-sm text-slate-200 line-clamp-2">{preset.description || "Pas de description"}</p>
                    </div>
                    {preset.positions.length > 0 ? (
                      <p className="text-xs text-slate-300">
                        Positions : {preset.positions.map((pp) => pp.position.name).join(", ")}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400">Aucune position liée.</p>
                    )}
                  </Link>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs text-slate-300" />
                    {isStudent ? (
                      <form action={buyPresetAction} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="presetId" value={preset.id} />
                        <button
                          type="submit"
                          disabled={disablePurchase || (premiumLocked && isStudent)}
                          className={`rounded-full px-3 py-1.5 text-sm font-semibold text-white transition ${
                            disablePurchase || (premiumLocked && isStudent)
                              ? "cursor-not-allowed border border-white/10 bg-white/5 text-slate-300"
                              : "border border-cyan-300/70 bg-cyan-500/20 hover:border-cyan-200 hover:bg-cyan-500/30"
                          }`}
                        >
                          {cta}
                        </button>
                        {premiumLocked && isStudent ? (
                          <PremiumUpsellButton className="rounded-full border border-amber-300/70 bg-amber-500/20 px-3 py-1.5 text-sm font-semibold text-amber-50 transition hover:border-amber-200 hover:bg-amber-500/30">
                            Passer premium
                          </PremiumUpsellButton>
                        ) : null}
                      </form>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={detailHref}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white transition hover:border-cyan-300/60 hover:bg-white/10"
                        >
                          Voir
                        </Link>
                        {canEditPreset ? (
                          <Link
                            href={`/presets/${preset.id}/edit`}
                            className="rounded-full border border-cyan-400/60 bg-cyan-500/15 px-3 py-1.5 text-sm font-semibold text-white transition hover:border-cyan-200 hover:bg-cyan-500/25"
                          >
                            Éditer
                          </Link>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between text-sm text-slate-300">
          <span>
            Page {currentPage} / {totalPages} · {totalCount} presets
          </span>
        </div>
      </section>
    </main>
  );
}
