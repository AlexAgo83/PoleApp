import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { NewPositionForm } from "./NewPositionForm";

export default async function NewPositionPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!role || (role !== "TEACHER" && role !== "SCHOOL_ADMIN")) {
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
    { id: "pole-fallback", name: "Pole" },
    { id: "exotic-fallback", name: "Exotic" },
    { id: "souplesse-fallback", name: "Souplesse" },
    { id: "pilates-fallback", name: "Pilates" },
    { id: "conditioning-fallback", name: "Conditioning" },
  ];
  const disciplines = disciplinesRaw.length > 0 ? disciplinesRaw : fallbackDisciplines;

  return (
    <div className="mx-auto w-full max-w-6xl px-2 pb-6 md:px-8">
      <section className="panel mt-2 space-y-3 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">Créer une nouvelle position</h1>
        </div>
        <NewPositionForm muscles={muscles} disciplines={disciplines} />
      </section>
    </div>
  );
}
