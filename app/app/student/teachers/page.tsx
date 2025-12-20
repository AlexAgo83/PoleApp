import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const TEACHER_AVATAR_PLACEHOLDER = "https://placehold.co/160x160/111827/ffffff?text=Prof";

const PAGE_SIZE = 10;

export default async function StudentTeachersPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; q?: string }>;
}) {
  const resolvedParams = (await searchParams) ?? {};
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/app/student/teachers");
  }
  if (!session.user.schoolId) {
    redirect("/access-denied");
  }

  const rawPage = Number(resolvedParams.page ?? "1");
  const currentPage = Math.max(1, rawPage || 1);
  const q =
    typeof resolvedParams.q === "string" && resolvedParams.q.trim().length > 0
      ? resolvedParams.q.trim()
      : undefined;

  const baseWhere = {
    role: "TEACHER" as const,
    schoolId: session.user.schoolId,
    coursesTaught: {
      some: {
        attendances: { some: { studentId: session.user.id } },
      },
    },
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const totalCount = await prisma.user.count({ where: baseWhere });
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const skip = (safePage - 1) * PAGE_SIZE;
  const activeFilters = q ? 1 : 0;

  const teachers = await prisma.user.findMany({
    where: baseWhere,
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      diplomas: true,
    },
    orderBy: { name: "asc" },
    skip,
    take: PAGE_SIZE,
  });

  const qs = q ? `q=${encodeURIComponent(q)}` : "";
  const prevHref = `/app/student/teachers?page=${Math.max(1, safePage - 1)}${qs ? `&${qs}` : ""}`;
  const nextHref = `/app/student/teachers?page=${Math.min(totalPages, safePage + 1)}${
    qs ? `&${qs}` : ""
  }`;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 px-0 py-6 md:gap-6 md:px-8 md:py-10">
      <header className="panel border-indigo-400/25 p-6 shadow-indigo-900/30">
        <p className="text-xs uppercase tracking-[0.14em] text-indigo-100">
          Élève
        </p>
        <h1 className="text-3xl font-semibold text-white">Professeurs</h1>
        <p className="text-sm text-slate-200">
          Fiches professeurs qui t&apos;ont déjà donné cours. Accède à leurs diplômes et positions
          préférées.
        </p>
        <div className="mt-3 flex w-full justify-end">
          <Link
            href="/app/student"
            className="inline-flex items-center justify-center rounded-full border border-white/20 px-3 py-2 text-white transition hover:border-indigo-300 hover:text-cyan-200"
          >
            ← Retour accueil
          </Link>
        </div>
      </header>

      <section className="panel border-indigo-400/15 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Tes professeurs</h2>
          <div className="text-sm text-slate-300">
            Page {safePage} / {totalPages} · {totalCount} professeurs
          </div>
        </div>
        <details className="group mt-4" open>
          <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-white">
            <span className="inline-flex items-center gap-2">
              <span>Filtres</span>
              {activeFilters > 0 && (
                <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[11px] font-semibold text-cyan-100">
                  {activeFilters}
                </span>
              )}
            </span>
            <span className="text-xs text-slate-300 transition-transform group-open:rotate-180">
              ▼
            </span>
          </summary>
          <form
            className="mt-3 grid w-full gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-indigo-900/20 md:grid-cols-3 md:items-end"
            method="get"
          >
            <label className="text-sm text-slate-200 md:col-span-2">
              Recherche (nom ou email)
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Nom ou email"
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              />
            </label>
            <div className="flex gap-2 md:justify-end">
              <button
                type="submit"
                className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-400"
              >
                Filtrer
              </button>
              <Link
                href="/app/student/teachers"
                className="rounded-full border border-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
              >
                Réinitialiser
              </Link>
            </div>
          </form>
        </details>
        {teachers.length === 0 ? (
          <p className="mt-3 text-slate-300">
            Aucun professeur associé pour le moment. Participe à un cours pour voir leur fiche.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {teachers.map((teacher) => {
              const avatar = teacher.avatarUrl?.trim() || TEACHER_AVATAR_PLACEHOLDER;
              return (
                <article
                  key={teacher.id}
                  className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={avatar}
                      alt={`Avatar de ${teacher.name ?? teacher.email ?? "Professeur"}`}
                      className="h-16 w-16 rounded-full border border-white/10 object-cover shadow"
                    />
                    <div className="flex-1 space-y-1">
                      <p className="text-base font-semibold text-white">
                        {teacher.name ?? "Professeur"}
                      </p>
                      <p className="text-sm text-slate-300">{teacher.email}</p>
                      <p className="text-sm text-slate-400">Professeur de ton école</p>
                    </div>
                  </div>
                  <div className="flex justify-end text-sm">
                    <Link
                      href={`/app/teachers/${teacher.id}?from=/app/student/teachers`}
                      className="inline-flex items-center justify-center rounded-full border border-cyan-400/60 bg-cyan-500/10 px-3 py-1.5 font-semibold text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-500/20"
                    >
                      Voir la fiche
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {totalCount > PAGE_SIZE && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-200">
            <Link
              href={prevHref}
              aria-disabled={safePage === 1}
              className={`rounded-full border border-white/10 px-3 py-2 ${
                safePage === 1
                  ? "cursor-not-allowed text-slate-500"
                  : "bg-white/5 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
              }`}
            >
              Précédent
            </Link>
            <span className="text-slate-200">
              Page {safePage} / {totalPages} · {totalCount} professeurs
            </span>
            <Link
              href={nextHref}
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
        )}
      </section>
    </main>
  );
}
