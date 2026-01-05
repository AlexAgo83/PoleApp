import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { GameMode, LearningStatus } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AVATAR_PLACEHOLDER } from "@/lib/placeholders";
import { resolveAvatarUrl } from "@/lib/avatar";
import { updateProfileAction } from "./actions";
import { ProfileCollapsible } from "./ProfileCollapsible";
import { AvatarManager } from "./AvatarManager";
import { StudentPerformanceList } from "./StudentPerformanceList";
import { PersistedSection as StudentPersistedSection } from "@/app/teacher/students/[id]/PersistedSection";

const roleLabels: Record<string, string> = {
  STUDENT: "Étudiant",
  TEACHER: "Professeur",
  SCHOOL_ADMIN: "Admin d'école",
};

const STUDENT_AVATAR_PLACEHOLDER = AVATAR_PLACEHOLDER;
const TEACHER_AVATAR_PLACEHOLDER = AVATAR_PLACEHOLDER;

const statusOrder: Record<LearningStatus, number> = {
  MASTERED: 0,
  PASSED: 1,
  IN_PROGRESS: 2,
  NOT_STARTED: 3,
};

const gameModeLabel: Record<GameMode, string> = {
  PHOTO_NAME: "Photo → nom",
  NAME_TYPE: "Nom → type",
  NAME_LEVEL: "Nom → niveau",
  NAME_GRIPS: "Nom → grips",
  DESCRIPTION_NAME: "Description → nom",
  BLITZ_MIX: "Blitz mix",
};
export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/profile");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      school: true,
      favoritePositions: {
        include: { position: true },
      },
      favoriteDisciplines: {
        include: { discipline: true },
      },
      studentFavoritePositions: {
        include: { position: true },
      },
      injuries: {
        include: { injuryType: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  const isTeacher = user.role === "TEACHER";
  const isStudent = user.role === "STUDENT";
  const progressionEntries =
    isStudent
      ? await prisma.studentPositionProgress.findMany({
          where: { studentId: user.id },
          include: { position: true },
        })
      : [];
  const sortedProgression = isStudent
    ? progressionEntries
        .filter((p) => p.position)
        .sort((a, b) => {
          const orderDiff = statusOrder[a.learningStatus] - statusOrder[b.learningStatus];
          if (orderDiff !== 0) return orderDiff;
          return (a.position?.name || "").localeCompare(b.position?.name || "");
        })
    : [];
  const positions =
    isTeacher || isStudent
      ? await prisma.position.findMany({
          select: { id: true, name: true, type: true },
          orderBy: { name: "asc" },
        })
      : [];
  const disciplines = isTeacher
    ? await prisma.discipline.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : [];
  const favoritePositionIds = isTeacher
    ? user.favoritePositions.map((fp) => fp.positionId)
    : isStudent
      ? user.studentFavoritePositions.map((fp) => fp.positionId)
      : [];
  const favoriteDisciplineIds = isTeacher
    ? user.favoriteDisciplines.map((fd) => fd.disciplineId)
    : [];
  const injuries = isStudent ? user.injuries ?? [] : [];
  const gameSessions = isStudent
    ? await prisma.gameSession.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
      })
    : [];

  const roleLabel = roleLabels[user.role] ?? user.role;
  const [firstNameDefault, ...restName] =
    (user.name ?? "")
      .trim()
      .split(" ")
      .filter(Boolean);
  const lastNameDefault = restName.join(" ");
  const displayName = user.name?.trim() || user.email;
  const currentDisplay = [firstNameDefault, lastNameDefault].filter(Boolean).join(" ") || displayName;
  const avatarPlaceholder = isTeacher ? TEACHER_AVATAR_PLACEHOLDER : STUDENT_AVATAR_PLACEHOLDER;
  const avatarUrl = resolveAvatarUrl({
    avatarPublicId: user.avatarPublicId,
    avatarUrl: null,
    placeholder: avatarPlaceholder,
  });

  const avatarFolder = process.env.NEXT_PUBLIC_CLOUDINARY_AVATAR_FOLDER ?? "poleapp/avatars";

  return (
    <main className="flex min-h-screen w-full flex-col gap-4">
      <section className="panel p-5 md:p-6">
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 overflow-hidden rounded-full border border-white/10 shadow-lg shadow-black/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl}
              alt={`Avatar de ${displayName}`}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="text-sm text-slate-300">
            <p className="text-base font-semibold text-white flex items-center gap-2">
              <span>{currentDisplay}</span>
              {user.age ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-slate-100">
                  {user.age} ans
                </span>
              ) : null}
            </p>
            <p className="text-xs text-slate-400">{user.email}</p>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span>École : {user.school?.name ?? "Non rattaché"}</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-slate-100">
                {roleLabel}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-slate-100">
                {user.isPremium ? "Premium" : "Gratuit"}
              </span>
            </p>
          </div>
        </div>

        {isStudent && (
          <div className="mt-6">
            <div className="mt-3 grid gap-6 sm:grid-cols-2">
              <div>
                <StudentPerformanceList
                  labelClassName="text-lg font-semibold text-white"
                  items={sortedProgression.map((p) => ({
                    positionId: p.positionId,
                    positionName: p.position?.name ?? "Position",
                    learningStatus: p.learningStatus,
                    updatedAt: p.updatedAt,
                    hasComment: Boolean(p.comment?.trim()),
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
                {favoritePositionIds.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {user.studentFavoritePositions
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

            <div className="mt-4 grid gap-6 sm:grid-cols-2 text-sm text-slate-200">
              <StudentPersistedSection
                id={`profile-injuries:${user.id}`}
                summary={
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-white">Blessures</h3>
                      <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[12px] font-semibold text-cyan-100">
                        {injuries.length}
                      </span>
                    </div>
                    <span className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white transition hover:border-cyan-300/70 hover:bg-white/10 group-open:border-white/15 group-open:bg-white/5">
                      <span className="group-open:hidden">Ouvrir</span>
                      <span className="hidden group-open:inline">Fermer</span>
                    </span>
                  </div>
                }
                defaultOpen={false}
              >
                <div className="mt-3 flex flex-col divide-y divide-white/5">
                  {injuries.length === 0 ? (
                    <p className="py-4 text-slate-300">Aucune blessure déclarée.</p>
                  ) : (
                    injuries.map((injury) => (
                      <article key={injury.id} className="py-3">
                        <p className="text-sm font-semibold text-white">
                          {injury.injuryType.name} ·{" "}
                          <span className={injury.isActive ? "text-amber-200" : "text-green-200"}>
                            {injury.isActive ? "Active" : "Résolue"}
                          </span>
                        </p>
                        {injury.notes && <p className="text-xs text-slate-200 mt-1">Notes : {injury.notes}</p>}
                      </article>
                    ))
                  )}
                </div>
              </StudentPersistedSection>

              <StudentPersistedSection
                id={`profile-games:${user.id}`}
                summary={
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-white">Mini-jeux</h3>
                      <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[12px] font-semibold text-cyan-100">
                        {gameSessions.length}
                      </span>
                    </div>
                    <span className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white transition hover:border-cyan-300/70 hover:bg-white/10 group-open:border-white/15 group-open:bg-white/5">
                      <span className="group-open:hidden">Ouvrir</span>
                      <span className="hidden group-open:inline">Fermer</span>
                    </span>
                  </div>
                }
                defaultOpen={false}
              >
                <div className="mt-3">
                  {gameSessions.length === 0 ? (
                    <p className="py-4 text-sm text-slate-300">Aucune session jouée pour le moment.</p>
                  ) : (
                    <ul className="divide-y divide-white/5 text-sm text-slate-200">
                      {gameSessions.map((g) => {
                        const accuracy =
                          g.totalQuestions > 0 ? Math.round((g.correctAnswers / g.totalQuestions) * 100) : 0;
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
                </div>
              </StudentPersistedSection>
            </div>
          </div>
        )}
      </section>

      <section className="panel p-6">
        <ProfileCollapsible
          id="edit-profile"
          eyebrow="Édition"
          heading="Mettre à jour ton profil"
        >
        <form action={updateProfileAction} className="mt-4 space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-200">Prénom</span>
            <input
              type="text"
              name="firstName"
              defaultValue={firstNameDefault}
              placeholder="Ton prénom"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-400 focus:border-cyan-400/70 focus:outline-none"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-200">Nom</span>
            <input
              type="text"
              name="lastName"
              defaultValue={lastNameDefault}
              placeholder="Ton nom de famille"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-400 focus:border-cyan-400/70 focus:outline-none"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-200">Âge (optionnel)</span>
            <input
              type="number"
              name="age"
              inputMode="numeric"
              min={1}
              max={120}
              defaultValue={user.age ?? ""}
              placeholder="Ex: 24"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-400 focus:border-cyan-400/70 focus:outline-none"
            />
          </label>

          {isTeacher && (
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-200">Diplômes (texte libre)</span>
              <textarea
                name="diplomas"
                defaultValue={user.diplomas ?? ""}
                rows={3}
                placeholder="Ex: BPJEPS AAN, Formation X, Certification Y…"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-400 focus:border-cyan-400/70 focus:outline-none"
              />
            </label>
          )}

          {(isTeacher || isStudent) && (
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-200">Positions coups de cœur</span>
              <select
                name="favoritePositions"
                multiple
                defaultValue={favoritePositionIds}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-400 focus:border-cyan-400/70 focus:outline-none"
              >
                {positions.map((position) => (
                  <option key={position.id} value={position.id}>
                    {position.name} ({position.type})
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-400">
                Maintiens Ctrl/Cmd (ou Maj) pour sélectionner plusieurs positions.
              </p>
            </label>
          )}

          {isTeacher && (
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-200">Disciplines favorites (max 5)</span>
              <select
                name="favoriteDisciplines"
                multiple
                defaultValue={favoriteDisciplineIds}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-400 focus:border-cyan-400/70 focus:outline-none"
              >
                {disciplines.map((discipline) => (
                  <option key={discipline.id} value={discipline.id}>
                    {discipline.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-400">
                Sélection multiple limitée à 5. Maintiens Ctrl/Cmd (ou Maj) pour choisir plusieurs disciplines.
              </p>
            </label>
          )}

          <p className="text-xs text-slate-400">
            Ce nom est affiché dans les listes, cours et messages. Les autres
            champs (email, rôle, école) restent informatifs et non éditables ici. L’âge est optionnel.
          </p>

          <div className="flex items-center justify-end gap-3">
            <button
              type="submit"
              className="rounded-full bg-cyan-500 px-4 py-2 font-semibold text-white transition hover:bg-cyan-400"
            >
              Enregistrer
            </button>
          </div>
        </form>
        </ProfileCollapsible>
      </section>

      <section className="panel p-6">
        <ProfileCollapsible
          id="avatar"
          eyebrow="Édition"
          heading="Photo de profil"
        >
          <AvatarManager
            folder={avatarFolder}
            initialUrl={avatarUrl}
            initialPublicId={user.avatarPublicId ?? null}
          />
          <p className="text-xs text-slate-400">
            Upload signé Cloudinary (restrict), formats jpg/png/webp, 4 Mo max. Laisse vide pour utiliser l’avatar neutre ({isTeacher ? "prof" : "élève"}).
          </p>
        </ProfileCollapsible>
      </section>

      {isTeacher && (
        <section className="panel p-6">
          <p className="text-sm uppercase tracking-[0.14em] text-cyan-200">
            Profil professeur
          </p>
          <h2 className="text-xl font-semibold text-white">Aperçu</h2>
          <div className="mt-3 space-y-3 text-sm text-slate-200">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                Diplômes
              </p>
              <p className="whitespace-pre-line rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
                {user.diplomas?.trim() || "Non renseigné"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                Positions coups de cœur
              </p>
              {favoritePositionIds.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {user.favoritePositions
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
                <p className="mt-1 text-sm text-slate-300">Aucune position préférée pour le moment.</p>
              )}
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                Disciplines favorites
              </p>
              {favoriteDisciplineIds.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {user.favoriteDisciplines
                    .filter((fav) => fav.discipline)
                    .map((fav) => (
                      <span
                        key={fav.disciplineId}
                        className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[12px] font-semibold text-white"
                      >
                        {fav.discipline?.name}
                      </span>
                    ))}
                </div>
              ) : (
                <p className="mt-1 text-sm text-slate-300">Aucune discipline favorite pour le moment.</p>
              )}
            </div>
          </div>
        </section>
      )}

    </main>
  );
}
