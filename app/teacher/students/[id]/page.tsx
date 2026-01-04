import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { GameMode, LearningStatus } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { AVATAR_PLACEHOLDER } from "@/lib/placeholders";
import { resolveAvatarUrl } from "@/lib/avatar";
import { SafeImage } from "@/components/SafeImage";
import { prisma } from "@/lib/prisma";
import { StudentPerformanceList } from "@/app/profile/StudentPerformanceList";
import { updateStudentProfileAction } from "./actions";
import { StudentAvatarManager } from "./StudentAvatarManager";
import { PersistedSection } from "./PersistedSection";
import { ProgressCard } from "./ProgressCard";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ from?: string }>;
};

const STUDENT_AVATAR_PLACEHOLDER = AVATAR_PLACEHOLDER;
const gameModeLabel: Record<GameMode, string> = {
  PHOTO_NAME: "Photo → nom",
  NAME_TYPE: "Nom → type",
  NAME_LEVEL: "Nom → niveau",
  NAME_GRIPS: "Nom → grips",
  DESCRIPTION_NAME: "Description → nom",
  BLITZ_MIX: "Blitz mix",
};

export default async function TeacherStudentDetailPage({
  params,
  searchParams,
}: Props) {
  const resolvedParams = await Promise.resolve(params);
  void searchParams;
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
      avatarPublicId: true,
      age: true,
      isPremium: true,
      school: {
        select: { name: true },
      },
      injuries: {
        include: { injuryType: true },
        orderBy: { createdAt: "desc" },
      },
      progress: {
        include: { position: true },
      },
      studentFavoritePositions: {
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
  const attendancePositions = await prisma.courseAttendance.findMany({
    where: {
      studentId,
      status: { in: ["CONFIRMED", "WAITLIST"] },
    },
    select: { course: { select: { positions: { select: { positionId: true } } } } },
  });
  const taughtPositionIds = new Set<string>();
  attendancePositions.forEach((att) => {
    att.course.positions.forEach((cp) => {
      if (cp.positionId) taughtPositionIds.add(cp.positionId);
    });
  });

  const gameSessions = await prisma.gameSession.findMany({
    where: { userId: student.id },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const progressMap = new Map(
    student.progress.map((p) => [p.positionId, p])
  );
  const filteredPositions = taughtPositionIds.size
    ? positions.filter((p) => taughtPositionIds.has(p.id))
    : [];
  const avatarUrl = resolveAvatarUrl({
    avatarPublicId: student.avatarPublicId,
    avatarUrl: null,
    placeholder: STUDENT_AVATAR_PLACEHOLDER,
  });
  const avatarFolder = process.env.NEXT_PUBLIC_CLOUDINARY_AVATAR_FOLDER ?? "poleapp/avatars";
  const studentDisplayName = student.name?.trim() || student.email || "Élève";
  const nameParts = (student.name ?? "").trim().split(" ").filter(Boolean);
  const firstNameDefault = nameParts[0] ?? "";
  const lastNameDefault = nameParts.slice(1).join(" ");
  const canEdit = session.user.role === "SCHOOL_ADMIN" || session.user.role === "TEACHER";
  const roleLabel = "Étudiant";
  const statusOrder: Record<LearningStatus, number> = {
    MASTERED: 0,
    PASSED: 1,
    IN_PROGRESS: 2,
    NOT_STARTED: 3,
  };
  const sortedProgression = student.progress
    .filter((p) => p.position)
    .sort((a, b) => {
      const orderDiff = statusOrder[a.learningStatus] - statusOrder[b.learningStatus];
      if (orderDiff !== 0) return orderDiff;
      return (a.position?.name || "").localeCompare(b.position?.name || "");
    });

  return (
    <main className="flex w-full flex-col gap-4">
      <section className="panel panel-body lg-gap border-indigo-400/25 shadow-indigo-900/30">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-4">
            <SafeImage
              src={avatarUrl}
              alt={`Avatar de ${studentDisplayName}`}
              width={80}
              height={80}
              className="h-20 w-20 rounded-full border border-white/10 object-cover shadow-lg shadow-black/30"
              fallbackSrc={STUDENT_AVATAR_PLACEHOLDER}
            />
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-indigo-100">Fiche élève</p>
              <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
                <span>{studentDisplayName}</span>
                {student.age ? (
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-slate-100">
                    {student.age} ans
                  </span>
                ) : null}
              </h1>
              <p className="text-sm text-slate-200">{student.email}</p>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span>École : {student.school?.name ?? "Non rattaché"}</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-slate-100">
                  {roleLabel}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-slate-100">
                  {student.isPremium ? "Premium" : "Gratuit"}
                </span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/90">
              Vu : {student.progress.length}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/90">
              Blessures actives : {student.injuries.filter((inj) => inj.isActive).length}
            </span>
            {student.isPremium && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/60 bg-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-50">
                Premium
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <div>
            <StudentPerformanceList
              labelClassName="text-lg font-semibold text-white"
              items={sortedProgression.map((p) => ({
                positionId: p.positionId,
                positionName: p.position?.name ?? "Position",
                learningStatus: p.learningStatus,
                updatedAt: p.updatedAt,
              }))}
            />
            {sortedProgression.length === 0 ? (
              <p className="mt-2 text-sm text-slate-300">
                Aucune progression enregistrée pour l’instant.
              </p>
            ) : null}
          </div>

          <div className="space-y-3 text-sm text-slate-200">
            <h3 className="text-lg font-semibold text-white">Positions coups de cœur</h3>
            {student.studentFavoritePositions.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {student.studentFavoritePositions
                  .filter((fav) => fav.position)
                  .map((fav) => (
                    <Link
                      key={fav.positionId}
                      href={`/positions/${fav.positionId}`}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[12px] font-semibold text-white transition hover:border-cyan-300/70 hover:bg-white/10"
                    >
                      {fav.position?.name}
                    </Link>
                  ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-300">Aucune position préférée pour le moment.</p>
            )}
          </div>
        </div>
      </section>

      {canEdit && (
        <section className="panel panel-body lg-gap border-indigo-400/15">
          <PersistedSection
            id={`student-profile:${student.id}`}
            summary={
              <>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Édition</p>
                  <h2 className="text-lg font-semibold text-white">Profil élève</h2>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white transition hover:border-cyan-300/70 hover:bg-white/10 group-open:border-white/15 group-open:bg-white/5">
                  <span className="group-open:hidden">Modifier</span>
                  <span className="hidden group-open:inline">Fermer</span>
                </span>
              </>
            }
          >
            <div className="panel-body lg-gap pt-1">
              <form action={updateStudentProfileAction} className="panel-grid lg-gap md:grid-cols-4">
                <input type="hidden" name="studentId" value={student.id} />
                <label className="text-sm text-slate-200">
                  Prénom
                  <input
                    name="firstName"
                    placeholder="Prénom"
                    defaultValue={firstNameDefault}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
                  />
                </label>
                <label className="text-sm text-slate-200">
                  Nom
                  <input
                    name="lastName"
                    placeholder="Nom"
                    defaultValue={lastNameDefault}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
                  />
                </label>
                <label className="text-sm text-slate-200">
                  Âge
                  <input
                    name="age"
                    type="number"
                    inputMode="numeric"
                    placeholder="Âge"
                    defaultValue={student.age ?? ""}
                    min={1}
                    max={120}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
                  />
                </label>
                <div className="flex items-end justify-end">
                  <button
                    type="submit"
                    className="rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
                  >
                    Sauvegarder
                  </button>
                </div>
              </form>
            </div>
          </PersistedSection>
        </section>
      )}

      {canEdit && (
      <section className="panel panel-body lg-gap border-indigo-400/15">
        <details className="group">
          <summary className="flex cursor-pointer items-center justify-between text-lg font-semibold text-white outline-none transition hover:text-cyan-100">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Édition</p>
                <h2 className="text-lg font-semibold text-white">Photo de profil</h2>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white transition hover:border-cyan-300/70 hover:bg-white/10 group-open:border-white/15 group-open:bg-white/5">
                <span className="group-open:hidden">Modifier</span>
                <span className="hidden group-open:inline">Fermer</span>
              </span>
            </summary>
            <div className="panel-body lg-gap pt-1">
              <StudentAvatarManager
                studentId={student.id}
                folder={avatarFolder}
                initialPublicId={student.avatarPublicId ?? null}
              />
              <p className="text-sm text-slate-300">
                Upload/suppression dédiée (Cloudinary), 2 Mo max.
              </p>
            </div>
          </details>
        </section>
      )}

      <section className="panel panel-body lg-gap border-indigo-400/15">
        <PersistedSection
          id={`student-progress:${student.id}`}
          summary={
            <>
              <div>
                <h2 className="text-lg font-semibold text-white">Progression</h2>
                <p className="text-xs text-slate-300">Positions enseignées : {filteredPositions.length}</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white transition hover:border-cyan-300/70 hover:bg-white/10 group-open:border-white/15 group-open:bg-white/5">
                <span className="group-open:hidden">Ouvrir</span>
                <span className="hidden group-open:inline">Fermer</span>
              </span>
            </>
          }
        >
          <div className="panel-grid lg-gap md:grid-cols-2">
            {filteredPositions.map((position) => {
              const progress = progressMap.get(position.id);
              return <ProgressCard key={position.id} position={position} progress={progress} studentId={student.id} />;
            })}
            {filteredPositions.length === 0 && (
              <p className="md:col-span-2 text-sm text-slate-200">
                Aucune position enseignée pour l&apos;instant.
              </p>
            )}
          </div>
        </PersistedSection>
      </section>

      <section className="panel panel-body lg-gap border-indigo-400/15">
        <details className="group" open={false}>
          <summary className="flex cursor-pointer items-center justify-between text-lg font-semibold text-white outline-none transition hover:text-cyan-100">
            <h2 className="text-lg font-semibold text-white">
              Blessures ({student.injuries.length})
            </h2>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white transition hover:border-cyan-300/70 hover:bg-white/10 group-open:border-white/15 group-open:bg-white/5">
              <span className="group-open:hidden">Ouvrir</span>
              <span className="hidden group-open:inline">Fermer</span>
            </span>
          </summary>
          <div className="flex flex-col divide-y divide-white/5">
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
        </details>
      </section>

      <section className="panel panel-body lg-gap border-indigo-400/15">
        <details className="group" open={false}>
          <summary className="flex cursor-pointer items-center justify-between text-lg font-semibold text-white outline-none transition hover:text-cyan-100">
            <h2 className="text-lg font-semibold text-white">
              Mini-jeux ({gameSessions.length})
            </h2>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white transition hover:border-cyan-300/70 hover:bg-white/10 group-open:border-white/15 group-open:bg-white/5">
              <span className="group-open:hidden">Ouvrir</span>
              <span className="hidden group-open:inline">Fermer</span>
            </span>
          </summary>
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
        </details>
      </section>
    </main>
  );
}
