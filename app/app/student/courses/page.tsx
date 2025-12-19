import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function StudentCoursesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return null;
  }

  const attendances = await prisma.courseAttendance.findMany({
    where: { studentId: session.user.id },
    orderBy: { course: { date: "desc" } },
    include: {
      course: {
        include: {
          teacher: { select: { name: true, email: true } },
          positions: { include: { position: true } },
          notes: {
            where: { studentId: session.user.id },
            include: { position: true },
          },
        },
      },
    },
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-10">
      <header className="panel p-6">
        <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">
          Élève
        </p>
        <h1 className="text-3xl font-semibold text-white">Mes cours</h1>
        <p className="text-sm text-slate-300">Historique des cours suivis.</p>
      </header>

      <section className="panel p-6">
        <div className="flex flex-col divide-y divide-white/5">
          {attendances.map((attendance) => {
            const course = attendance.course;
            return (
              <article
                key={attendance.id}
                className="flex flex-col gap-2 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-base font-semibold text-white">
                      {course.title ?? "Cours"}
                    </p>
                    <p className="text-sm text-slate-300">
                      {new Date(course.date).toLocaleString()} ·{" "}
                      {course.teacher?.name ?? course.teacher?.email ?? "Prof"}
                    </p>
                  </div>
                  <p className="text-xs text-slate-400">
                    {course.positions.length} positions
                  </p>
                </div>
                {course.notes.length > 0 && (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
                    <p className="text-xs uppercase tracking-[0.08em] text-cyan-200">
                      Notes
                    </p>
                    <ul className="mt-1 space-y-1">
                      {course.notes.map((note) => (
                        <li key={note.id}>
                          {note.position.name}: {note.masteryLevel}
                          {note.comment ? ` — ${note.comment}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            );
          })}
          {attendances.length === 0 && (
            <p className="py-4 text-slate-200">Aucun cours trouvé.</p>
          )}
        </div>
      </section>
    </main>
  );
}
