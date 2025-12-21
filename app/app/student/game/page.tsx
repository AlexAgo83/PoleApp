import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { buildGameQuestions } from "./logic";
import { GameClient } from "./GameClient";

function ReturnCta({ role }: { role: string }) {
  const href =
    role === "TEACHER" ? "/app/teacher" : role === "SCHOOL_ADMIN" ? "/app/admin" : "/app/student";
  return (
    <div className="flex w-full justify-end">
      <Link
        href={href}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-normal text-white transition hover:border-cyan-400/70 hover:bg-white/10"
      >
        ← Retour accueil
      </Link>
    </div>
  );
}

export default async function GamePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const positions = await prisma.position.findMany({
    include: { media: { take: 1 } },
  });

  let eligible = positions;
  const isStudent = session.user.role === "STUDENT";
  const isTeacherOrAdmin = session.user.role === "TEACHER" || session.user.role === "SCHOOL_ADMIN";

  if (isStudent) {
    const progress = await prisma.studentPositionProgress.findMany({
      where: { studentId: session.user.id },
      select: { positionId: true },
    });
    const unlockedIds = new Set(progress.map((p) => p.positionId));
    eligible = session.user.isPremium ? positions : positions.filter((p) => unlockedIds.has(p.id));
  } else if (isTeacherOrAdmin) {
    eligible = positions; // prof/admin : accès illimité
  } else {
    redirect("/login");
  }

  if (eligible.length < 4) {
    return (
      <main className="mx-auto flex max-w-4xl flex-col items-center justify-center gap-4 px-6 py-12">
        <div className="panel w-full max-w-md p-6 text-center text-slate-200">
          <p>Pas assez de positions pour générer un jeu.</p>
          <p className="text-sm text-slate-300">
            Ajoute des positions vues (ou passe premium) pour débloquer plus de questions.
          </p>
          <Link
            href="/positions"
            className="mt-4 inline-flex items-center justify-center rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-400"
          >
            Voir les positions
          </Link>
          <ReturnCta role={session.user.role} />
        </div>
      </main>
    );
  }

  const questions = buildGameQuestions(eligible);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-3 px-0 py-6 md:gap-6 md:px-8 md:py-10">
      <header className="panel flex flex-wrap items-center justify-between gap-3 p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">
            {isTeacherOrAdmin ? "Prof / Admin" : "Élève"}
          </p>
          <h1 className="text-3xl font-semibold text-white">Mini-jeu Photo → Nom</h1>
          <p className="text-sm text-slate-300">
            10 questions, pool basé sur tes positions débloquées (ou toutes si premium).
          </p>
        </div>
        <ReturnCta role={session.user.role} />
      </header>

      <section className="panel w-full p-6">
        <GameClient questions={questions} />
      </section>
    </main>
  );
}
