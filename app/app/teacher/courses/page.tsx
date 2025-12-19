import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 10;

export const dynamic = "force-dynamic";

export default async function TeacherCoursesPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string }>;
}) {
  const resolvedParams = (await searchParams) ?? {};
  const rawPage = Number(resolvedParams.page ?? "1");
  const session = await getServerSession(authOptions);
  if (!session?.user?.schoolId) {
    return null;
  }

  const totalCount = await prisma.course.count({
    where: { schoolId: session.user.schoolId },
  });
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, rawPage || 1), totalPages);
  const skip = (currentPage - 1) * PAGE_SIZE;

  const courses = await prisma.course.findMany({
    where: { schoolId: session.user.schoolId },
    orderBy: { date: "desc" },
    skip,
    take: PAGE_SIZE,
    include: {
      attendances: true,
      positions: true,
    },
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="panel flex flex-wrap items-center justify-between gap-3 border-indigo-400/25 p-6 shadow-indigo-900/30">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-indigo-100">
            Professeur / Admin
          </p>
          <h1 className="text-3xl font-semibold text-white">Cours</h1>
          <p className="text-sm text-slate-200">
            Derniers cours créés. Tri par date desc, pagination x10.
          </p>
        </div>
        <Link
          href="/app/teacher/courses/new"
          className="rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg transition hover:brightness-110"
        >
          Nouveau cours
        </Link>
      </header>

      <section className="panel border-indigo-400/15 p-6">
        <div className="flex flex-col divide-y divide-white/5">
          {courses.map((course) => (
            <a
              key={course.id}
              href={`/app/teacher/courses/${course.id}?from=${encodeURIComponent(
                `/app/teacher/courses?page=${currentPage}`
              )}`}
              className="group block rounded-xl transition hover:-translate-y-0.5 hover:bg-indigo-500/10"
            >
              <article className="flex flex-col gap-2 py-3 px-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-base font-semibold text-white">
                    {course.title ?? "Cours sans titre"}
                  </p>
                  <p className="text-sm text-slate-300">
                    {new Date(course.date).toLocaleString()}
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-200">
                  {course.attendances.length} élèves · {course.positions.length} positions
                </p>
              </article>
            </a>
          ))}
          {courses.length === 0 && (
            <div className="mt-2 rounded-2xl border border-dashed border-white/15 bg-white/5 p-4 text-sm text-slate-200">
              Aucun cours créé pour le moment. Utilise le bouton “Nouveau cours” pour commencer.
            </div>
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-200">
          <span>
            Page {currentPage} / {totalPages} · {totalCount} cours
          </span>
          <div className="flex items-center gap-2">
            <Link
              href={`/app/teacher/courses?page=${Math.max(1, currentPage - 1)}`}
              aria-disabled={currentPage === 1}
              className={`rounded-full border border-white/10 px-3 py-2 ${
                currentPage === 1
                  ? "cursor-not-allowed text-slate-500"
                  : "bg-white/5 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
              }`}
            >
              Précédent
            </Link>
            <Link
              href={`/app/teacher/courses?page=${Math.min(totalPages, currentPage + 1)}`}
              aria-disabled={currentPage === totalPages}
              className={`rounded-full border border-white/10 px-3 py-2 ${
                currentPage === totalPages
                  ? "cursor-not-allowed text-slate-500"
                  : "bg-white/5 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
              }`}
            >
              Suivant
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
