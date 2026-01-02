"use server";

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FoxPageHeader } from "@/components/FoxPageHeader";
import { PresetCreateForm } from "@/components/PresetCreateForm";
import { createPresetAction } from "../actions";

export default async function NewPresetPage({ searchParams }: { searchParams?: Promise<{ flash?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !session.user.schoolId || (session.user.role !== "TEACHER" && session.user.role !== "SCHOOL_ADMIN")) {
    redirect("/access-denied");
  }

  const awaitedSearch = searchParams ? await searchParams : undefined;
  const flash = awaitedSearch?.flash ?? "";

  const [positions, disciplines, teachers] = await Promise.all([
    prisma.position.findMany({
      select: { id: true, name: true, discipline: true, disciplineId: true },
      orderBy: { name: "asc" },
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
        title="Créer un combo"
        buttons={[
          {
            label: "Retour",
            href: "/presets",
          },
        ]}
      />
      <section className="panel space-y-4 p-4 md:p-6 lg:p-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold text-white">Créer un combo</h1>
          <p className="text-sm text-slate-300">
            Associe une vidéo, une image et des positions pour ton combo.
          </p>
        </div>
        {flash === "invalid" ? (
          <p className="rounded-lg border border-amber-300/60 bg-amber-500/15 px-3 py-2 text-sm font-semibold text-amber-50">
            Formulaire incomplet. Vérifie au moins un titre et une position sélectionnée.
          </p>
        ) : null}
        <PresetCreateForm
          positions={positions}
          disciplines={disciplines}
          teachers={session.user.role === "SCHOOL_ADMIN" ? teachers : undefined}
          action={createPresetAction}
          currentUserLabel={`(Moi) ${session.user.name ?? session.user.email}`}
          showTeacherSelect={session.user.role === "SCHOOL_ADMIN"}
        />
      </section>
    </main>
  );
}
