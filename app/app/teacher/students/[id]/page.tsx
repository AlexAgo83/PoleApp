import { GameMode, LearningStatus } from "@prisma/client";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { AVATAR_PLACEHOLDER } from "@/lib/placeholders";
import { SafeImage } from "@/components/SafeImage";
import { prisma } from "@/lib/prisma";
import { updateProgressAction, updateStudentProfileAction } from "./actions";

const statusLabel: Record<LearningStatus, string> = {
  NOT_STARTED: "Découverte",
  IN_PROGRESS: "Tenté",
  PASSED: "Passé",
  MASTERED: "Fluide",
};

const statusClass: Record<LearningStatus, string> = {
  NOT_STARTED: "border-white/15 bg-white/5 text-white",
  IN_PROGRESS: "border-amber-400/40 bg-amber-500/15 text-amber-50",
  PASSED: "border-cyan-400/40 bg-cyan-500/15 text-cyan-50",
  MASTERED: "border-emerald-400/40 bg-emerald-500/15 text-emerald-50",
};

const gameModeLabel: Record<GameMode, string> = {
  PHOTO_NAME: "Photo → Nom",
  NAME_TYPE: "Nom → Type",
  NAME_LEVEL: "Nom → Niveau",
  NAME_GRIPS: "Nom → Grips",
  DESCRIPTION_NAME: "Description → Nom",
  BLITZ_MIX: "Blitz mix",
};

type Props = {
  params: { id: string } | Promise<{ id?: string }>;
  searchParams?: Promise<{ from?: string }>;
};

const STUDENT_AVATAR_PLACEHOLDER = AVATAR_PLACEHOLDER;

export default async function TeacherStudentDetailPage({
  params,
  searchParams,
}: Props) {
  const resolvedParams = await Promise.resolve(params);
  const studentId = resolvedParams?.id;

  if (!studentId) {
    notFound();
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.schoolId) {
    redirect("/access-denied");
  }
  const isTeacherOnly = session.user.role === "TEACHER";

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
      avatarUrl: true,
      age: true,
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
  if (isTeacherOnly) {
    const teachesStudent = await prisma.courseAttendance.count({
      where: { studentId, course: { teacherId: session.user.id } },
    });
    if (!teachesStudent) {
      redirect("/access-denied");
    }
  }

  const positions = await prisma.position.findMany({
    orderBy: { name: "asc" },
    include: { media: { take: 1 } },
  });

  const gameSessions = await prisma.gameSession.findMany({
    where: { userId: student.id },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const progressMap = new Map(
    student.progress.map((p) => [p.positionId, p])
  );
  const resolvedSearch = (await searchParams) ?? {};
  const rawFrom = resolvedSearch.from;
  const safeFrom =
    rawFrom && rawFrom.startsWith("/") && !rawFrom.startsWith("//")
      ? rawFrom
      : undefined;
  const backHref = safeFrom ?? "/app/teacher/students";
  const avatarUrl = student.avatarUrl?.trim() || STUDENT_AVATAR_PLACEHOLDER;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-3 px-0 py-6 md:gap-6 md:px-8 md:py-10">
      <header className="panel border-indigo-400/25 p-6 shadow-indigo-900/30">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.14em] text-indigo-100">
            Professeur / Admin
          </p>
          <h1 className="text-3xl font-semibold text-white">Fiche élève</h1>
          <p className="text-sm text-slate-200">
            {student.name ?? student.email} · {student.email} ·{" "}
            {student.isPremium ? "Premium" : "Free"} · Âge :{" "}
            {student.age ? `${student.age} ans` : "non renseigné"}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <SafeImage
              src={avatarUrl}
              alt={`Avatar de ${student.name ?? student.email}`}
              width={64}
              height={64}
              className="h-16 w-16 rounded-full border border-white/10 object-cover shadow"
              fallbackSrc={STUDENT_AVATAR_PLACEHOLDER}
            />
            <p className="text-xs text-slate-300">
              Photo définie par l&apos;élève (ou placeholder).
            </p>
          </div>
          <form action={updateStudentProfileAction} className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-200">
            <input type="hidden" name="studentId" value={student.id} />
            <input
              name="firstName"
              placeholder="Prénom"
              defaultValue={student.name?.split(" ")[0] ?? ""}
              className="w-28 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white outline-none focus:border-indigo-400"
            />
            <input
              name="lastName"
              placeholder="Nom"
              defaultValue={
                student.name?.split(" ").slice(1).join(" ") ?? ""
              }
              className="w-32 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white outline-none focus:border-indigo-400"
            />
            <input
              name="avatarUrl"
              type="url"
              placeholder="Photo (URL)"
              defaultValue={student.avatarUrl ?? ""}
              className="w-52 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white outline-none focus:border-indigo-400"
            />
            <input
              name="age"
              type="number"
              inputMode="numeric"
              placeholder="Âge"
              defaultValue={student.age ?? ""}
              min={1}
              max={120}
              className="w-20 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white outline-none focus:border-indigo-400"
            />
            <button
              type="submit"
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white transition hover:border-indigo-300/70 hover:bg-white/10"
            >
              Sauvegarder
            </button>
          </form>
        </div>
        <div className="mt-4 flex w-full justify-end">
          <Link
            href={backHref}
            className="inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-indigo-300 hover:text-cyan-200"
          >
            ← Retour à la liste
          </Link>
        </div>
      </header>

      <section className="panel border-indigo-400/15 p-6">
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

      <section className="panel border-indigo-400/15 p-6">
        <h2 className="text-lg font-semibold text-white">Mini-jeux (5 dernières)</h2>
        {gameSessions.length === 0 ? (
          <p className="mt-2 text-sm text-slate-200">Aucune session jouée pour le moment.</p>
        ) : (
          <ul className="mt-3 divide-y divide-white/5 text-sm text-slate-200">
            {gameSessions.map((g) => {
              const accuracy =
                g.totalQuestions > 0
                  ? Math.round((g.correctAnswers / g.totalQuestions) * 100)
                  : 0;
              return (
                <li key={g.id} className="py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-white">
                        {gameModeLabel[g.mode]} ({g.mode})
                      </p>
                      <p className="text-xs text-slate-400">
                        {g.correctAnswers}/{g.totalQuestions} · {accuracy}% ·{" "}
                        {g.durationMs ? `${Math.round(g.durationMs / 1000)}s` : "—"}
                      </p>
                    </div>
                    <p className="text-xs text-slate-300">
                      {g.createdAt.toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="panel border-indigo-400/15 p-6">
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
                <div className="flex flex-wrap items-center gap-2">
                  {progress ? (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold ${statusClass[progress.learningStatus]}`}
                    >
                      {statusLabel[progress.learningStatus]}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/90">
                      Non commencé
                    </span>
                  )}
                  {progress?.masteryLevel && (
                    <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[11px] font-semibold text-white/90">
                      {progress.masteryLevel}
                    </span>
                  )}
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
                      <option value="NOT_STARTED">Découverte</option>
                      <option value="IN_PROGRESS">Tenté</option>
                      <option value="PASSED">Passé</option>
                      <option value="MASTERED">Fluide</option>
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
                    className="rounded-full bg-cyan-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-cyan-400"
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
