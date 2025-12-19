import Link from "next/link";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TeacherPositionsPage() {
  const positions = await prisma.position.findMany({
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-12">
      <header className="panel flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">
            Prof / Admin
          </p>
          <h1 className="text-3xl font-semibold text-white">Positions</h1>
          <p className="text-slate-300">
            Liste rapide des positions (tri par mise à jour). L’édition sera
            ajoutée ensuite.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            ← Accueil
          </Link>
          <Link
            href="/teacher/positions/new"
            className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-400"
          >
            Nouvelle position
          </Link>
        </div>
      </header>

      <section className="panel p-6">
        <div className="flex flex-col divide-y divide-white/5">
          {positions.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div>
                <p className="text-base font-semibold text-white">{p.name}</p>
                <p className="text-sm text-slate-300">
                  {p.type} · {p.levelRequired} · {p.grips ?? "grip ?" }
                </p>
              </div>
              <Link
                href={`/positions/${p.id}`}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
              >
                Voir
              </Link>
            </div>
          ))}
          {positions.length === 0 && (
            <p className="py-4 text-slate-200">Aucune position pour le moment.</p>
          )}
        </div>
      </section>
    </main>
  );
}
