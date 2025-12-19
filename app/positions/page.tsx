import { PositionLevel, PositionType } from "@prisma/client";
import Link from "next/link";
import { getServerSession } from "next-auth";

import { SignOutButton } from "@/components/auth/SignOutButton";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { defaultHomeForRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";

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

export default async function PositionsPage() {
  const session = await getServerSession(authOptions);
  const homeForRole = defaultHomeForRole(session?.user?.role);
  const positions = await prisma.position.findMany({
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: {
      media: { take: 1 },
    },
  });
  const canManage =
    session?.user?.role === "TEACHER" || session?.user?.role === "SCHOOL_ADMIN";

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-12">
      <section className="panel flex flex-col gap-3 p-4 text-sm text-slate-200 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {session?.user ? (
            <>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.14em] text-cyan-200">
                Session
                <span className="text-white text-[11px] normal-case tracking-normal">
                  {session.user.email}
                </span>
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.14em] text-cyan-200">
                Rôle : {session.user.role}
              </span>
            </>
          ) : (
            <span className="text-xs uppercase tracking-[0.18em] text-cyan-200">
              Pole App — MVP v0.1.0
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <Link
            href="/"
            role="button"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            Accueil
          </Link>
          {session?.user ? (
            <>
              <Link
                href={homeForRole}
                role="button"
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
              >
                Mon espace
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link
              href="/login"
              role="button"
              className="rounded-full bg-cyan-500 px-4 py-2 font-semibold text-slate-900 transition hover:bg-cyan-400"
            >
              Se connecter
            </Link>
          )}
        </div>
      </section>

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
                      href={`/positions/${p.id}?from=/positions`}
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
      </section>
    </main>
  );
}
