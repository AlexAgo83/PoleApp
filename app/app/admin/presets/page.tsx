"use server";

import Link from "next/link";
import { redirect } from "next/navigation";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { createPresetAdminAction, deletePresetAdminAction, updatePresetImageAdminAction } from "./actions";
import { SafeImage } from "@/components/SafeImage";
import { PresetCreateForm } from "@/components/PresetCreateForm";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";

type SearchParams =
  | { page?: string }
  | Promise<{ page?: string }>;

export default async function AdminPresetsPage({ searchParams }: { searchParams?: SearchParams }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SCHOOL_ADMIN" || !session.user.schoolId) {
    redirect("/access-denied");
  }

  const awaitedParams = (await Promise.resolve(searchParams)) ?? {};
  const page = Math.max(1, Number.parseInt(awaitedParams.page ?? "1", 10) || 1);
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
    <main className="flex min-h-screen w-full flex-col gap-6">
      <section className="panel space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Presets existants</h2>
          <Link
            href="/positions"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            Positions
          </Link>
        </div>
        {presets.length === 0 ? (
          <p className="text-slate-300">Aucun preset pour le moment.</p>
        ) : (
          <>
            <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {presets.map((preset) => (
                <li key={preset.id} className="flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-gradient-to-br from-[#1d1b3a]/80 via-[#1b2747]/70 to-[#152437]/80 p-4 shadow-lg shadow-indigo-900/30">
                  <div className="space-y-3">
                    {preset.imageUrl ? (
                      <div className="overflow-hidden rounded-xl border border-white/10 bg-black/30 aspect-[4/3]">
                        <SafeImage src={preset.imageUrl} alt={preset.title} className="h-full w-full object-cover" />
                      </div>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-white">
                      {preset.discipline ? (
                        <span className="rounded-full border border-indigo-300/60 bg-indigo-500/15 px-2 py-0.5">{preset.discipline}</span>
                      ) : null}
                      {preset.premiumRequired ? (
                        <span className="rounded-full border border-amber-300/60 bg-amber-500/15 px-2 py-0.5">Premium</span>
                      ) : preset.priceCredits ? (
                        <span className="rounded-full border border-cyan-300/60 bg-cyan-500/15 px-2 py-0.5">{preset.priceCredits} crédits</span>
                      ) : (
                        <span className="rounded-full border border-emerald-300/60 bg-emerald-500/15 px-2 py-0.5">Gratuit</span>
                      )}
                      {preset.createdBy ? (
                        <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-xs text-slate-200">
                          Créé par {preset.createdBy.name ?? preset.createdBy.email}
                        </span>
                      ) : null}
                    </div>
                    <div className="space-y-1">
                      <p className="text-lg font-semibold text-white">{preset.title}</p>
                      <p className="text-sm text-slate-300">{preset.description || "Pas de description"}</p>
                    </div>
                    {preset.positions.length > 0 ? (
                      <p className="text-xs text-slate-300">
                        Positions : {preset.positions.map((pp) => pp.position.name).join(", ")}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400">Aucune position liée.</p>
                    )}
                    <p className="text-xs text-slate-400">
                      Usage : {preset.usageCount} {preset.usageCount > 1 ? "fois" : "fois"}{" "}
                      {preset.lastUsedAt ? `(dernier : ${new Date(preset.lastUsedAt).toLocaleDateString("fr-FR")})` : "(jamais)"}
                    </p>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <form action={deletePresetAdminAction}>
                      <input type="hidden" name="id" value={preset.id} />
                      <ConfirmDeleteButton
                        type="submit"
                        className="rounded-full border border-red-300/60 bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-100 hover:border-red-200"
                      >
                        Supprimer
                      </ConfirmDeleteButton>
                    </form>
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

      <section className="panel space-y-4 p-5">
        <details className="group space-y-3">
          <summary className="flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-lg font-semibold text-white outline-none transition hover:text-cyan-100">
            <span>Créer un preset</span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-100 transition group-open:border-cyan-300/60 group-open:bg-cyan-500/15 group-open:text-cyan-50">
              <span className="group-open:hidden">Agrandir</span>
              <span className="hidden group-open:inline">Réduire</span>
              <span className="text-base transition-transform duration-150 group-open:rotate-90">▸</span>
            </span>
          </summary>
          <div className="pt-1">
            <PresetCreateForm
              positions={positions}
              disciplines={disciplines}
              teachers={teachers}
              action={createPresetAdminAction}
              currentUserLabel={`(Moi) ${session.user.name ?? session.user.email}`}
              maxPositions={16}
              showTeacherSelect
            />
          </div>
        </details>
      </section>
    </main>
  );
}
