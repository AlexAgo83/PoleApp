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
      <main className="flex min-h-screen w-full flex-col gap-4">
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

  const [students, positions, teachers, studios, progresses, disciplinesRaw, courseDisciplines] = await Promise.all([
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
    prisma.studentPositionProgress.findMany({
      where: { student: { schoolId } },
      select: {
        studentId: true,
        positionId: true,
        masteryLevel: true,
        learningStatus: true,
        position: { select: { name: true, type: true } },
      },
    }),
    prisma.discipline.findMany({
      where: { schoolId },
      select: { name: true, color: true },
      orderBy: { name: "asc" },
    }),
    prisma.course.findMany({
      where: { schoolId },
      select: { discipline: true },
      distinct: ["discipline"],
    }),
  ]);
  const fallbackDisciplines = [
    { name: "Danse" },
    { name: "Pole" },
    { name: "Exotic" },
    { name: "Souplesse" },
    { name: "Pilates" },
  ];
  const mergedDisciplines = (() => {
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
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-5 px-2 py-6 md:px-8 md:py-10">
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
          defaultStudioId={studios[0]?.id ?? null}
          defaultPhotoUrl=""
          disciplines={mergedDisciplines}
          progressByStudent={progresses.map((p) => ({
            studentId: p.studentId,
            positionId: p.positionId,
            masteryLevel: p.masteryLevel,
            learningStatus: p.learningStatus,
            positionName: p.position.name,
            positionType: p.position.type,
          }))}
        />
      </section>
    </main>
  );
}
