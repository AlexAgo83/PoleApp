"use server";

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PresetCreateForm } from "@/components/PresetCreateForm";
import { createPresetAction } from "../actions";

export default async function NewPresetPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !session.user.schoolId || (session.user.role !== "TEACHER" && session.user.role !== "SCHOOL_ADMIN")) {
    redirect("/access-denied");
  }

  const [positions, disciplines, teachers] = await Promise.all([
    prisma.position.findMany({
      select: { id: true, name: true, discipline: true, disciplineId: true },
      orderBy: { name: "asc" },
      take: 50,
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
    <main className="flex min-h-screen w-full flex-col gap-6">
      <section className="panel space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-white">Créer un preset</h1>
            <p className="text-sm text-slate-300">Associe une vidéo, une image et des positions pour ton combo.</p>
          </div>
        </div>
        <PresetCreateForm
          positions={positions}
          disciplines={disciplines}
          teachers={session.user.role === "SCHOOL_ADMIN" ? teachers : undefined}
          action={createPresetAction}
          currentUserLabel={`(Moi) ${session.user.name ?? session.user.email}`}
          maxPositions={12}
          showTeacherSelect={session.user.role === "SCHOOL_ADMIN"}
        />
      </section>
    </main>
  );
}
