import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { updateSettingsAction } from "../actions";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SuperAdminPreferencesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/access-denied");
  }

  const [settings, schools] = await Promise.all([
    prisma.globalSetting.upsert({
      where: { id: "global" },
      update: {},
      create: {
        id: "global",
        defaultVatPercent: 20,
        currency: "EUR",
        timezone: process.env.GLOBAL_TIMEZONE || "Europe/Paris",
        icsDefaultAlarmMinutes: 30,
      },
    }),
    prisma.school.findMany({
      orderBy: { name: "asc" },
      include: { users: { where: { role: "SCHOOL_ADMIN" }, select: { id: true } } },
    }),
  ]);

  const activeSchools = schools.filter((s) => !s.archivedAt).length;

  return (
    <main className="grid gap-4 md:gap-6">
      <section className="panel border-cyan-300/25 p-5 shadow-cyan-900/30">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-cyan-200">Paramètres globaux</p>
            <h2 className="text-xl font-semibold text-white">TVA & devise</h2>
            <p className="text-sm text-slate-300">
              Paramètres appliqués aux offres globales (abonnements/packs). TVA par défaut utilisée pour les nouveaux items.
            </p>
          </div>
          <dl className="grid gap-2 text-sm text-slate-200 md:grid-cols-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
              <dt className="sr-only">Écoles actives</dt>
              <span>Écoles actives</span>
              <dd className="text-white font-semibold">{activeSchools}</dd>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
              <dt className="sr-only">Admins d&apos;écoles</dt>
              <span>Admins d&apos;écoles</span>
              <dd className="text-white font-semibold">
                {schools.reduce((acc, s) => acc + s.users.length, 0)}
              </dd>
            </div>
          </dl>
        </div>

        <form action={updateSettingsAction} className="mt-4 grid gap-3 md:grid-cols-4">
          <input type="hidden" name="redirectTo" value="/super-admin/preferences" />
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-200">Devise</span>
            <input
              name="currency"
              defaultValue={settings.currency}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-cyan-400/70 focus:outline-none"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-200">TVA (%)</span>
            <input
              name="vatPercent"
              type="number"
              min={0}
              max={100}
              defaultValue={settings.defaultVatPercent}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-cyan-400/70 focus:outline-none"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-200">Timezone globale</span>
            <input
              name="timezone"
              defaultValue={settings.timezone || "Europe/Paris"}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-cyan-400/70 focus:outline-none"
              placeholder="Europe/Paris"
            />
            <p className="text-xs text-slate-400">
              Utilisée pour les exports ICS / affichages serveur (les utilisateurs voient l&apos;horaire converti).
            </p>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-200">Alerte ICS par défaut (min)</span>
            <input
              name="icsDefaultAlarmMinutes"
              type="number"
              min={0}
              max={10_080}
              defaultValue={settings.icsDefaultAlarmMinutes ?? 30}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-cyan-400/70 focus:outline-none"
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-xl border border-cyan-400/60 bg-cyan-500/20 px-3 py-2 font-semibold text-white transition hover:border-cyan-300/80 hover:bg-cyan-500/30"
            >
              Mettre à jour
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
