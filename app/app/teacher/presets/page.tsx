"use server";

import Link from "next/link";
import { redirect } from "next/navigation";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { createPresetAction, deletePresetAction, updatePresetImageAction } from "./actions";
import { SafeImage } from "@/components/SafeImage";
import { PresetCreateForm } from "@/components/PresetCreateForm";

export default async function TeacherPresetsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !session.user.schoolId || (session.user.role !== "TEACHER" && session.user.role !== "SCHOOL_ADMIN")) {
    redirect("/access-denied");
  }

  const [positions, presets, disciplines] = await Promise.all([
    prisma.position.findMany({
      select: { id: true, name: true, discipline: true },
      orderBy: { name: "asc" },
      take: 20,
    }),
    prisma.preset.findMany({
      where: { schoolId: session.user.schoolId },
      include: {
        positions: { include: { position: { select: { name: true } } } },
        createdBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.discipline
      .findMany({
        where: { schoolId: session.user.schoolId },
        select: { name: true },
        orderBy: { name: "asc" },
      })
      .catch(() => []),
  ]);

  return (
    <main className="flex min-h-screen w-full flex-col gap-4">
      <section className="panel flex flex-wrap items-center justify-between gap-3 border-indigo-400/25 p-4 shadow-indigo-900/30 md:p-6">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.14em] text-indigo-100">Espace prof</p>
          <h1 className="text-2xl font-semibold text-white md:text-2xl">Presets / combos</h1>
          <p className="text-sm text-slate-300 leading-6">Crée des combos vidéo premium ou achetables en crédits.</p>
        </div>
        <Link
          href="/app/teacher"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-normal text-white transition hover:border-cyan-400/70 hover:bg-white/10"
        >
          ← Retour accueil
        </Link>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="panel space-y-4 p-5">
          <h2 className="text-lg font-semibold text-white">Créer un preset</h2>
          <PresetCreateForm
            positions={positions}
            disciplines={disciplines}
            action={createPresetAction}
            currentUserLabel={`(Moi) ${session.user.name ?? session.user.email}`}
            maxPositions={12}
            showTeacherSelect={false}
          />
        </section>

        <section className="panel space-y-4 p-5">
          <h2 className="text-lg font-semibold text-white">Presets existants</h2>
          {presets.length === 0 ? (
            <p className="text-slate-300">Aucun preset pour le moment.</p>
          ) : (
            <ul className="space-y-2">
              {presets.map((preset) => (
                <li key={preset.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="flex flex-col gap-3">
                    {preset.imageUrl ? (
                      <div className="overflow-hidden rounded-lg border border-white/10 bg-black/20">
                        <SafeImage src={preset.imageUrl} alt={preset.title} className="h-32 w-full object-cover" />
                      </div>
                    ) : null}
                    <div className="space-y-1">
                      <p className="text-lg font-semibold text-white">{preset.title}</p>
                      <p className="text-sm text-slate-300">{preset.description || "Pas de description"}</p>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-white">
                        {preset.discipline ? (
                          <span className="rounded-full border border-indigo-300/60 bg-indigo-500/15 px-2 py-0.5">
                            {preset.discipline}
                          </span>
                        ) : null}
                        {preset.premiumRequired ? (
                          <span className="rounded-full border border-amber-300/60 bg-amber-500/15 px-2 py-0.5">Premium</span>
                        ) : preset.priceCredits ? (
                          <span className="rounded-full border border-cyan-300/60 bg-cyan-500/15 px-2 py-0.5">
                            {preset.priceCredits} crédits
                          </span>
                        ) : (
                          <span className="rounded-full border border-slate-300/40 bg-slate-500/20 px-2 py-0.5">Gratuit</span>
                        )}
                        {preset.createdBy ? (
                          <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-xs text-slate-200">
                            Créé par {preset.createdBy.name ?? preset.createdBy.email}
                          </span>
                        ) : null}
                      </div>
                      {preset.positions.length > 0 ? (
                        <p className="text-xs text-slate-300">
                          Positions : {preset.positions.map((pp) => pp.position.name).join(", ")}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400">Aucune position liée.</p>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      Usage : {preset.usageCount} {preset.usageCount > 1 ? "fois" : "fois"}{" "}
                      {preset.lastUsedAt ? `(dernier : ${new Date(preset.lastUsedAt).toLocaleDateString("fr-FR")})` : "(jamais)"}
                    </div>
                    <form action={updatePresetImageAction} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={preset.id} />
                      <input
                        type="url"
                        name="imageUrl"
                        defaultValue={preset.imageUrl ?? ""}
                        placeholder="URL image"
                        className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                      />
                      <button
                        type="submit"
                        className="rounded-full border border-cyan-300/60 bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold text-white hover:border-cyan-200"
                      >
                        Mettre à jour l’image
                      </button>
                    </form>
                    <div className="flex justify-end">
                      <form action={deletePresetAction}>
                        <input type="hidden" name="id" value={preset.id} />
                        <button
                          type="submit"
                          className="rounded-full border border-red-300/60 bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-100 hover:border-red-200"
                        >
                          Supprimer
                        </button>
                      </form>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>
    </main>
  );
}
