import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function formatWeekKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const weekParam = searchParams.get("week");
  const teacherFilter = searchParams.get("teacher") || undefined;
  const studioFilter = searchParams.get("studio") || undefined;
  const q = searchParams.get("q")?.trim() || undefined;
  const disciplineParam = searchParams.get("discipline") || undefined;
  const disciplineFilters = disciplineParam
    ? disciplineParam
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
    : [];
  const mine = searchParams.get("mine") === "true" || searchParams.get("mine") === "1" || searchParams.get("mine") === "on";
  const schoolsParam = searchParams.get("schools") === "all";

  let allowedSchoolIds: string[] | undefined;
  if (schoolsParam && session.user.schoolId) {
    const attended = await prisma.courseAttendance.findMany({
      where: { studentId: session.user.id },
      select: { course: { select: { schoolId: true } } },
    });
    const ids = new Set<string>();
    ids.add(session.user.schoolId);
    attended.forEach((a) => {
      if (a.course.schoolId) ids.add(a.course.schoolId);
    });
    allowedSchoolIds = Array.from(ids);
  }

  const weekBase = weekParam ? new Date(`${weekParam}T00:00:00`) : new Date();
  const startWeek = new Date(weekBase);
  const dayOffset = startWeek.getDay() === 0 ? 6 : startWeek.getDay() - 1; // Monday=0
  startWeek.setDate(startWeek.getDate() - dayOffset);
  startWeek.setHours(0, 0, 0, 0);
  const endWeek = new Date(startWeek);
  endWeek.setDate(startWeek.getDate() + 6);
  endWeek.setHours(23, 59, 59, 999);

  const prevWeek = new Date(startWeek);
  prevWeek.setDate(startWeek.getDate() - 7);
  const nextWeek = new Date(startWeek);
  nextWeek.setDate(startWeek.getDate() + 7);

  const now = Date.now();
  const isPastCourse = (courseDate: Date, durationMinutes?: number | null) => {
    const end = new Date(courseDate).getTime() + (durationMinutes ?? 60) * 60_000;
    return end < now;
  };

  const whereBase: Prisma.CourseWhereInput = {
    date: { gte: startWeek, lte: endWeek },
    ...(teacherFilter ? { teacherId: teacherFilter } : {}),
    ...(studioFilter ? { studioId: studioFilter } : {}),
    ...(q
      ? {
          title: { contains: q, mode: "insensitive" as Prisma.QueryMode },
        }
      : {}),
    ...(disciplineFilters.length > 0
      ? { disciplineId: { in: disciplineFilters } }
      : {}),
    ...(allowedSchoolIds && allowedSchoolIds.length > 0
      ? { schoolId: { in: allowedSchoolIds } }
      : session.user.schoolId
      ? { schoolId: session.user.schoolId }
      : {}),
  };

  const agendaItems = mine
    ? await prisma.courseAttendance.findMany({
        where: {
          studentId: session.user.id,
          course: whereBase,
        },
        select: {
          id: true,
          courseId: true,
          status: true,
          waitlistRank: true,
          course: {
            select: {
              id: true,
              title: true,
              disciplineId: true,
              date: true,
              durationMinutes: true,
              isVirtual: true,
              _count: { select: { positions: true } },
              teacher: { select: { name: true, email: true } },
              studio: { select: { name: true } },
            },
          },
        },
        orderBy: { course: { date: "asc" } },
      }).then((rows) =>
        rows.map((a) => ({
          id: a.id,
          courseId: a.courseId,
          course: a.course,
          isMine: true,
          myAttendance: { status: a.status, waitlistRank: a.waitlistRank },
        }))
      )
    : await prisma.course
        .findMany({
          where: whereBase,
          select: {
            id: true,
            title: true,
            disciplineId: true,
            date: true,
            durationMinutes: true,
            isVirtual: true,
            _count: { select: { positions: true } },
            teacher: { select: { name: true, email: true } },
            studio: { select: { name: true } },
            attendances: {
              where: { studentId: session.user.id },
              select: { id: true, status: true, waitlistRank: true },
            },
          },
          orderBy: { date: "asc" },
        })
        .then((rows) =>
          rows.map((c) => ({
            id: c.id,
            courseId: c.id,
            course: c,
            isMine: Boolean(c.attendances?.length),
            myAttendance: c.attendances?.[0],
          }))
        );

  const weekDays = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date(startWeek);
    d.setDate(startWeek.getDate() + idx);
    return d;
  });

  const disciplineIds = Array.from(
    new Set(
      agendaItems.flatMap((a) => {
        const id = (a.course as any)?.disciplineId;
        return id ? [id] : [];
      })
    )
  );
  const disciplineNameById =
    disciplineIds.length > 0
      ? Object.fromEntries(
          (
            await prisma.discipline.findMany({
              where: { id: { in: disciplineIds } },
              select: { id: true, name: true },
            })
          ).map((d) => [d.id, d.name])
        )
      : {};

  const days = weekDays.map((d) => {
    const dayStr = d.toDateString();
    const dayCourses = agendaItems.filter((a) => new Date(a.course.date).toDateString() === dayStr);
    return {
      isoDate: d.toISOString(),
      label: d.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", ""),
      day: d.getDate(),
      isPast: d < new Date(new Date().setHours(0, 0, 0, 0)),
      courses: dayCourses.map((a) => ({
        id: a.course.id,
        title: a.course.title,
        disciplineId: (a.course as any).disciplineId ?? null,
        discipline:
          (a.course as any).disciplineId && disciplineNameById[(a.course as any).disciplineId]
            ? disciplineNameById[(a.course as any).disciplineId]
            : null,
        date: a.course.date.toISOString(),
        durationMinutes: a.course.durationMinutes,
        isVirtual: a.course.isVirtual,
        positionsCount: a.course._count.positions,
        teacherName: a.course.teacher?.name ?? a.course.teacher?.email ?? "Professeur",
        studioName: a.course.studio?.name ?? "Studio non renseigné",
        past: isPastCourse(a.course.date, a.course.durationMinutes),
        myStatus: a.myAttendance?.status ?? null,
        waitlistRank: a.myAttendance?.waitlistRank ?? null,
      })),
    };
  });

  return NextResponse.json({
    weekStart: startWeek.toISOString(),
    prevWeek: formatWeekKey(prevWeek),
    nextWeek: formatWeekKey(nextWeek),
    days,
    disciplineNameById,
  });
}
