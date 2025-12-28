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
  const end = new Date(courseDate).getTime() + (durationMinutes ?? 60) * 60_000;
  return end < NOW_MS;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user ||
    !session.user.schoolId ||
    (session.user.role !== "TEACHER" && session.user.role !== "SCHOOL_ADMIN")
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const monthParam = searchParams.get("month") ?? undefined;
  const teacherParam = searchParams.get("teacher") || undefined;
  const studioParam = searchParams.get("studio") || undefined;
  const q = searchParams.get("q")?.trim() || undefined;
  const disciplineParam = searchParams.get("discipline")?.trim() || undefined;
  const levelParam = searchParams.get("level")?.trim() || undefined;
  const fromParam = searchParams.get("from") || undefined;
  const toParam = searchParams.get("to") || undefined;

  const effectiveTeacher = teacherParam || undefined;

  const baseDate = monthParam ? new Date(`${monthParam}-01T00:00:00`) : new Date();
  const monthStart = startOfMonth(baseDate);
  const monthEnd = endOfMonth(baseDate);
  const rangeStart = fromParam ? new Date(`${fromParam}T00:00:00`) : monthStart;
  const rangeEnd = toParam ? new Date(`${toParam}T23:59:59`) : monthEnd;

  const whereBase: Prisma.CourseWhereInput = {
    schoolId: session.user.schoolId,
    date: { gte: rangeStart, lte: rangeEnd },
    ...(effectiveTeacher ? { teacherId: effectiveTeacher } : {}),
    ...(studioParam ? { studioId: studioParam } : {}),
    ...(q
      ? {
          OR: [{ title: { contains: q, mode: "insensitive" as Prisma.QueryMode } }],
        }
      : {}),
    ...(disciplineParam
      ? {
          discipline: { contains: disciplineParam, mode: "insensitive" as Prisma.QueryMode },
        }
      : {}),
    ...(levelParam
      ? {
          OR: [{ title: { contains: levelParam, mode: "insensitive" as Prisma.QueryMode } }],
        }
      : {}),
  };

  const courses = await prisma.course.findMany({
    where: whereBase,
    include: {
      teacher: { select: { name: true, email: true } },
      studio: { select: { name: true } },
    },
    orderBy: { date: "asc" },
  });

  const daysInMonth = monthEnd.getDate();
  const firstDay = monthStart.getDay() === 0 ? 7 : monthStart.getDay(); // Monday=1 ... Sunday=7
  const calendarCells: Array<{ day?: number; courses?: typeof courses }> = [];
  for (let i = 1; i < firstDay; i += 1) {
    calendarCells.push({});
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateStr = new Date(monthStart.getFullYear(), monthStart.getMonth(), day).toDateString();
    const dayCourses = courses.filter((c) => new Date(c.date).toDateString() === dateStr);
    calendarCells.push({ day, courses: dayCourses });
  }

  const prevMonth = new Date(monthStart);
  prevMonth.setMonth(prevMonth.getMonth() - 1);
  const nextMonth = new Date(monthStart);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const monthValue = formatMonthKey(monthStart);

  const cells = calendarCells.map((cell) => ({
    day: cell.day,
    isoDate:
      typeof cell.day === "number"
        ? new Date(monthStart.getFullYear(), monthStart.getMonth(), cell.day).toISOString()
        : undefined,
    courses: (cell.courses ?? []).map((course) => ({
      id: course.id,
      title: course.title,
      date: course.date instanceof Date ? course.date.toISOString() : course.date,
      durationMinutes: course.durationMinutes,
      teacherName: course.teacher?.name ?? course.teacher?.email ?? "Professeur",
      studioName: course.studio?.name ?? "Studio non renseigné",
      past: isPastCourse(course.date, course.durationMinutes),
    })),
  }));

  return NextResponse.json({
    monthValue,
    currentMonth: formatMonthKey(new Date()),
    prevMonth: formatMonthKey(prevMonth),
    nextMonth: formatMonthKey(nextMonth),
    cells,
    hasCourses: courses.length > 0,
  });
}
