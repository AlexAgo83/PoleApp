import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { assignSchoolAdminAction, createSchoolAction, toggleArchiveSchoolAction } from "../actions";
import { PersistedPanel } from "@/components/PersistedPanel";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function SuperAdminSchoolsPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/access-denied");
  }

  const resolvedParams = (await (searchParams ?? Promise.resolve({}))) as Record<
    string,
    string | string[] | undefined
  >;
  const getValue = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value);
  const getPage = (key: string) => {
    const raw = getValue(resolvedParams[key]);
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  };

  const schools = await prisma.school.findMany({
    orderBy: { name: "asc" },
    include: {
      users: {
        where: { role: "SCHOOL_ADMIN" },
        select: { id: true, name: true, email: true },
      },
    },
  });

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

  const schoolsPerPage = 6;
  const schoolsTotalPages = Math.max(1, Math.ceil(schools.length / schoolsPerPage));
  const schoolsPage = Math.min(Math.max(getPage("schoolsPage"), 1), schoolsTotalPages);
  const paginatedSchools = schools.slice(
    (schoolsPage - 1) * schoolsPerPage,
    schoolsPage * schoolsPerPage,
  );

  return (
    <main className="grid gap-4 md:gap-6">
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
          {paginatedSchools.length === 0 && (
            <p className="md:col-span-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
              Aucune école trouvée.
            </p>
          )}
          {paginatedSchools.map((school) => (
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
                  <input type="hidden" name="redirectTo" value="/super-admin/schools" />
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
        {schoolsTotalPages > 1 && renderPager(schoolsPage, schoolsTotalPages, "schoolsPage")}

        <div className="mt-3 border-t border-white/10 pt-3">
          <PersistedPanel
            storageKey="superadmin:create-school"
            title="Créer une école"
            defaultOpen={false}
            className="panel p-4 md:p-5 space-y-4"
            contentClassName="space-y-4"
          >
            <div>
              <p className="text-sm text-slate-300">Ajoute une nouvelle école avec son site web (optionnel).</p>
            </div>
            <form action={createSchoolAction} className="grid gap-3 md:grid-cols-[2fr_2fr_1fr]">
              <input type="hidden" name="redirectTo" value="/super-admin/schools" />
              <label className="space-y-1 block">
                <span className="text-xs text-slate-300">Nom</span>
                <input
                  name="name"
                  required
                  minLength={2}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-white"
                  placeholder="Nom de l'école"
                />
              </label>
              <label className="space-y-1 block">
                <span className="text-xs text-slate-300">Site web (optionnel)</span>
                <input
                  name="website"
                  type="url"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-white"
                  placeholder="https://…"
                />
              </label>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-cyan-400/60 bg-cyan-500/20 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-300/70 hover:bg-cyan-500/30"
                >
                  Créer
                </button>
              </div>
            </form>
          </PersistedPanel>
        </div>
      </section>

      <section className="panel space-y-4 border-indigo-300/20 p-5 shadow-indigo-900/30">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-indigo-200">Écoles</p>
          <h3 className="text-lg font-semibold text-white">Assigner un admin à une école</h3>
          <p className="text-sm text-slate-300">Bascule l&apos;utilisateur ciblé en SCHOOL_ADMIN pour l&apos;école choisie.</p>
        </div>
        <form action={assignSchoolAdminAction} className="grid gap-3 md:grid-cols-[2fr_2fr_1fr]">
          <input type="hidden" name="redirectTo" value="/super-admin/schools" />
          <label className="space-y-1 block">
            <span className="text-xs text-slate-300">École</span>
            <select
              name="schoolId"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-white"
              defaultValue={schools[0]?.id ?? ""}
              disabled={schools.length === 0}
            >
              {schools.length === 0 ? (
                <option value="">Aucune école</option>
              ) : (
                schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))
              )}
            </select>
          </label>
          <label className="space-y-1 block">
            <span className="text-xs text-slate-300">Email de l&apos;utilisateur</span>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-white"
              placeholder="admin@ecole.fr"
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-cyan-400/60 bg-cyan-500/20 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-300/70 hover:bg-cyan-500/30"
            >
              Assigner
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
