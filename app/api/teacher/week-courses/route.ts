import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function formatWeekKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !session.user.schoolId || (session.user.role !== "TEACHER" && session.user.role !== "SCHOOL_ADMIN")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const weekParam = searchParams.get("week");
  const teacherParam = searchParams.get("teacher") || undefined;
  const studioParam = searchParams.get("studio") || undefined;
  const q = searchParams.get("q")?.trim() || undefined;
  const disciplineParam = searchParams.get("discipline")?.trim() || undefined;
  const levelParam = searchParams.get("level")?.trim() || undefined;

  const effectiveTeacher = teacherParam || undefined;

  const weekBase = weekParam ? new Date(`${weekParam}T00:00:00`) : new Date();
  const startWeek = new Date(weekBase);
  const dayOffset = startWeek.getDay() === 0 ? 6 : startWeek.getDay() - 1; // Monday=0
  startWeek.setDate(startWeek.getDate() - dayOffset);
  startWeek.setHours(0, 0, 0, 0);
  const endWeek = new Date(startWeek);
  endWeek.setDate(endWeek.getDate() + 6);
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

  const courses = await prisma.course.findMany({
    where: {
      schoolId: session.user.schoolId,
      date: { gte: startWeek, lte: endWeek },
      ...(effectiveTeacher ? { teacherId: effectiveTeacher } : {}),
      ...(studioParam ? { studioId: studioParam } : {}),
      ...(q
        ? {
            OR: [{ title: { contains: q, mode: "insensitive" } }],
          }
        : {}),
      ...(disciplineParam
        ? {
            discipline: { contains: disciplineParam, mode: "insensitive" },
          }
        : {}),
      ...(levelParam
        ? {
            OR: [{ title: { contains: levelParam, mode: "insensitive" } }],
          }
        : {}),
    },
    include: {
      teacher: { select: { name: true, email: true } },
      studio: { select: { name: true } },
      _count: { select: { positions: true } },
    },
    orderBy: { date: "asc" },
  });

  const weekDays = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date(startWeek);
    d.setDate(startWeek.getDate() + idx);
    return d;
  });

  const days = weekDays.map((d) => {
    const dayStr = d.toDateString();
    const dayCourses = courses.filter((c) => new Date(c.date).toDateString() === dayStr);
    return {
      isoDate: d.toISOString(),
      label: d.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", ""),
      day: d.getDate(),
      isPast: d < new Date(new Date().setHours(0, 0, 0, 0)),
      courses: dayCourses.map((course) => ({
        id: course.id,
        title: course.title,
        date: course.date.toISOString(),
        durationMinutes: course.durationMinutes,
        teacherName: course.teacher?.name ?? course.teacher?.email ?? "Professeur",
        studioName: course.studio?.name ?? "Studio non renseigné",
        past: isPastCourse(course.date, course.durationMinutes),
        isVirtual: course.isVirtual,
        positionsCount: course._count.positions,
      })),
    };
  });

  return NextResponse.json({
    weekStart: startWeek.toISOString(),
    prevWeek: formatWeekKey(prevWeek),
    nextWeek: formatWeekKey(nextWeek),
    days,
  });
}
