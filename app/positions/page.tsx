import { PositionLevel, PositionType } from "@prisma/client";
import { getServerSession } from "next-auth";
import Link from "next/link";

import { SessionNavBar } from "@/components/SessionNavBar";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 10;

const typeLabels: Record<PositionType, string> = {
  SPIN: "Spin",
  TRICK: "Trick",
  TRANSITION: "Transition",
  WARMUP: "Warmup",
  STRENGTH: "Strength",
};

const levelLabels: Record<PositionLevel, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermédiaire",
  ADVANCED: "Avancé",
};

type SearchParams =
  | { page?: string }
  | Promise<{
      page?: string;
    }>;

export default async function PositionsPage({ searchParams }: { searchParams?: SearchParams }) {
  const resolvedParams = (await Promise.resolve(searchParams)) ?? {};
  const rawPage = Number(resolvedParams.page ?? "1");
  const totalCount = await prisma.position.count();
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, rawPage || 1), totalPages);
  const skip = (currentPage - 1) * PAGE_SIZE;

  const session = await getServerSession(authOptions);
  const positions = await prisma.position.findMany({
    orderBy: { updatedAt: "desc" },
    skip,
    take: PAGE_SIZE,
    include: {
      media: { take: 1 },
    },
  });
  const canManage =
    session?.user?.role === "TEACHER" || session?.user?.role === "SCHOOL_ADMIN";

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-12">
      <SessionNavBar session={session} />

      <header className="panel flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">
            Positions
          </p>
          <h1 className="text-3xl font-semibold text-white">Positions</h1>
          <p className="text-slate-300">
            Liste rapide des positions (tri par mise à jour). Visible pour élèves,
            profs et admins.
          </p>
        </div>
        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/teacher/positions/new"
              className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-400"
            >
              Nouvelle position
            </Link>
          </div>
        )}
      </header>

      <section className="panel p-6">
        <div className="grid gap-4 md:grid-cols-2">
          {positions.map((p) => {
            const cover = p.media?.[0];
            return (
              <article
                key={p.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition hover:border-cyan-400/60 hover:bg-white/10"
              >
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cover.url}
                    alt={p.name}
                    className="h-40 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-40 w-full items-center justify-center bg-white/5 text-sm text-slate-300">
                    Pas d’image
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-base font-semibold text-white">{p.name}</p>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-amber-100">
                      {levelLabels[p.levelRequired]}
                    </span>
                  </div>
                  <p className="text-sm text-cyan-200">{typeLabels[p.type]}</p>
                  <p className="text-sm text-slate-300 line-clamp-2">
                    {p.tips ?? p.description ?? "Aucun détail"}
                  </p>
                  <div className="mt-auto flex items-center justify-between gap-2">
                    <p className="text-xs text-slate-400">
                      {p.grips ?? "Grip ?"}
                    </p>
                    <Link
                      href={`/positions/${p.id}?from=/positions?page=${currentPage}`}
                      className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
                    >
                      Voir
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
          {positions.length === 0 && (
            <p className="py-4 text-slate-200">Aucune position pour le moment.</p>
          )}
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-200">
          <span>
            Page {currentPage} / {totalPages} · {totalCount} positions
          </span>
          <div className="flex items-center gap-2">
            <Link
              href={`/positions?page=${Math.max(1, currentPage - 1)}`}
              aria-disabled={currentPage === 1}
              className={`rounded-full border border-white/10 px-3 py-2 ${
                currentPage === 1
                  ? "cursor-not-allowed text-slate-500"
                  : "bg-white/5 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
              }`}
            >
              Précédent
            </Link>
            <Link
              href={`/positions?page=${Math.min(totalPages, currentPage + 1)}`}
              aria-disabled={currentPage === totalPages}
              className={`rounded-full border border-white/10 px-3 py-2 ${
                currentPage === totalPages
                  ? "cursor-not-allowed text-slate-500"
                  : "bg-white/5 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
              }`}
            >
              Suivant
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
