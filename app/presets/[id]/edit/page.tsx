"use server";

import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { FoxPageHeader } from "@/components/FoxPageHeader";
import { PresetCreateForm } from "@/components/PresetCreateForm";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { deletePresetAction, updatePresetAction } from "../../actions";

export default async function EditPresetPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: Promise<{ flash?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !session.user.schoolId || (session.user.role !== "TEACHER" && session.user.role !== "SCHOOL_ADMIN")) {
    redirect("/access-denied");
  }

  const awaitedParams = await params;
  if (!awaitedParams?.id) notFound();
  const preset = await prisma.preset.findUnique({
    where: { id: awaitedParams.id },
    include: {
      positions: { select: { positionId: true, position: { select: { id: true, name: true, discipline: true, disciplineId: true } } } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
  if (!preset || preset.schoolId !== session.user.schoolId) redirect("/access-denied");

  const canEdit = session.user.role === "SCHOOL_ADMIN" || preset.createdByUserId === session.user.id;
  if (!canEdit) redirect("/access-denied");

  const [positions, disciplines, teachers] = await Promise.all([
    prisma.position.findMany({
      select: { id: true, name: true, discipline: true, disciplineId: true },
      orderBy: { name: "asc" },
      take: 80,
    }),
    prisma.discipline
      .findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
      .catch(() => []),
    session.user.role === "SCHOOL_ADMIN"
      ? prisma.user.findMany({
          where: { schoolId: session.user.schoolId, role: "TEACHER" },
          select: { id: true, name: true, email: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const presetPositions = preset.positions.map((pp) => pp.position);
  const mergedPositions = Array.from(new Map([...positions, ...presetPositions].map((p) => [p.id, p])).values());

  const awaitedSearch = searchParams ? await searchParams : undefined;
  const flash = awaitedSearch?.flash ?? "";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 px-2 pt-0 pb-2 md:gap-6 md:px-8 md:pt-0 md:pb-4">
      <FoxPageHeader
        eyebrow={
          session.user.role === "SCHOOL_ADMIN"
            ? "Espace admin"
            : session.user.role === "TEACHER"
              ? "Espace prof"
              : "Espace élève"
        }
        title="Modifier un combo"
        buttons={[
          {
            label: "Retour",
            href: `/presets/${preset.id}`,
          },
        ]}
      />
      <section className="panel space-y-4 p-4 md:p-6 lg:p-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold text-white">Modifier un combo</h1>
          <p className="text-sm text-slate-300">Ajuste la vidéo, l’image et les positions du preset.</p>
        </div>
        {flash === "invalid" ? (
          <p className="rounded-lg border border-amber-300/60 bg-amber-500/15 px-3 py-2 text-sm font-semibold text-amber-50">
            Formulaire incomplet. Vérifie au moins un titre et une position sélectionnée.
          </p>
        ) : null}
        <PresetCreateForm
          positions={mergedPositions}
          disciplines={disciplines}
          teachers={session.user.role === "SCHOOL_ADMIN" ? teachers : undefined}
          action={updatePresetAction}
          currentUserLabel={`(Moi) ${session.user.name ?? session.user.email}`}
          maxPositions={12}
          showTeacherSelect={session.user.role === "SCHOOL_ADMIN"}
          initialPreset={{
            id: preset.id,
            title: preset.title,
            description: preset.description,
            discipline: preset.discipline,
            disciplineId: preset.disciplineId ?? undefined,
            videoPublicId: preset.videoPublicId ?? undefined,
            imagePublicId: preset.imagePublicId ?? undefined,
            premiumRequired: preset.premiumRequired ?? false,
            priceCredits: preset.priceCredits ?? undefined,
            positionIds: preset.positions.map((pp) => pp.positionId),
            teacherId: preset.createdByUserId ?? undefined,
          }}
          submitLabel="Enregistrer"
        />
      </section>

      <section className="panel border-red-500/30 bg-red-500/5 p-4 md:p-6 lg:p-8">
        <h2 className="text-lg font-semibold text-white">Supprimer ce combo</h2>
        <p className="text-sm text-slate-200">
          Action irréversible. Les associations de positions seront supprimées.
        </p>
        <form action={deletePresetAction} className="mt-4">
          <input type="hidden" name="presetId" value={preset.id} />
          <ConfirmDeleteButton
            type="submit"
            className="inline-flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400"
          >
            Supprimer
          </ConfirmDeleteButton>
        </form>
      </section>
    </main>
  );
}
