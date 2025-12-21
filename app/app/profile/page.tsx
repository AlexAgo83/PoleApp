import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateProfileAction } from "./actions";

const roleLabels: Record<string, string> = {
  STUDENT: "Étudiant",
  TEACHER: "Professeur",
  SCHOOL_ADMIN: "Admin d'école",
};

const STUDENT_AVATAR_PLACEHOLDER =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCAxNjAgMTYwJz48cmVjdCB3aWR0aD0nMTYwJyBoZWlnaHQ9JzE2MCcgcng9JzgwJyBmaWxsPScjMWYyOTM3Jy8+PGNpcmNsZSBjeD0nODAnIGN5PSc2MCcgcj0nMzInIGZpbGw9JyMzMzQxNTUnLz48cGF0aCBkPSdNNDMgMTI1YzgtMjIgNjYtMjIgNzQgMCcgc3R5bGU9ImZpbGw6IzMzNDE1NSIvPjwvc3ZnPg==";
const TEACHER_AVATAR_PLACEHOLDER =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCAxNjAgMTYwJz48cmVjdCB3aWR0aD0nMTYwJyBoZWlnaHQ9JzE2MCcgcng9JzgwJyBmaWxsPScjMTExODI3Jy8+PGNpcmNsZSBjeD0nODAnIGN5PSc2MCcgcj0nMzInIGZpbGw9JyMyMjI5MzgnLz48dGV4dCB4PSc4MCcgeT0nMTEwJyBzdHlsZT0iZmlsbDojZjZmN2ZmO2ZvbnQtd2VpZ2h0OjcwO2ZvbnQtc2l6ZToxNHB4O2ZvbnQtZmFtaWx5OnNhbnMtc2VyaWY7ZG9taW5hbnQtYmFzZWxpbmU6bWlkZGxlO3RleHQtYW5jaG9yOm1pZGRsZSI+UHJvZjwvdGV4dD48L3N2Zz4=";

export default async function ProfilePage() {
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
    },
  });

  if (!user) {
    redirect("/login");
  }

  const isTeacher = user.role === "TEACHER";
  const positions = isTeacher
    ? await prisma.position.findMany({
        select: { id: true, name: true, type: true },
        orderBy: { name: "asc" },
      })
    : [];
  const favoritePositionIds = user.favoritePositions.map((fp) => fp.positionId);

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
  const avatarUrl =
    user.avatarUrl?.trim() ||
    (isTeacher ? TEACHER_AVATAR_PLACEHOLDER : STUDENT_AVATAR_PLACEHOLDER);

  return (
    <main className="mx-auto grid max-w-4xl gap-6">
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

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-200">Photo (URL)</span>
            <input
              type="url"
              name="avatarUrl"
              defaultValue={user.avatarUrl ?? ""}
              placeholder="https://…"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-400 focus:border-cyan-400/70 focus:outline-none"
            />
            <p className="text-xs text-slate-400">
              Laisse vide pour utiliser l’avatar neutre ({isTeacher ? "prof" : "élève"}).
            </p>
          </label>

          {isTeacher && (
            <>
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
            </>
          )}

          <p className="text-xs text-slate-400">
            Ce nom est affiché dans les listes, cours et messages. Les autres
            champs (email, rôle, école) restent informatifs et non éditables ici. L’âge est optionnel.
          </p>

          <div className="flex items-center justify-end gap-3">
            <button
              type="submit"
              className="rounded-full bg-cyan-500 px-4 py-2 font-semibold text-slate-900 transition hover:bg-cyan-400"
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
