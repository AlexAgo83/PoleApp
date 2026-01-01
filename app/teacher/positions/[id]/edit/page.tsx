import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { SessionNavBar } from "@/components/SessionNavBar";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EditPositionForm } from "./EditPositionForm";
import { deletePositionAction } from "./action";

export const dynamic = "force-dynamic";

type Props = { params: { id: string } };

export default async function EditPositionPage({ params }: Props) {
  const awaitedParams = await params;
  if (!awaitedParams?.id) {
    notFound();
  }

  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!role || (role !== "TEACHER" && role !== "SCHOOL_ADMIN")) {
    redirect("/access-denied");
  }

  const position = await prisma.position.findUnique({
    where: { id: awaitedParams.id },
    include: { media: true, muscles: { include: { muscle: true } } },
  });

  if (!position) {
    notFound();
  }
  if (
    role === "TEACHER" &&
    (!position.createdByUserId || position.createdByUserId !== session.user.id)
  ) {
    redirect("/access-denied");
  }

  const [muscles, disciplinesRaw] = await Promise.all([
    prisma.muscle.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, kind: true },
    }),
    prisma.discipline.findMany({
      select: { id: true, name: true, color: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const fallbackDisciplines = [
    { id: "danse-fallback", name: "Danse" },
    { id: "pole-fallback", name: "Pole" },
    { id: "exotic-fallback", name: "Exotic" },
    { id: "souplesse-fallback", name: "Souplesse" },
    { id: "pilates-fallback", name: "Pilates" },
  ];
  const disciplines = (() => {
    const rows = (disciplinesRaw ?? []).map((d) => ({ ...d }));
    if (rows.length === 0 && position.discipline && !position.disciplineId) {
      rows.push({ id: "legacy-position", name: position.discipline });
    }
    return rows.length > 0 ? rows : fallbackDisciplines;
  })();
  const selectedMuscleIds = position.muscles.map((m) => m.muscleId);
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-4 px-2 py-6 md:gap-6 md:px-6 md:py-10">
      <SessionNavBar session={session} />
      <header className="panel p-4 md:p-6">
        <p className="text-xs uppercase tracking-[0.14em] text-indigo-100">
          Professeur / Admin
        </p>
        <h1 className="text-3xl font-semibold text-white">Éditer la position</h1>
        <p className="text-slate-200">
          Mets à jour les informations principales de la position. Les médias supplémentaires
          viendront plus tard.
        </p>
      </header>

      <section className="panel p-4 md:p-6">
        <EditPositionForm
          position={{
            id: position.id,
            name: position.name,
            description: position.description,
            type: position.type,
            levelRequired: position.levelRequired,
            disciplineId: position.disciplineId,
            discipline: position.discipline,
            grips: position.grips,
            tips: position.tips,
            contraindications: position.contraindications,
            media: position.media,
          }}
          muscles={muscles}
          disciplines={disciplines}
          selectedMuscleIds={selectedMuscleIds}
        />
      </section>

      <section className="panel border-red-500/30 bg-red-500/5 p-6">
        <h2 className="text-lg font-semibold text-white">Supprimer cette position</h2>
        <p className="text-sm text-slate-200">
          Action irréversible. Les liens cours/progression seront supprimés.
        </p>
        <form action={deletePositionAction} className="mt-4">
          <input type="hidden" name="positionId" value={position.id} />
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
