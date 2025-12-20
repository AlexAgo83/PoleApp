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

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/app/profile");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { school: true },
  });

  if (!user) {
    redirect("/login");
  }

  const roleLabel = roleLabels[user.role] ?? user.role;
  const [firstNameDefault, ...restName] =
    (user.name ?? "")
      .trim()
      .split(" ")
      .filter(Boolean);
  const lastNameDefault = restName.join(" ");
  const displayName = user.name?.trim() || user.email;
  const currentDisplay = [firstNameDefault, lastNameDefault].filter(Boolean).join(" ") || displayName;

  return (
    <main className="mx-auto grid max-w-4xl gap-6">
      <section className="panel p-6">
        <p className="text-sm uppercase tracking-[0.14em] text-cyan-200">
          Profil
        </p>
        <p className="mt-1 text-lg font-semibold text-white">
          Bonjour {displayName},
        </p>
        <h1 className="text-2xl font-semibold text-white">
          Informations du compte
        </h1>
        <p className="text-slate-300">
          Consulte ou mets à jour ton nom d&apos;affichage (prénom / nom). Les autres
          champs sont informatifs et liés à ton compte existant.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <InfoRow label="Email" value={user.email} />
          <InfoRow label="Rôle" value={roleLabel} />
          <InfoRow label="École" value={user.school?.name ?? "Non rattaché"} />
          <InfoRow
            label="Abonnement"
            value={user.isPremium ? "Premium" : "Gratuit"}
          />
        </div>
      </section>

      <section className="panel p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/gear.svg" alt="" className="h-4 w-4" />
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

          <p className="text-xs text-slate-400">
            Ce nom est affiché dans les listes, cours et messages. Les autres
            champs (email, rôle, école) restent informatifs et non éditables ici.
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
