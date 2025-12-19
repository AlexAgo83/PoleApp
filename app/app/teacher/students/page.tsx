import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function TeacherStudentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.schoolId) {
    return null;
  }

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
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-10">
      <header className="panel p-6">
        <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">
          Prof / Admin
        </p>
        <h1 className="text-3xl font-semibold text-white">Élèves</h1>
        <p className="text-sm text-slate-300">
          Aperçu des élèves de ton école et de leurs blessures déclarées.
        </p>
      </header>

      <section className="panel p-6">
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
                href={`/app/teacher/students/${student.id}`}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
              >
                Voir la fiche
              </Link>
            </article>
          ))}
          {students.length === 0 && (
            <p className="py-4 text-slate-200">Aucun élève trouvé.</p>
          )}
        </div>
      </section>
    </main>
  );
}
