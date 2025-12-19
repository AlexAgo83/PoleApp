import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 10;

export default async function TeacherStudentsPage({
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

  const totalCount = await prisma.user.count({
    where: {
      role: "STUDENT",
      schoolId: session.user.schoolId,
    },
  });
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, rawPage || 1), totalPages);
  const skip = (currentPage - 1) * PAGE_SIZE;

  const students = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      schoolId: session.user.schoolId,
    },
    select: {
      id: true,
      email: true,
      name: true,
      isPremium: true,
      injuries: {
        include: { injuryType: true },
      },
      progress: true,
    },
    orderBy: { createdAt: "asc" },
    skip,
    take: PAGE_SIZE,
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="panel border-indigo-400/25 p-6 shadow-indigo-900/30">
        <p className="text-xs uppercase tracking-[0.14em] text-indigo-100">
          Professeur / Admin
        </p>
        <h1 className="text-3xl font-semibold text-white">Élèves</h1>
        <p className="text-sm text-slate-200">
          Aperçu des élèves de ton école et de leurs blessures déclarées.
        </p>
      </header>

      <section className="panel border-indigo-400/15 p-6">
        <div className="flex flex-col divide-y divide-white/5">
          {students.map((student) => (
            <article
              key={student.id}
              className="flex flex-col gap-2 py-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="text-base font-semibold text-white">
                  {student.name ?? student.email}
                </p>
                <p className="text-sm text-slate-300">
                  {student.email} · {student.isPremium ? "Premium" : "Free"}
                </p>
                <p className="text-sm text-slate-200">
                  Blessures actives :{" "}
                  {
                    student.injuries.filter((inj) => inj.isActive).length
                  }
                </p>
              </div>
              <Link
                href={`/app/teacher/students/${student.id}?from=${encodeURIComponent(
                  `/app/teacher/students?page=${currentPage}`
                )}`}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
              >
                Voir la fiche
              </Link>
            </article>
          ))}
          {students.length === 0 && (
            <div className="mt-2 rounded-2xl border border-dashed border-white/15 bg-white/5 p-4 text-sm text-slate-200">
              Aucun élève trouvé pour cette école.
            </div>
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-200">
          <span>
            Page {currentPage} / {totalPages} · {totalCount} élèves
          </span>
          <div className="flex items-center gap-2">
            <Link
              href={`/app/teacher/students?page=${Math.max(1, currentPage - 1)}`}
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
              href={`/app/teacher/students?page=${Math.min(totalPages, currentPage + 1)}`}
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
