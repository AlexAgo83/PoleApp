import { LearningStatus } from "@prisma/client";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateProgressAction } from "./actions";

type Props = {
  params: { id: string };
};

export default async function TeacherStudentDetailPage({ params }: Props) {
  const resolvedParams = await Promise.resolve(params);
  const studentId = resolvedParams?.id;

  if (!studentId) {
    notFound();
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.schoolId) {
    redirect("/access-denied");
  }

  const student = await prisma.user.findFirst({
    where: {
      id: studentId,
      schoolId: session.user.schoolId,
      role: "STUDENT",
    },
    select: {
      id: true,
      email: true,
      name: true,
      isPremium: true,
      injuries: {
        include: { injuryType: true },
        orderBy: { createdAt: "desc" },
      },
      progress: {
        include: { position: true },
      },
    },
  });

  if (!student) {
    redirect("/access-denied");
  }

  const positions = await prisma.position.findMany({
    orderBy: { name: "asc" },
    include: { media: { take: 1 } },
  });

  const progressMap = new Map(
    student.progress.map((p) => [p.positionId, p])
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="panel p-6">
        <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">
          Professeur / Admin
        </p>
        <h1 className="text-3xl font-semibold text-white">Fiche élève</h1>
        <p className="text-sm text-slate-300">
          {student.name ?? student.email} · {student.email} ·{" "}
          {student.isPremium ? "Premium" : "Free"}
        </p>
      </header>

      <section className="panel p-6">
        <h2 className="text-lg font-semibold text-white">Blessures</h2>
        <div className="mt-4 flex flex-col divide-y divide-white/5">
          {student.injuries.map((injury) => (
            <article key={injury.id} className="py-3">
              <p className="text-base font-semibold text-white">
                {injury.injuryType.name} ·{" "}
                <span className={injury.isActive ? "text-amber-200" : "text-green-200"}>
                  {injury.isActive ? "Active" : "Résolue"}
                </span>
              </p>
              {injury.notes && (
                <p className="text-sm text-slate-200">Notes : {injury.notes}</p>
              )}
            </article>
          ))}
          {student.injuries.length === 0 && (
            <p className="py-4 text-slate-200">Aucune blessure déclarée.</p>
          )}
        </div>
      </section>

      <section className="panel p-6">
        <h2 className="text-lg font-semibold text-white">Progression</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {positions.map((position) => {
            const progress = progressMap.get(position.id);
            return (
              <article
                key={position.id}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-base font-semibold text-white">{position.name}</p>
                  <p className="text-xs text-slate-300">{position.type}</p>
                </div>
                <form action={updateProgressAction} className="space-y-2 text-sm text-slate-200">
                  <input type="hidden" name="studentId" value={student.id} />
                  <input type="hidden" name="positionId" value={position.id} />
                  <label className="block">
                    Statut
                    <select
                      name="learningStatus"
                      defaultValue={progress?.learningStatus ?? LearningStatus.NOT_STARTED}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
                    >
                      <option value="NOT_STARTED">Non commencé</option>
                      <option value="IN_PROGRESS">En cours</option>
                      <option value="PASSED">Passé</option>
                      <option value="MASTERED">Maîtrisé</option>
                    </select>
                  </label>
                  <label className="block">
                    Niveau
                    <select
                      name="masteryLevel"
                      defaultValue={progress?.masteryLevel ?? ""}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
                    >
                      <option value="">(non renseigné)</option>
                      <option value="INITIATED">Initiation</option>
                      <option value="PASSED">Passé</option>
                      <option value="FLUID">Fluide</option>
                      <option value="CHOREO">Choréo</option>
                    </select>
                  </label>
                  <label className="block">
                    Commentaire
                    <textarea
                      name="comment"
                      defaultValue={progress?.comment ?? ""}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
                    />
                  </label>
                  <button
                    type="submit"
                    className="rounded-full bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-900 transition hover:bg-cyan-400"
                  >
                    Sauvegarder
                  </button>
                </form>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
