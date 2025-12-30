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
    courseDisciplines,
  ] = await Promise.all([
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
