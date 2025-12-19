import { LearningStatus, MasteryLevel } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const statusLabels: Record<LearningStatus, string> = {
  NOT_STARTED: "Non commencé",
  IN_PROGRESS: "En cours",
  PASSED: "Passé",
  MASTERED: "Maîtrisé",
};

const masteryLabels: Record<MasteryLevel, string> = {
  INITIATED: "Initiation",
  PASSED: "Passé",
  FLUID: "Fluide",
  CHOREO: "Choréo",
};

const typeLabels = {
  SPIN: "Spin",
  TRICK: "Trick",
  TRANSITION: "Transition",
  WARMUP: "Warmup",
  STRENGTH: "Strength",
} as const;

export default async function StudentProgressPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "STUDENT") redirect("/access-denied");

  const [positions, progressEntries] = await Promise.all([
    prisma.position.findMany({
      orderBy: { name: "asc" },
      include: { media: { take: 1 } },
    }),
    prisma.studentPositionProgress.findMany({
      where: { studentId: session.user.id },
      include: { position: true },
    }),
  ]);

  const progressMap = new Map(
    progressEntries.map((p) => [p.positionId, p])
  );

  const visiblePositions = session.user.isPremium
    ? positions
    : positions.filter((p) => progressMap.has(p.id));
  const lockedCount = session.user.isPremium
    ? 0
    : positions.length - visiblePositions.length;

  return (
    <main className="mx-auto grid min-h-screen max-w-6xl gap-6 px-6 py-10">
      <header className="panel p-6">
        <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">
          Élève
        </p>
        <h1 className="text-3xl font-semibold text-white">Ma progression</h1>
        <p className="text-sm text-slate-300">
          {session.user.isPremium
            ? "Accès complet à la base des positions."
            : "Accès aux positions vues (compte gratuit)."}
        </p>
      </header>

      <section className="panel p-6">
        {!session.user.isPremium && lockedCount > 0 && (
          <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
            {lockedCount} position(s) verrouillées. Passe en premium pour tout voir.
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visiblePositions.map((position) => {
            const progress = progressMap.get(position.id);
            const status = progress?.learningStatus ?? "NOT_STARTED";
            const mastery = progress?.masteryLevel;
            const cover = position.media[0];

            return (
              <article
                key={position.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition hover:border-cyan-400/60 hover:bg-white/10"
              >
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cover.url}
                    alt={position.name}
                    className="h-40 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-40 w-full items-center justify-center bg-white/5 text-sm text-slate-300">
                    Pas d’image
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold text-white">
                      {position.name}
                    </h3>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-amber-200">
                      {statusLabels[status as LearningStatus]}
                    </span>
                  </div>
                  <p className="text-sm text-cyan-200">{typeLabels[position.type]}</p>
                  <p className="text-sm text-slate-300 line-clamp-2">
                    {position.tips ?? position.description ?? "Aucun détail"}
                  </p>
                  {mastery && (
                    <p className="text-xs text-slate-200">
                      Niveau : {masteryLabels[mastery]}
                    </p>
                  )}
                  <Link
                    href={`/positions/${position.id}?from=/app/student/progress`}
                    className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 transition hover:text-cyan-200"
                  >
                    Détail position →
                  </Link>
                </div>
              </article>
            );
          })}
          {visiblePositions.length === 0 && (
            <p className="col-span-full py-4 text-slate-200">
              Aucune position débloquée pour l’instant.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
