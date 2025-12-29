import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { createStudioAction, deleteStudioAction, updateStudioAction } from "./actions";
import { authOptions } from "@/lib/auth";
import { FilterPanel } from "@/components/FilterPanel";
import { PersistedPanel } from "@/components/PersistedPanel";
import { prisma } from "@/lib/prisma";
import { SafeImage } from "@/components/SafeImage";
import { COURSE_PLACEHOLDER } from "@/lib/placeholders";

export const dynamic = "force-dynamic";

type PageProps =
  | { searchParams?: { page?: string | string[]; q?: string | string[]; edit?: string | string[]; flash?: string | string[] } }
  | {
      searchParams?: Promise<{
        page?: string | string[];
        q?: string | string[];
        edit?: string | string[];
        flash?: string | string[];
      }>;
    };

function paramValue(value?: string | string[]) {
  if (Array.isArray(value)) return value[value.length - 1];
  return value;
}

export default async function AdminStudiosPage({ searchParams }: PageProps) {
  const resolvedParams = await Promise.resolve(searchParams);
  const pageParam = paramValue(resolvedParams?.page);
  const q = (paramValue(resolvedParams?.q) ?? "").toString().trim();
  const flash = paramValue(resolvedParams?.flash);
  const rawPage = Number(pageParam ?? "1");
  const editId = paramValue(resolvedParams?.edit);

  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SCHOOL_ADMIN") {
    redirect("/access-denied");
  }
  let schoolPhoto: string | null = null;
  try {
    const rows = await prisma.$queryRawUnsafe<{ photoUrl: string | null }[]>(
      `SELECT "photoUrl" FROM "School" WHERE "id" = '${session.user.schoolId}' LIMIT 1`
    );
    schoolPhoto = rows?.[0]?.photoUrl ?? null;
  } catch {
    // Column may not exist; ignore.
  }
  const userKey = session.user.id ?? "anon";
  if (!session.user.schoolId) {
    return (
      <main className="flex min-h-screen w-full flex-col gap-4">
        <section className="panel p-4 md:p-6">
          <h1 className="text-3xl font-semibold text-white">Studios</h1>
          <p className="text-slate-300">Aucune école associée à ce compte.</p>
        </section>
      </main>
    );
  }

  let totalCount = 0;
  let totalPages = 1;
  let currentPage = 1;
  let studios: Awaited<ReturnType<typeof prisma.studio.findMany>> = [];
  try {
    const whereClause = {
      schoolId: session.user.schoolId,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { address: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    totalCount = await prisma.studio.count({ where: { schoolId: session.user.schoolId } });
    totalCount = await prisma.studio.count({ where: whereClause });
    totalPages = Math.max(1, Math.ceil(totalCount / 10));
    currentPage = Math.min(Math.max(1, rawPage || 1), totalPages);
    const skip = (currentPage - 1) * 10;
    studios = await prisma.studio.findMany({
      where: whereClause,
      orderBy: { name: "asc" },
      skip,
      take: 10,
    });
  } catch {
    return (
      <main className="flex min-h-screen w-full flex-col gap-4">
        <section className="panel p-4 md:p-6">
          <h1 className="text-3xl font-semibold text-white">Studios</h1>
          <p className="text-sm text-amber-200">
            Modèle Studio indisponible. Lance `npx prisma generate` et la migration pour ajouter la table.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen w-full flex-col gap-4">
      {flash && (
        <div className="fixed bottom-4 right-4 z-30 space-y-2">
          {flash === "created" && (
            <div className="rounded-xl border border-emerald-300/60 bg-emerald-600/85 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/40">
              Studio créé.
            </div>
          )}
          {flash === "updated" && (
            <div className="rounded-xl border border-cyan-300/60 bg-cyan-600/85 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-900/40">
              Studio mis à jour.
            </div>
          )}
          {flash === "deleted" && (
            <div className="rounded-xl border border-red-400/60 bg-red-600/85 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-red-900/40">
              Studio supprimé.
            </div>
          )}
        </div>
      )}
      <header
        className="panel relative overflow-hidden p-4 md:p-6"
        style={{
          backgroundImage: schoolPhoto ? `url(${schoolPhoto})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-slate-900/65 backdrop-blur-[1px]" aria-hidden />
        <div className="relative z-10 space-y-3">
          <p className="text-xs uppercase tracking-[0.14em] text-cyan-100">Admin</p>
          <h1 className="text-3xl font-semibold text-white">Studios</h1>
          <p className="text-sm text-slate-100/90">
            Gère les studios de l’école (nom, adresse) et associe-les aux cours.
          </p>
          <div className="mt-2 flex flex-wrap justify-end gap-3 text-sm">
            <Link
              href="/app/admin"
              className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-white transition hover:border-cyan-200/70 hover:bg-white/15"
            >
              ← Retour dashboard
            </Link>
          </div>
        </div>
        {!schoolPhoto && (
          <div className="relative z-10 mt-3">
            <SafeImage
              src={schoolPhoto ?? ""}
              alt="Photo de l’école"
              width={1200}
              height={300}
              className="h-48 w-full rounded-xl border border-white/10 object-cover shadow"
              fallbackSrc={COURSE_PLACEHOLDER}
            />
          </div>
        )}
      </header>

      <section className="panel p-4 md:p-6">
        <PersistedPanel
          storageKey="panel:admin-studios-create"
          title="Ajouter un studio"
          className="group"
          contentClassName="mt-4"
          userKey={userKey}
        >
          <form action={createStudioAction} className="grid gap-3 md:grid-cols-2">
            <label className="text-sm text-slate-200">
              Nom
              <input
                name="name"
                required
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
              />
            </label>
            <label className="text-sm text-slate-200">
              Adresse (optionnel)
              <input
                name="address"
                list="studio-address-suggestions"
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
              />
              <p className="mt-1 text-xs text-slate-400">
                Astuce : saisissez l’adresse puis ouvrez Google Maps pour vérifier l’emplacement (autocomplete mock).
              </p>
              <datalist id="studio-address-suggestions">
                <option value="10 Rue de la Paix, Paris" />
                <option value="25 Avenue des Arts, Lyon" />
                <option value="3 Rue des Lilas, Marseille" />
              </datalist>
            </label>
            <label className="text-sm text-slate-200">
              Photo (URL)
              <input
                name="photoUrl"
                type="url"
                placeholder="https://..."
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
              />
            </label>
            <div className="md:col-span-2 flex justify-end">
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

      <section className="panel space-y-4 p-4 md:p-6">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Studios existants</h2>
          <FilterPanel
            storageKey="filters:admin-studios-list"
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
                Recherche (nom ou adresse)
                <input
                  type="text"
                  name="q"
                  defaultValue={q}
                  placeholder="Nom ou adresse"
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
                  href="/app/admin/studios"
                  className="rounded-full border border-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
                >
                  Réinitialiser
                </Link>
              </div>
            </form>
          </FilterPanel>
        </div>
        {studios.length === 0 && (
          <p className="text-slate-200">Aucun studio pour le moment.</p>
        )}
        <div className="divide-y divide-white/5">
          {studios.map((studio) => (
            <article key={studio.id} className="flex flex-col gap-4 py-4">
              {(() => {
                const baseParams = new URLSearchParams();
                if (q) baseParams.set("q", q);
                if (currentPage > 1) baseParams.set("page", currentPage.toString());
                const editParams = new URLSearchParams(baseParams);
                editParams.set("edit", studio.id);
                const cancelHref = `/app/admin/studios${baseParams.toString() ? `?${baseParams.toString()}` : ""}`;
                const editHref = `/app/admin/studios${editParams.toString() ? `?${editParams.toString()}` : ""}`;
                const isEditing = editId === studio.id;
                if (!isEditing) {
                  return (
                    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200 shadow-inner shadow-indigo-900/10">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-indigo-100">
                            Studio
                          </span>
                          <Link
                            href={editHref}
                            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
                          >
                            ✏️ Éditer
                          </Link>
                          <Link
                            href={`/app/school/${studio.id}?view=agenda&range=month`}
                            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
                          >
                            Voir la fiche
                          </Link>
                        </div>
                        <form action={deleteStudioAction}>
                          <input type="hidden" name="studioId" value={studio.id} />
                          <button
                            type="submit"
                            className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100 transition hover:border-red-400 hover:bg-red-500/20"
                          >
                            Supprimer
                          </button>
                        </form>
                      </div>
                      <div className="space-y-2">
                        <p className="text-base font-semibold text-white">{studio.name}</p>
                        {studio.address && (
                          <p className="text-sm text-cyan-100">
                            Adresse : {studio.address}{" "}
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(studio.address)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-semibold text-cyan-200 underline underline-offset-2 transition hover:text-cyan-100"
                            >
                              Ouvrir dans Google Maps
                            </a>
                          </p>
                        )}
                        {studio.photoUrl ? (
                          <p className="text-xs text-slate-300">Photo disponible</p>
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
                      <form action={deleteStudioAction} className="m-0">
                        <input type="hidden" name="studioId" value={studio.id} />
                        <button
                          type="submit"
                          className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100 transition hover:border-red-400 hover:bg-red-500/20"
                        >
                          Supprimer
                        </button>
                      </form>
                    </div>
                    <form
                      action={updateStudioAction}
                      className="grid gap-3 rounded-2xl border border-cyan-400/40 bg-white/5 p-4 shadow-inner shadow-indigo-900/10 text-sm text-slate-200 md:grid-cols-2 md:gap-4"
                    >
                      <input type="hidden" name="studioId" value={studio.id} />
                      <label className="grid gap-1">
                        Nom
                        <input
                          name="name"
                          defaultValue={studio.name}
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
                          required
                        />
                      </label>
                      <label className="grid gap-1">
                        Adresse (optionnel)
                        <input
                          name="address"
                          defaultValue={studio.address ?? ""}
                          placeholder="Adresse"
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
                        />
                      </label>
                      <label className="grid gap-1">
                        Photo (URL)
                        <input
                          name="photoUrl"
                          defaultValue={studio.photoUrl ?? ""}
                          placeholder="https://..."
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
                          type="url"
                        />
                      </label>
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
        {totalCount > 0 && (
          <div className="mt-4 flex items-center justify-between text-sm text-slate-200">
            <Link
              href={`/app/admin/studios?page=${Math.max(1, currentPage - 1)}`}
              className={`rounded-full px-3 py-2 font-semibold ${
                currentPage === 1
                  ? "cursor-not-allowed border border-white/10 text-slate-500"
                  : "border border-white/10 text-white hover:border-cyan-400/70 hover:bg-white/5"
              }`}
              aria-disabled={currentPage === 1}
            >
              Précédent
            </Link>
            <span>
              Page {currentPage} / {totalPages}
            </span>
            <Link
              href={`/app/admin/studios?page=${Math.min(totalPages, currentPage + 1)}`}
              className={`rounded-full px-3 py-2 font-semibold ${
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
