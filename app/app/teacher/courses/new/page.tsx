import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { CourseForm } from "./CourseForm";
import { createCourseAction } from "./actions";

export default async function NewCoursePage() {
  const session = await getServerSession(authOptions);
  const teacherId = session?.user?.id;
  const schoolId = session?.user?.schoolId;
  if (!teacherId || !schoolId) {
    return (
      <main className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-4 py-10 md:px-6 md:py-16">
        <div className="panel w-full max-w-md p-6 text-center text-slate-200">
          <p>Accès restreint aux profs/admin.</p>
          <Link
            href="/login"
            className="mt-3 inline-flex items-center justify-center rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-400"
          >
            Se connecter
          </Link>
        </div>
      </main>
    );
  }

  const [students, positions, teachers, studios] = await Promise.all([
    prisma.user.findMany({
      where: { schoolId, role: "STUDENT" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.position.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true },
    }),
    session.user.role === "SCHOOL_ADMIN"
      ? prisma.user.findMany({
          where: { schoolId, role: "TEACHER" },
          select: { id: true, name: true, email: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    prisma.studio.findMany({
      where: { schoolId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-3 px-0 py-6 md:gap-6 md:px-8 md:py-10">
      <header className="panel p-6">
        <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">
          Professeur / Admin
        </p>
        <h1 className="text-3xl font-semibold text-white">Créer un cours</h1>
        <p className="text-sm text-slate-300">
          Sélectionne la date, les élèves présents, les positions abordées, puis
          ajoute des notes par élève/position pour mettre à jour la progression.
        </p>
        <div className="mt-2 flex w-full justify-end">
          <Link
            href="/app/teacher/courses"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            ← Retour cours
          </Link>
        </div>
      </header>

      <section className="panel p-6">
        <CourseForm
          students={students}
          positions={positions}
          action={createCourseAction}
          teachers={session.user.role === "SCHOOL_ADMIN" ? teachers : []}
          defaultTeacherId={session.user.role === "TEACHER" ? teacherId : teachers[0]?.id}
          studios={studios}
          defaultPhotoUrl=""
        />
      </section>
    </main>
  );
}
