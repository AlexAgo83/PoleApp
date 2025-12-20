import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Filters = {
  from?: string;
  to?: string;
  discipline?: string;
};

export const dynamic = "force-dynamic";

export default async function TeacherPlanningPage({
  searchParams,
}: {
  searchParams?: Promise<Filters>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "TEACHER") {
    redirect("/access-denied");
  }

  const resolved = (await searchParams) ?? {};
  const from = resolved.from ? new Date(resolved.from) : undefined;
  const to = resolved.to ? new Date(resolved.to) : undefined;
  const disciplineFilter = resolved.discipline?.trim().toLowerCase();

  const courses = await prisma.course.findMany({
    where: {
      teacherId: session.user.id,
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
      ...(disciplineFilter
        ? {
            title: {
              contains: disciplineFilter,
              mode: "insensitive",
            },
          }
        : {}),
    },
    include: {
      school: true,
    },
    orderBy: { date: "asc" },
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="panel p-6">
        <p className="text-xs uppercase tracking-[0.14em] text-indigo-100">Professeur</p>
        <h1 className="text-3xl font-semibold text-white">Planning de mes cours</h1>
        <p className="text-sm text-slate-300">
          Vue des cours à venir / à préparer. Filtre par date et discipline (titre).
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <Link
            href="/app/teacher"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-white transition hover:border-indigo-300/70 hover:bg-white/10"
          >
            ↩ Dashboard prof
          </Link>
          <Link
            href="/app/teacher/courses"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            Gérer les cours
          </Link>
        </div>
      </header>

      <section className="panel space-y-4 p-6">
        <details className="group" open>
          <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-white">
            <span className="inline-flex items-center gap-2">
              <span>Filtres</span>
            </span>
            <span className="text-xs text-slate-300 transition-transform group-open:rotate-180">
              ▼
            </span>
          </summary>
          <form method="get" className="mt-4 grid w-full gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-indigo-900/20 md:grid-cols-3 md:items-end">
            <label className="text-sm text-slate-200">
              Date de
              <input
                type="date"
                name="from"
                defaultValue={resolved.from ?? ""}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              />
            </label>
            <label className="text-sm text-slate-200">
              Date à
              <input
                type="date"
                name="to"
                defaultValue={resolved.to ?? ""}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              />
            </label>
            <label className="text-sm text-slate-200 md:col-span-3">
              Discipline (titre du cours)
              <input
                type="text"
                name="discipline"
                defaultValue={resolved.discipline ?? ""}
                placeholder="Pole, Floorwork..."
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              />
            </label>
            <div className="md:col-span-3 flex flex-wrap items-center justify-end gap-2">
              <button
                type="submit"
                className="rounded-full bg-indigo-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-indigo-400"
              >
                Filtrer
              </button>
              <Link
                href="/app/teacher/planning"
                className="rounded-full border border-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
              >
                Réinitialiser
              </Link>
            </div>
          </form>
        </details>

        <div className="space-y-3">
          {courses.length === 0 && (
            <p className="text-slate-200">Aucun cours trouvé avec ces filtres.</p>
          )}
          {courses.map((course) => (
            <article
              key={course.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-base font-semibold text-white">
                    {course.title ?? "Cours sans titre"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(course.date).toLocaleString()} · École :{" "}
                    {course.school?.name ?? "Non renseignée"}
                  </p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-white/90">
                  Planifié/enseigné
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Link
                  href={`/app/teacher/courses/${course.id}?from=/app/teacher/planning`}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
                >
                  Détail du cours
                </Link>
                <Link
                  href={`/app/teacher/courses/${course.id}/edit?from=/app/teacher/planning`}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:border-indigo-300/70 hover:bg-white/10"
                >
                  Préparer / éditer
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
