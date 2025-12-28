import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { CourseFormLayout } from "./CourseFormLayout";
import { createCourseAction } from "./actions";

export default async function NewCoursePage({
  searchParams,
}: {
  searchParams?: Promise<{ from?: string }>;
}) {
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

  const resolvedSearch = (await searchParams) ?? {};
  const rawFrom = resolvedSearch.from;
  const safeFrom = rawFrom && rawFrom.startsWith("/") && !rawFrom.startsWith("//") ? rawFrom : "/app/teacher/courses/agenda?view=month";
  const formId = "new-course-form";

  const [students, positions, teachers, studios, progresses, disciplinesRaw, courseDisciplines, teacherFavoritesRows] = await Promise.all([
    prisma.user.findMany({
      where: { schoolId, role: "STUDENT" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.position.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true, discipline: true },
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
    prisma.teacherFavoritePosition.findMany({
      where: { teacherId: session.user.role === "TEACHER" ? teacherId ?? undefined : undefined },
      select: { teacherId: true, positionId: true },
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

  const teacherIdsForFavorites =
    session.user.role === "TEACHER" ? [teacherId] : teachers.map((t) => t.id);
  const filteredTeacherFavorites = teacherFavoritesRows.filter((row) =>
    teacherIdsForFavorites.includes(row.teacherId)
  );
  const studentsWithActiveInjury = (await prisma.studentInjury.findMany({
    where: { studentId: { in: students.map((s) => s.id) }, isActive: true },
    select: { studentId: true },
  })).reduce<Record<string, number>>((acc, row) => {
    acc[row.studentId] = (acc[row.studentId] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <CourseFormLayout
      formId={formId}
      safeFrom={safeFrom ?? "/app/teacher/courses"}
      students={students}
      positions={positions}
      action={createCourseAction}
      teachers={session.user.role === "SCHOOL_ADMIN" ? teachers : []}
      defaultTeacherId={session.user.role === "TEACHER" ? teacherId : teachers[0]?.id}
      studios={studios}
      defaultStudioId={studios[0]?.id ?? null}
      disciplines={mergedDisciplines}
      teacherFavorites={filteredTeacherFavorites.reduce<Record<string, string[]>>((acc, row) => {
        if (!acc[row.teacherId]) acc[row.teacherId] = [];
        acc[row.teacherId].push(row.positionId);
        return acc;
      }, {})}
      studentsWithActiveInjury={studentsWithActiveInjury}
      progressByStudent={progresses.map((p) => ({
        studentId: p.studentId,
        positionId: p.positionId,
        masteryLevel: p.masteryLevel,
        learningStatus: p.learningStatus,
        positionName: p.position.name,
        positionType: p.position.type,
      }))}
    />
  );
}
