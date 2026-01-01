import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { FoxPageHeader } from "@/components/FoxPageHeader";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { NewPositionForm } from "./NewPositionForm";

export default async function NewPositionPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!role || (role !== "TEACHER" && role !== "SCHOOL_ADMIN")) {
    redirect("/access-denied");
  }
  const isAdmin = role === "SCHOOL_ADMIN";
  const homeHref = isAdmin ? "/app/admin" : "/app/teacher";
  const eyebrow = isAdmin ? "Espace admin" : "Espace prof";

  const [muscles, disciplinesRaw, courseDisciplines] = await Promise.all([
    prisma.muscle.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, kind: true },
    }),
    prisma.discipline.findMany({
      select: { id: true, name: true, color: true },
      orderBy: { name: "asc" },
    }),
    prisma.course.findMany({
      where: { schoolId: session.user.schoolId ?? undefined },
      select: { discipline: true },
      distinct: ["discipline"],
    }),
  ]);

  const fallbackDisciplines = [
    { name: "Pole" },
    { name: "Pole Exotic" },
    { name: "Souplesse" },
    { name: "Pilates" },
    { name: "Conditioning" },
  ];
  const disciplines = (() => {
    const rows = (disciplinesRaw ?? []).map((d) => ({ ...d }));
    const legacy = courseDisciplines
      .map((c) => c.discipline)
      .filter((d): d is string => Boolean(d && d.trim().length > 0))
      .map((d) => ({ name: d.trim(), color: undefined as string | undefined }));
    const merged: { name: string; color?: string; id?: string }[] = [...rows];
    legacy.forEach((d) => {
      if (!merged.some((m) => m.name.toLowerCase() === d.name.toLowerCase())) {
        merged.push(d);
      }
    });
    return merged.length > 0 ? merged : fallbackDisciplines;
  })();

  return (
    <main className="flex min-h-screen w-full flex-col gap-4">
      <FoxPageHeader
        title="Créer une position"
        eyebrow={eyebrow}
        foxHref={homeHref}
        buttons={[
          { label: "Mon espace", href: homeHref, icon: <img src="/house.svg" alt="" className="h-4 w-4" /> },
          { label: "Déconnexion", href: "/api/auth/signout" },
        ]}
      />

      <div className="mx-auto w-full max-w-6xl px-2 pb-6 md:px-8">
        <section className="panel space-y-3 p-4 md:p-6">
          <h2 className="text-lg font-semibold text-white">Créer une nouvelle position</h2>
          <NewPositionForm muscles={muscles} disciplines={disciplines} />
        </section>
      </div>
    </main>
  );
}
