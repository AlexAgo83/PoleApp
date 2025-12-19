import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function TeacherCoursesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.schoolId) {
    return null;
  }

  const courses = await prisma.course.findMany({
    where: { schoolId: session.user.schoolId },
    orderBy: { date: "desc" },
    take: 20,
    include: {
      attendances: true,
      positions: true,
    },
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="panel flex flex-wrap items-center justify-between gap-3 p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">
            Prof / Admin
          </p>
          <h1 className="text-3xl font-semibold text-white">Cours</h1>
          <p className="text-sm text-slate-300">
            Derniers cours créés (max 20). Le détail viendra plus tard.
          </p>
        </div>
        <Link
          href="/app/teacher/courses/new"
          className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-400"
        >
          Nouveau cours
        </Link>
      </header>

      <section className="panel p-6">
        <div className="flex flex-col divide-y divide-white/5">
          {courses.map((course) => (
            <a
              key={course.id}
              href={`/app/teacher/courses/${course.id}`}
              className="group block rounded-xl transition hover:-translate-y-0.5 hover:bg-white/5"
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
            <p className="py-4 text-slate-200">Aucun cours créé pour le moment.</p>
          )}
        </div>
      </section>
    </main>
  );
}
