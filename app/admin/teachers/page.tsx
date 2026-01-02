import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { SafeImage } from "@/components/SafeImage";
import { authOptions } from "@/lib/auth";
import { FilterPanel } from "@/components/FilterPanel";
import { AVATAR_PLACEHOLDER } from "@/lib/placeholders";
import { prisma } from "@/lib/prisma";
import { resolveAvatarUrl } from "@/lib/avatar";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 10;
const TEACHER_AVATAR_PLACEHOLDER = AVATAR_PLACEHOLDER;

type SearchParams =
  | {
      page?: string;
      q?: string;
      premium?: string;
    }
  | Promise<{
      page?: string;
      q?: string;
      premium?: string;
    }>;

export default async function AdminTeachersPage({ searchParams }: { searchParams?: SearchParams }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SCHOOL_ADMIN") {
    redirect("/access-denied");
  }
  const userKey = session.user.id ?? "anon";
  if (!session.user.schoolId) {
    return (
      <main className="flex min-h-screen w-full flex-col gap-4">
        <section className="panel p-4 md:p-6">
          <h1 className="text-3xl font-semibold text-white">Professeurs</h1>
          <p className="text-slate-300">Aucune école associée à ce compte.</p>
        </section>
      </main>
    );
  }

  const params = (await Promise.resolve(searchParams)) ?? {};
  const rawPage = Number(params.page ?? "1");
  const currentPage = Math.max(1, Number.isFinite(rawPage) ? rawPage : 1);
  const q = params.q?.toString().trim() || "";
  const premiumFilter = params.premium === "true";
  const activeFilters = [q && q.length > 0 ? "q" : null, premiumFilter ? "premium" : null].filter(Boolean)
    .length;

  const whereClause: Prisma.UserWhereInput = {
    schoolId: session.user.schoolId,
    role: "TEACHER",
    ...(premiumFilter ? { isPremium: true } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: Prisma.QueryMode.insensitive } },
            { email: { contains: q, mode: Prisma.QueryMode.insensitive } },
          ],
        }
      : {}),
  };

  const totalCount = await prisma.user.count({ where: whereClause });
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const skip = (safePage - 1) * PAGE_SIZE;
  const teachers = await prisma.user.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      email: true,
      avatarPublicId: true,
      isPremium: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    skip,
    take: PAGE_SIZE,
  });

  return (
    <main className="flex min-h-screen w-full flex-col gap-4">
      <section className="panel space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-white">Professeurs de l&apos;école</h2>
        </div>
        <FilterPanel
          storageKey="filters:admin-teachers"
          title="Filtres"
          activeCount={activeFilters}
          className="group"
          contentClassName="mt-3"
          userKey={userKey}
        >
          <form
            method="get"
            className="grid w-full gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-indigo-900/20 md:grid-cols-3 md:items-end"
          >
            <label className="text-sm text-slate-200 md:col-span-2">
              Recherche (nom ou email)
              <input
                name="q"
                defaultValue={q}
                placeholder="Nom ou email"
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              />
            </label>
            <label className="mt-1 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-200">
              <input
                type="checkbox"
                name="premium"
                value="true"
                defaultChecked={premiumFilter}
                className="h-4 w-4 rounded border-white/20 bg-white/5"
              />
              Premium
            </label>
            <div className="md:col-span-3 flex flex-wrap items-center justify-end gap-2">
              <button
                type="submit"
                className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-400"
              >
                Filtrer
              </button>
              <Link
                href="/admin/teachers"
                className="rounded-full border border-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
              >
                Réinitialiser
              </Link>
            </div>
          </form>
        </FilterPanel>
        {teachers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-4 text-sm text-slate-200">
            Aucun professeur trouvé.
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-2">
              {teachers.map((teacher) => (
                <article
                  key={teacher.id}
                  className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/10 via-white/5 to-cyan-500/10 p-4 shadow-inner shadow-black/20 backdrop-blur md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex flex-1 items-center gap-4">
                    <SafeImage
                      src={
                        resolveAvatarUrl({
                          avatarPublicId: teacher.avatarPublicId,
                          avatarUrl: null,
                          placeholder: TEACHER_AVATAR_PLACEHOLDER,
                        }) || TEACHER_AVATAR_PLACEHOLDER
                      }
                      alt={`Avatar de ${teacher.name ?? teacher.email ?? "Professeur"}`}
                      width={56}
                      height={56}
                      className="h-14 w-14 rounded-full border border-white/15 object-cover shadow-lg shadow-indigo-900/30"
                      fallbackSrc={TEACHER_AVATAR_PLACEHOLDER}
                    />
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-semibold text-white">{teacher.name ?? "Professeur"}</p>
                        {teacher.isPremium && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/60 bg-amber-400/20 px-2.5 py-1 text-[11px] font-semibold text-amber-50">
                            Premium
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-200">{teacher.email}</p>
                      <p className="text-xs text-slate-400">
                        Créé le {new Date(teacher.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end md:self-center">
                    <Link
                      href={`/teachers/${teacher.id}?from=/admin/teachers`}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
                    >
                      Voir la fiche
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 text-sm text-slate-200">
              <span>
                Page {safePage} / {totalPages} · {totalCount} profs
              </span>
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/teachers?page=${Math.max(1, safePage - 1)}${q ? `&q=${encodeURIComponent(q)}` : ""}${premiumFilter ? `&premium=true` : ""}`}
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
                  href={`/admin/teachers?page=${Math.min(totalPages, safePage + 1)}${q ? `&q=${encodeURIComponent(q)}` : ""}${premiumFilter ? `&premium=true` : ""}`}
                  aria-disabled={safePage === totalPages}
                  className={`rounded-full border border-white/10 px-3 py-2 ${
                    safePage === totalPages
                      ? "cursor-not-allowed text-slate-500"
                      : "bg-white/5 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
                  }`}
                >
                  Suivant
                </Link>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
