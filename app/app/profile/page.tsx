import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AVATAR_PLACEHOLDER } from "@/lib/placeholders";
import { resolveAvatarUrl } from "@/lib/avatar";
import { AvatarUploadField } from "@/components/AvatarUploadField";
import { updateProfileAction } from "./actions";

const roleLabels: Record<string, string> = {
  STUDENT: "Étudiant",
  TEACHER: "Professeur",
  SCHOOL_ADMIN: "Admin d'école",
};

const STUDENT_AVATAR_PLACEHOLDER = AVATAR_PLACEHOLDER;
const TEACHER_AVATAR_PLACEHOLDER = AVATAR_PLACEHOLDER;

export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: Promise<{ saved?: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/app/profile");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      school: true,
      favoritePositions: {
        include: { position: true },
      },
      studentFavoritePositions: {
        include: { position: true },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  const isTeacher = user.role === "TEACHER";
  const isStudent = user.role === "STUDENT";
  const positions =
    isTeacher || isStudent
      ? await prisma.position.findMany({
          select: { id: true, name: true, type: true },
          orderBy: { name: "asc" },
        })
      : [];
  const favoritePositionIds = isTeacher
    ? user.favoritePositions.map((fp) => fp.positionId)
    : isStudent
      ? user.studentFavoritePositions.map((fp) => fp.positionId)
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
  const ageLabel = user.age ? `${user.age} ans` : "Non renseigné";
  const avatarPlaceholder = isTeacher ? TEACHER_AVATAR_PLACEHOLDER : STUDENT_AVATAR_PLACEHOLDER;
  const avatarUrl = resolveAvatarUrl({
    avatarPublicId: user.avatarPublicId,
    avatarUrl: user.avatarUrl,
    placeholder: avatarPlaceholder,
  });

  const resolvedSearch = (await searchParams) ?? {};
  const saved = resolvedSearch.saved === "1";
  const avatarFolder = process.env.NEXT_PUBLIC_CLOUDINARY_AVATAR_FOLDER ?? "poleapp/avatars";

  return (
    <main className="flex min-h-screen w-full flex-col gap-4">
      <section className="panel p-6">
        <p className="text-sm uppercase tracking-[0.14em] text-cyan-200">
          Profil
        </p>
        <h1 className="text-2xl font-semibold text-white">
          Informations du compte
        </h1>
        <p className="text-slate-300">
          Mets à jour ton profil (nom, âge, photo). Les autres champs restent informatifs
          et liés à ton compte existant.
        </p>
        <div className="mt-4 flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarUrl}
            alt={`Avatar de ${displayName}`}
            className="h-16 w-16 rounded-full border border-white/10 object-cover shadow-lg shadow-black/30"
          />
          <div className="text-sm text-slate-300">
            <p>{user.avatarUrl ? "Photo personnalisée" : "Placeholder appliqué"}</p>
            <p className="text-xs text-slate-400">Modifie ta photo plus bas.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <InfoRow label="Email" value={user.email} />
          <InfoRow label="Rôle" value={roleLabel} />
          <InfoRow label="École" value={user.school?.name ?? "Non rattaché"} />
          <InfoRow
            label="Abonnement"
            value={user.isPremium ? "Premium" : "Gratuit"}
          />
          <InfoRow label="Âge" value={ageLabel} />
        </div>
        <div className="mt-4 flex justify-end">
          <Link
            href="/app/student"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-2 text-sm font-semibold text-white/90 transition hover:border-indigo-300/70 hover:text-white"
          >
            ← Retour accueil
          </Link>
        </div>
      </section>

      <section className="panel p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.14em] text-cyan-200">
                Édition
              </p>
              <h2 className="text-xl font-semibold text-white">
                Mettre à jour ton profil
              </h2>
              <p className="text-xs text-slate-300">
                Nom affiché actuellement : <span className="font-semibold text-white">{currentDisplay}</span>
              </p>
            </div>
          </div>

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

          <div className="space-y-2">
            <span className="text-sm font-medium text-slate-200">Photo de profil</span>
            <AvatarUploadField
              folder={avatarFolder}
              currentUrl={user.avatarUrl ?? undefined}
              currentPublicId={user.avatarPublicId ?? undefined}
              maxSizeMB={2}
            />
            <p className="text-xs text-slate-400">
              Upload signé Cloudinary (restrict), formats jpg/png/webp, 2 Mo max. Laisse vide pour utiliser l’avatar neutre ({isTeacher ? "prof" : "élève"}).
            </p>
          </div>

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
              <span className="text-sm font-medium text-slate-200">Positions préférées</span>
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
                Positions préférées
              </p>
              {favoritePositionIds.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {user.favoritePositions.map((fav) => (
                    <span
                      key={fav.positionId}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[12px] font-semibold text-white"
                    >
                      {fav.position.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-sm text-slate-300">Aucune position préférée pour le moment.</p>
              )}
            </div>
          </div>
        </section>
      )}

      {isStudent && (
        <section className="panel p-6">
          <p className="text-sm uppercase tracking-[0.14em] text-cyan-200">
            Profil élève
          </p>
          <h2 className="text-xl font-semibold text-white">Préférences</h2>
          <div className="mt-3 space-y-3 text-sm text-slate-200">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                Positions préférées
              </p>
              {favoritePositionIds.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {user.studentFavoritePositions.map((fav) => (
                    <span
                      key={fav.positionId}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[12px] font-semibold text-white"
                    >
                      {fav.position.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-sm text-slate-300">Aucune position préférée pour le moment.</p>
              )}
            </div>
          </div>
        </section>
      )}

      {saved && (
        <div className="fixed bottom-4 right-4 z-30 rounded-xl border border-emerald-300/60 bg-emerald-600/85 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/40">
          Profil mis à jour.
        </div>
      )}
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-300">
        {label}
      </p>
      <p className="text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
