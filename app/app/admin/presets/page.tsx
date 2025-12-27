"use server";

import Link from "next/link";
import { redirect } from "next/navigation";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { createPresetAdminAction, deletePresetAdminAction, updatePresetImageAdminAction } from "./actions";
import { SafeImage } from "@/components/SafeImage";

export default async function AdminPresetsPage({ searchParams }: { searchParams?: { page?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SCHOOL_ADMIN" || !session.user.schoolId) {
    redirect("/access-denied");
  }

  const page = Math.max(1, Number.parseInt(searchParams?.page ?? "1", 10) || 1);
  const take = 10;
  const skip = (page - 1) * take;

  const [positions, presets, disciplines, teachers] = await Promise.all([
    prisma.position.findMany({
      select: { id: true, name: true, discipline: true },
      orderBy: { name: "asc" },
      take: 30,
    }),
    prisma.preset.findMany({
      where: { schoolId: session.user.schoolId },
      include: {
        positions: { include: { position: { select: { name: true } } } },
        createdBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.discipline
      .findMany({
        where: { schoolId: session.user.schoolId },
        select: { name: true },
        orderBy: { name: "asc" },
      })
      .catch(() => []),
    prisma.user.findMany({
      where: { schoolId: session.user.schoolId, role: "TEACHER" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const totalPresets = await prisma.preset.count({ where: { schoolId: session.user.schoolId } });
  const totalPages = Math.max(1, Math.ceil(totalPresets / take));

  return (
    <main className="px-4 py-6 text-white">
      <section className="panel space-y-2 p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-indigo-100">Espace admin</p>
            <h1 className="text-2xl font-semibold">Presets / combos</h1>
            <p className="text-sm text-slate-300">Créer et gérer les presets vidéo (premium ou en crédits) de l’école.</p>
          </div>
          <Link
            href="/app/admin"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-normal text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            ← Retour dashboard
          </Link>
        </div>
      </section>

      <section className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="panel space-y-4 p-5">
          <h2 className="text-lg font-semibold text-white">Créer un preset</h2>
          <form action={createPresetAdminAction} className="space-y-4">
            <label className="text-sm text-slate-200">
              Titre
              <input
                name="title"
                required
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              />
            </label>
            <label className="text-sm text-slate-200">
              Discipline
              <select name="discipline" className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400">
                <option value="">(Optionnel)</option>
                {disciplines.map((d) => (
                  <option key={d.name} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-200">
              Description
              <textarea
                name="description"
                rows={3}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              />
            </label>
            <label className="text-sm text-slate-200">
              Lien vidéo
              <input
                name="videoUrl"
                type="url"
                placeholder="https://..."
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              />
            </label>
            <label className="text-sm text-slate-200">
              Image (URL)
              <input
                name="imageUrl"
                type="url"
                placeholder="https://…"
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              />
              <span className="text-xs text-slate-400">Facultatif. Une image rendra la carte plus lisible dans le catalogue.</span>
            </label>
            <label className="text-sm text-slate-200">
              Professeur (créateur)
              <select
                name="teacherId"
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
                defaultValue=""
              >
                <option value="">(Moi) {session.user.name ?? session.user.email}</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name ?? t.email}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-200">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" name="premiumRequired" className="h-4 w-4" />
                <span>Premium requis</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <span>Prix crédits</span>
                <input
                  name="priceCredits"
                  type="number"
                  min={0}
                  placeholder="ex: 150"
                  className="w-24 rounded-lg border border-white/10 bg-white/10 px-2 py-1 text-white outline-none focus:border-cyan-400"
                />
              </label>
            </div>
            <div className="text-sm text-slate-200">
              <p className="text-xs uppercase tracking-[0.12em] text-indigo-100">Positions incluses (max 6)</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {positions.slice(0, 16).map((p) => (
                  <label key={p.id} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1">
                    <input type="checkbox" name="positionIds" value={p.id} className="h-4 w-4" />
                    <span className="text-sm text-white">{p.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <button
              type="submit"
              className="rounded-full border border-cyan-300/60 bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-white hover:border-cyan-200"
            >
              Créer
            </button>
          </form>
        </section>

        <section className="panel space-y-3 p-5">
          <h2 className="text-lg font-semibold text-white">Presets existants</h2>
          {presets.length === 0 ? (
            <p className="text-slate-300">Aucun preset pour le moment.</p>
          ) : (
            <>
              <ul className="space-y-2">
                {presets.map((preset) => (
                  <li key={preset.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <div className="flex flex-col gap-3">
                      {preset.imageUrl ? (
                        <div className="overflow-hidden rounded-lg border border-white/10 bg-black/20">
                          <SafeImage src={preset.imageUrl} alt={preset.title} className="h-36 w-full object-cover" />
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
                    <form action={updatePresetImageAdminAction} className="flex flex-wrap items-center gap-2">
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
                        <form action={deletePresetAdminAction}>
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
              <div className="mt-3 flex items-center justify-between text-sm text-slate-300">
                <span>
                  Page {page} / {totalPages} · {totalPresets} presets
                </span>
                <div className="flex items-center gap-2">
                  {page > 1 && (
                    <Link
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:border-cyan-300/60 hover:bg-cyan-500/20"
                      href={`?page=${Math.max(1, page - 1)}`}
                    >
                      Précédent
                    </Link>
                  )}
                  {page < totalPages && (
                    <Link
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:border-cyan-300/60 hover:bg-cyan-500/20"
                      href={`?page=${Math.min(totalPages, page + 1)}`}
                    >
                      Suivant
                    </Link>
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      </section>
    </main>
  );
}
