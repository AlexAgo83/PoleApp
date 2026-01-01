import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const NOW_MS = Date.now();

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function formatMonthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function isPastCourse(courseDate: Date, durationMinutes?: number | null) {
  const endMs = new Date(courseDate).getTime() + (durationMinutes ?? 60) * 60_000;
  return endMs < NOW_MS;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const monthParam = searchParams.get("month") ?? undefined;
  const teacherFilter = searchParams.get("teacher") || undefined;
  const studioFilter = searchParams.get("studio") || undefined;
  const q = searchParams.get("q")?.trim() || undefined;
  const fromParam = searchParams.get("from") || undefined;
  const toParam = searchParams.get("to") || undefined;
  const disciplineParam = searchParams.get("discipline") || undefined;
  const disciplineFilters = disciplineParam
    ? disciplineParam
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
    : [];
  const mine =
    searchParams.get("mine") === "true" ||
    searchParams.get("mine") === "1" ||
    searchParams.get("mine") === "on" ||
    searchParams.get("mine") === "";
  const schoolsParam = searchParams.get("schools") === "all";

  const baseDate = monthParam ? new Date(`${monthParam}-01T00:00:00`) : new Date();
  const monthStart = startOfMonth(baseDate);
  const monthEnd = endOfMonth(baseDate);
  const rangeStart = fromParam ? new Date(`${fromParam}T00:00:00`) : monthStart;
  const rangeEnd = toParam ? new Date(`${toParam}T23:59:59`) : monthEnd;

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

  const whereBase: Prisma.CourseWhereInput = {
    date: { gte: rangeStart, lte: rangeEnd },
    ...(teacherFilter ? { teacherId: teacherFilter } : {}),
    ...(studioFilter ? { studioId: studioFilter } : {}),
    ...(q
      ? {
          title: { contains: q, mode: "insensitive" as Prisma.QueryMode },
        }
      : {}),
    ...(disciplineFilters.length > 0
      ? {
          OR: [
            { disciplineId: { in: disciplineFilters } },
            { discipline: { in: disciplineFilters, mode: "insensitive" as Prisma.QueryMode } },
          ],
        }
      : {}),
    ...(allowedSchoolIds && allowedSchoolIds.length > 0
      ? { schoolId: { in: allowedSchoolIds } }
      : session.user.schoolId
      ? { schoolId: session.user.schoolId }
      : {}),
  };

  const agendaItems = mine
    ? await prisma.courseAttendance
        .findMany({
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
                discipline: true,
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
        })
        .then((rows) =>
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
            discipline: true,
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

  const disciplineIds = Array.from(
    new Set(
      agendaItems.flatMap((a) => {
        const c: any = a.course;
        return c?.disciplineId ? [c.disciplineId] : [];
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

  const daysInMonth = monthEnd.getDate();
  const firstDay = monthStart.getDay() === 0 ? 7 : monthStart.getDay(); // Monday=1 ... Sunday=7
  const cells: Array<{ day?: number; attendances?: typeof agendaItems }> = [];
  for (let i = 1; i < firstDay; i += 1) {
    cells.push({});
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateStr = new Date(monthStart.getFullYear(), monthStart.getMonth(), day).toDateString();
    const daily = agendaItems.filter((a) => new Date(a.course.date).toDateString() === dateStr);
    cells.push({ day, attendances: daily });
  }

  const prevMonth = new Date(monthStart);
  prevMonth.setMonth(prevMonth.getMonth() - 1);
  const nextMonth = new Date(monthStart);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const monthValue = formatMonthKey(monthStart);
  const responseCells = cells.map((cell) => ({
    day: cell.day,
    isoDate:
      typeof cell.day === "number"
        ? new Date(monthStart.getFullYear(), monthStart.getMonth(), cell.day).toISOString()
        : undefined,
    courses: (cell.attendances ?? []).map((a) => ({
      id: a.id,
      courseId: a.courseId,
      title: a.course.title,
      disciplineId: (a.course as any).disciplineId ?? null,
      discipline:
        (a.course as any).disciplineId && disciplineNameById[(a.course as any).disciplineId]
          ? disciplineNameById[(a.course as any).disciplineId]
          : a.course.discipline,
      date: a.course.date instanceof Date ? a.course.date.toISOString() : a.course.date,
      durationMinutes: a.course.durationMinutes,
      teacherName: a.course.teacher?.name ?? a.course.teacher?.email ?? "Professeur",
      studioName: a.course.studio?.name ?? "Studio non renseigné",
      isVirtual: a.course.isVirtual,
      positionsCount: a.course._count.positions,
      myStatus: a.myAttendance?.status ?? null,
      waitlistRank: a.myAttendance?.waitlistRank ?? null,
      past: isPastCourse(a.course.date, a.course.durationMinutes),
    })),
  }));

  return NextResponse.json({
    monthValue,
    currentMonth: formatMonthKey(new Date()),
    prevMonth: formatMonthKey(prevMonth),
    nextMonth: formatMonthKey(nextMonth),
    cells: responseCells,
    hasCourses: agendaItems.length > 0,
    disciplineNameById,
  });
}
