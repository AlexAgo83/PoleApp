import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { SessionNavBar } from "@/components/SessionNavBar";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { NewPositionForm } from "./NewPositionForm";

export default async function NewPositionPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!role || (role !== "TEACHER" && role !== "SCHOOL_ADMIN")) {
    redirect("/access-denied");
  }

  const [muscles, disciplinesRaw, courseDisciplines] = await Promise.all([
    prisma.muscle.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, kind: true },
    }),
    prisma.discipline.findMany({
      where: { schoolId: session.user.schoolId ?? undefined },
      select: { name: true, color: true },
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
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-4 px-2 py-6 md:gap-6 md:px-6 md:py-10">
      <SessionNavBar session={session} />
      <header className="panel flex flex-wrap items-start justify-between gap-3 p-4 md:p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">
            Professeur / Admin
          </p>
          <h1 className="text-3xl font-semibold text-white">Créer une position</h1>
          <p className="text-slate-300">
            Formulaire léger pour alimenter la base. Les médias supplémentaires et
            l’édition seront ajoutés plus tard.
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/80">
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
              Nom + Type
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
              Niveau requis
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
              Grips (optionnel)
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
              Médias ajoutés après création
            </span>
          </div>
        </div>
        <div className="flex w-full justify-end">
          <Link
            href="/positions"
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            ← Retour positions
          </Link>
        </div>
      </header>

      <section className="panel p-4 md:p-6">
        <NewPositionForm muscles={muscles} disciplines={disciplines} />
      </section>
    </main>
  );
}
