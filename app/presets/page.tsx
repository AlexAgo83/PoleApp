import { Prisma } from "@prisma/client";
import Link from "next/link";
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

export const dynamic = "force-dynamic";
const PAGE_SIZE = 9;

type SearchParams =
  | {
      page?: string;
      q?: string;
      discipline?: string;
      price?: string;
      flash?: string;
    }
  | Promise<{
      page?: string;
      q?: string;
      discipline?: string;
      price?: string;
      flash?: string;
    }>;

export default async function PresetsCatalogPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = (await Promise.resolve(searchParams)) ?? {};
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }
  if (!["STUDENT", "TEACHER", "SCHOOL_ADMIN"].includes(session.user.role)) {
    redirect(defaultHomeForRole(session.user.role));
  }

  const homeForRole = defaultHomeForRole(session.user.role);
  const isStudent = session.user.role === "STUDENT";
  const schoolId = session.user.schoolId || undefined;

  const q = params.q?.toString().trim() || "";
  const disciplineFilters =
    params.discipline
      ?.toString()
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean) ?? [];
  const priceFilter = params.price?.toString() || "";
  const rawPage = Number(params.page ?? "1");
  const flash = params.flash?.toString() || "";

  const where: Prisma.PresetWhereInput = {
    ...(schoolId ? { schoolId } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(disciplineFilters.length
      ? {
          OR: [
            { disciplineId: { in: disciplineFilters } },
            { discipline: { in: disciplineFilters, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  if (priceFilter === "premium") {
    where.premiumRequired = true;
  } else if (priceFilter === "credits") {
    where.priceCredits = { gt: 0 };
  } else if (priceFilter === "free") {
    where.premiumRequired = false;
    where.priceCredits = 0;
  }

  const totalCount = await prisma.preset.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, rawPage || 1), totalPages);
  const skip = (currentPage - 1) * PAGE_SIZE;

  const [presets, disciplineOptions, studentInfo, purchasedPresetIds, disciplineRows] = await Promise.all([
    prisma.preset.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      include: {
        positions: { include: { position: { select: { name: true } } } },
        createdBy: { select: { name: true, email: true } },
      },
    }),
    prisma.preset.findMany({
      where: { ...(schoolId ? { schoolId } : {}), disciplineId: { not: "" } },
      select: { disciplineId: true },
      distinct: ["disciplineId"],
      orderBy: { disciplineId: "asc" },
    }),
    isStudent
      ? prisma.user.findUnique({
          where: { id: session.user.id },
          select: { credits: true, isPremium: true },
        })
      : null,
    isStudent
      ? prisma.purchase
          .findMany({
            where: { userId: session.user.id, kind: "PRESET", status: "PAID" },
            select: { offerId: true },
          })
          .then((rows) => new Set(rows.map((p) => p.offerId)))
      : Promise.resolve(new Set<string>()),
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

  const activeFilters = [q && q.length > 0, disciplineFilters.length > 0, priceFilter].filter(Boolean).length;
  const hasCredits = studentInfo?.credits ?? 0;
  const hasPremium = studentInfo?.isPremium ?? false;
  const queryParams = new URLSearchParams();
  if (q) queryParams.set("q", q);
  if (disciplineFilters.length) queryParams.set("discipline", disciplineFilters.join(","));
  if (priceFilter) queryParams.set("price", priceFilter);
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
        title="Combos / presets"
        buttons={[
          {
            label: "Mon espace",
            href: homeForRole,
            icon: <img src="/house.svg" alt="" className="h-4 w-4" />,
          },
          { label: "Déconnexion", href: "/api/auth/signout" },
        ]}
        foxHref="/"
      />

      <section className="panel space-y-4 border-indigo-400/25 p-4 shadow-indigo-900/30 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-white">Combos</h2>
          <div className="flex flex-wrap justify-end gap-2 md:w-auto">
            <Link
              href="/positions"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-normal text-white transition hover:border-cyan-400/70 hover:bg-white/10"
            >
              <span className="whitespace-normal text-left leading-tight md:whitespace-nowrap">Positions</span>
            </Link>
            {(session.user.role === "TEACHER" || session.user.role === "SCHOOL_ADMIN") && (
              <Link
                href={session.user.role === "SCHOOL_ADMIN" ? "/admin/presets" : "/teacher/presets"}
                className="rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 px-3 py-2 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
              >
                <span className="whitespace-normal text-left leading-tight md:whitespace-nowrap">
                  Gestion
                </span>
              </Link>
            )}
          </div>
        </div>
        {isStudent ? null : null}
        {flash === "ok" && (
          <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-100 border border-emerald-400/40">
            Achat enregistré.
          </p>
        )}
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

        <p className="text-sm text-slate-300">
          Page {currentPage} / {totalPages} · {totalCount} presets
        </p>

        <FilterPanel
          storageKey="filters:presets-catalog"
          title="Filtres"
          activeCount={activeFilters}
          userKey={session.user.id ?? "anon"}
          className="space-y-3"
          contentClassName="mt-3"
        >
          <form
            key={`filters-${q || "all"}-${disciplineFilters.join("|") || "all"}-${priceFilter || "all"}`}
            method="get"
            className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-indigo-900/20 md:grid-cols-4 md:items-end"
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
            <div className="flex items-end justify-end">
              <button
                type="submit"
                className="rounded-full border border-cyan-300/60 bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-white hover:border-cyan-200"
              >
                Filtrer
              </button>
            </div>
          </form>
        </FilterPanel>

        {presets.length === 0 ? (
          <p className="text-slate-300">Aucun preset ne correspond aux filtres.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {presets.map((preset) => {
              const cost = preset.priceCredits ?? 0;
              const alreadyBought = purchasedPresetIds.has(preset.id);
              const premiumLocked = preset.premiumRequired && isStudent && !hasPremium;
              const insufficientCredits = isStudent && cost > 0 && hasCredits < cost;
              const disablePurchase = !isStudent || alreadyBought || premiumLocked || insufficientCredits;

              let cta = "Voir le détail";
              if (alreadyBought) cta = "Déjà acheté";
              else if (!isStudent) cta = "Visible (élèves)";
              else if (premiumLocked) cta = "Réservé premium";
              else if (cost > 0) cta = `Acheter (${cost} crédits)`;
              else cta = "Ajouter (gratuit)";

              return (
                <div key={preset.id} className="flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-gradient-to-br from-[#1d1b3a]/80 via-[#1b2747]/70 to-[#152437]/80 p-4 shadow-lg shadow-indigo-900/30">
                  <div className="space-y-3">
                    {preset.imageUrl ? (
                      <div className="overflow-hidden rounded-xl border border-white/10 bg-black/30 aspect-[4/3]">
                        <SafeImage src={preset.imageUrl} alt={preset.title} className="h-full w-full object-cover" />
                      </div>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-white">
                      {preset.discipline ? (
                        <span className="rounded-full border border-indigo-300/60 bg-indigo-500/15 px-2 py-0.5">{preset.discipline}</span>
                      ) : null}
                      {preset.premiumRequired ? (
                        <span className="rounded-full border border-amber-300/60 bg-amber-500/15 px-2 py-0.5">Premium</span>
                      ) : cost > 0 ? (
                        <span className="rounded-full border border-cyan-300/60 bg-cyan-500/15 px-2 py-0.5">{cost} crédits</span>
                      ) : (
                        <span className="rounded-full border border-emerald-300/60 bg-emerald-500/15 px-2 py-0.5">Gratuit</span>
                      )}
                      {preset.createdBy ? (
                        <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-xs text-slate-200">
                          Créé par {preset.createdBy.name ?? preset.createdBy.email}
                        </span>
                      ) : null}
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-semibold text-white">{preset.title}</h3>
                      <p className="text-sm text-slate-200">{preset.description || "Pas de description"}</p>
                    </div>
                    {preset.positions.length > 0 ? (
                      <p className="text-xs text-slate-300">
                        Positions : {preset.positions.map((pp) => pp.position.name).join(", ")}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400">Aucune position liée.</p>
                    )}
                    <p className="text-xs text-slate-400">
                      Usage : {preset.usageCount} {preset.usageCount > 1 ? "fois" : "fois"}{" "}
                      {preset.lastUsedAt ? `(dernier : ${new Date(preset.lastUsedAt).toLocaleDateString("fr-FR")})` : "(jamais)"}
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-xs text-slate-300">
                      {premiumLocked
                        ? "Nécessite Premium"
                        : insufficientCredits
                          ? `Crédits manquants (${hasCredits}/${cost})`
                          : ""}
                    </div>
                    <form action={buyPresetAction} className="flex items-center gap-2">
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
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-slate-300">
          <span>
            Page {currentPage} / {totalPages} · {totalCount} presets
          </span>
          <div className="flex items-center gap-2">
            {currentPage > 1 && (
              <Link
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:border-cyan-300/60 hover:bg-cyan-500/20"
                href={`?${new URLSearchParams({
                  ...Object.fromEntries(queryParams.entries()),
                  page: String(Math.max(1, currentPage - 1)),
                }).toString()}`}
              >
                Précédent
              </Link>
            )}
            {currentPage < totalPages && (
              <Link
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:border-cyan-300/60 hover:bg-cyan-500/20"
                href={`?${new URLSearchParams({
                  ...Object.fromEntries(queryParams.entries()),
                  page: String(Math.min(totalPages, currentPage + 1)),
                }).toString()}`}
              >
                Suivant
              </Link>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
