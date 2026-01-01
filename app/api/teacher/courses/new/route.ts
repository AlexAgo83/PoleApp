import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "TEACHER" && session.user.role !== "SCHOOL_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const schoolId = session.user.schoolId;

  const [
    students,
    positions,
    teachers,
    studios,
    progresses,
    disciplinesRaw,
  ] = await Promise.all([
    prisma.user.findMany({
      where: { schoolId, role: "STUDENT" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.position.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true, discipline: true, disciplineId: true },
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
        learningStatus: true,
        position: { select: { name: true, type: true } },
      },
    }),
    prisma.discipline.findMany({
      select: { id: true, name: true, color: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const [teacherFavoritesRows, injuries] = await Promise.all([
    prisma.teacherFavoritePosition.findMany({
      where:
        session.user.role === "TEACHER"
          ? { teacherId: session.user.id }
          : { teacherId: { in: teachers.map((t) => t.id) } },
      select: { teacherId: true, positionId: true },
    }),
    prisma.studentInjury.findMany({
      where: { studentId: { in: students.map((s) => s.id) }, isActive: true },
      select: { studentId: true },
    }),
  ]);

  const fallbackDisciplines = [
    { id: "danse-fallback", name: "Danse" },
    { id: "pole-fallback", name: "Pole" },
    { id: "exotic-fallback", name: "Exotic" },
    { id: "souplesse-fallback", name: "Souplesse" },
    { id: "pilates-fallback", name: "Pilates" },
  ];

  const mergedDisciplines = (disciplinesRaw ?? []).length > 0 ? disciplinesRaw : fallbackDisciplines;

  const teacherIdsForFavorites =
    session.user.role === "TEACHER" ? [session.user.id] : teachers.map((t) => t.id);
  const teacherFavorites = teacherFavoritesRows
    .filter((row) => teacherIdsForFavorites.includes(row.teacherId))
    .reduce<Record<string, string[]>>((acc, row) => {
      if (!acc[row.teacherId]) acc[row.teacherId] = [];
      acc[row.teacherId].push(row.positionId);
      return acc;
    }, {});

  const studentsWithActiveInjury = injuries.reduce<Record<string, number>>((acc, row) => {
    acc[row.studentId] = (acc[row.studentId] ?? 0) + 1;
    return acc;
  }, {});

  const progressByStudent = progresses.map((p) => ({
    studentId: p.studentId,
    positionId: p.positionId,
    learningStatus: p.learningStatus,
    positionName: p.position.name,
    positionType: p.position.type,
  }));

  return NextResponse.json({
    students,
    positions,
    teachers: session.user.role === "SCHOOL_ADMIN" ? teachers : [],
    studios,
    defaultTeacherId: session.user.role === "TEACHER" ? session.user.id : teachers[0]?.id ?? null,
    defaultStudioId: studios[0]?.id ?? null,
    disciplines: mergedDisciplines,
    teacherFavorites,
    studentsWithActiveInjury,
    progressByStudent,
  });
}
