import { Role } from "@prisma/client";

import { prisma } from "./prisma";

type ViewerUser = {
  id: string;
  role: Role;
  schoolId?: string | null;
};

export type TeacherForAgenda = {
  id: string;
  role: Role;
  schoolId: string | null;
};

type AllowedAccess = { allowed: true; scopeSchoolId: string | null };
type BlockedAccess = { allowed: false; reason: "forbidden" | "not_found" };
export type AgendaAccess = AllowedAccess | BlockedAccess;

export type AgendaDayCourse = {
  id: string;
  title: string | null;
  date: string;
  durationMinutes: number | null;
  photoPublicId?: string | null;
  teacherName: string;
  studioName: string;
  discipline?: string | null;
  disciplineId?: string | null;
  past: boolean;
  myStatus: "CONFIRMED" | "WAITLIST" | null;
  waitlistRank: number | null;
  isVirtual?: boolean;
  positionsCount?: number;
};

export type AgendaDay = {
  isoDate: string;
  label: string;
  day: number;
  isPast: boolean;
  courses: AgendaDayCourse[];
};

export type WeekAgendaData = {
  week: string;
  prevWeek: string;
  nextWeek: string;
  days: AgendaDay[];
  disciplineNameById: Record<string, string>;
};

type WeekRange = {
  start: Date;
  end: Date;
  prevWeekKey: string;
  nextWeekKey: string;
  weekKey: string;
  days: Date[];
};

function formatWeekKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getWeekRange(weekParam?: string | null): WeekRange {
  const parsedWeek = weekParam ? new Date(`${weekParam}T00:00:00`) : new Date();
  const weekBase = Number.isNaN(parsedWeek.getTime()) ? new Date() : parsedWeek;
  const start = new Date(weekBase);
  const dayOffset = start.getDay() === 0 ? 6 : start.getDay() - 1; // Monday=0
  start.setDate(start.getDate() - dayOffset);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  const prev = new Date(start);
  prev.setDate(start.getDate() - 7);
  const next = new Date(start);
  next.setDate(start.getDate() + 7);

  const days = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date(start);
    d.setDate(start.getDate() + idx);
    return d;
  });

  return {
    start,
    end,
    prevWeekKey: formatWeekKey(prev),
    nextWeekKey: formatWeekKey(next),
    weekKey: formatWeekKey(start),
    days,
  };
}

export function resolveTeacherAgendaAccess(
  teacher: TeacherForAgenda | null,
  viewer: ViewerUser | null | undefined,
): AgendaAccess {
  if (!teacher || (teacher.role !== "TEACHER" && teacher.role !== "SCHOOL_ADMIN")) {
    return { allowed: false, reason: "not_found" };
  }
  if (!viewer) {
    return { allowed: false, reason: "forbidden" };
  }
  const isSuperAdmin = viewer.role === "SUPER_ADMIN";
  const viewerSchoolId = viewer.schoolId ?? null;
  if (isSuperAdmin) {
    return { allowed: true, scopeSchoolId: teacher.schoolId ?? viewerSchoolId ?? null };
  }
  if (!viewerSchoolId) {
    return { allowed: false, reason: "forbidden" };
  }
  if (teacher.schoolId && teacher.schoolId !== viewerSchoolId) {
    return { allowed: false, reason: "not_found" };
  }
  return { allowed: true, scopeSchoolId: viewerSchoolId };
}

export async function buildTeacherWeekAgenda({
  teacher,
  viewer,
  weekParam,
}: {
  teacher: TeacherForAgenda;
  viewer: ViewerUser;
  weekParam?: string | null;
}): Promise<{ access: AgendaAccess; data: WeekAgendaData | null }> {
  const access = resolveTeacherAgendaAccess(teacher, viewer);
  if (!access.allowed) {
    return { access, data: null };
  }

  const { start, end, prevWeekKey, nextWeekKey, weekKey, days: weekDays } = getWeekRange(weekParam);
  const now = Date.now();
  const isPastCourse = (courseDate: Date, durationMinutes?: number | null) => {
    const endMs = new Date(courseDate).getTime() + (durationMinutes ?? 60) * 60_000;
    return endMs < now;
  };

  const courses = await prisma.course.findMany({
    where: {
      teacherId: teacher.id,
      date: { gte: start, lte: end },
      ...(access.scopeSchoolId ? { schoolId: access.scopeSchoolId } : {}),
    },
    select: {
      id: true,
      title: true,
      photoPublicId: true,
      disciplineId: true,
      discipline: true,
      date: true,
      durationMinutes: true,
      isVirtual: true,
      teacher: { select: { name: true, email: true } },
      studio: { select: { name: true, address: true } },
      _count: { select: { positions: true } },
      attendances:
        viewer.role === "STUDENT"
          ? {
              where: { studentId: viewer.id },
              select: { status: true, waitlistRank: true },
            }
          : false,
    },
    orderBy: { date: "asc" },
  });

  const disciplineIds = Array.from(
    new Set(
      courses.flatMap((course) => {
        return course.disciplineId ? [course.disciplineId] : [];
      }),
    ),
  );
  const disciplineNameById =
    disciplineIds.length > 0
      ? Object.fromEntries(
          (
            await prisma.discipline.findMany({
              where: { id: { in: disciplineIds } },
              select: { id: true, name: true },
            })
          ).map((d) => [d.id, d.name]),
        )
      : {};

  const agendaDays: AgendaDay[] = weekDays.map((d) => {
    const dayStr = d.toDateString();
    const dayCourses = courses.filter((course) => new Date(course.date).toDateString() === dayStr);
    return {
      isoDate: d.toISOString(),
      label: d.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", ""),
      day: d.getDate(),
      isPast: d < new Date(new Date().setHours(0, 0, 0, 0)),
      courses: dayCourses.map((course) => {
        const attendance = viewer.role === "STUDENT" ? (course as any)?.attendances?.[0] : undefined;
        const studioLabel = course.studio?.name ?? "Studio non renseigné";
        const studioName = course.studio?.address?.trim()
          ? `${studioLabel} — ${course.studio.address.trim()}`
          : studioLabel;
        const teacherName = course.teacher?.name ?? course.teacher?.email ?? "Professeur";
        return {
          id: course.id,
          title: course.title,
          photoPublicId: (course as any).photoPublicId ?? null,
          disciplineId: (course as any).disciplineId ?? null,
          discipline:
            (course as any).disciplineId && disciplineNameById[(course as any).disciplineId]
              ? disciplineNameById[(course as any).disciplineId]
              : course.discipline ?? null,
          date: course.date.toISOString(),
          durationMinutes: course.durationMinutes,
          isVirtual: course.isVirtual,
          positionsCount: course._count?.positions,
          teacherName,
          studioName,
          past: isPastCourse(course.date, course.durationMinutes),
          myStatus: attendance?.status ?? null,
          waitlistRank: attendance?.waitlistRank ?? null,
        };
      }),
    };
  });

  return {
    access,
    data: {
      week: weekKey,
      prevWeek: prevWeekKey,
      nextWeek: nextWeekKey,
      days: agendaDays,
      disciplineNameById,
    },
  };
}

export async function loadTeacherUpcomingLocations({
  teacher,
  viewer,
}: {
  teacher: TeacherForAgenda;
  viewer: ViewerUser;
}): Promise<{ access: AgendaAccess; locations: { courseId: string; studioName: string; studioAddress: string | null }[] }> {
  const access = resolveTeacherAgendaAccess(teacher, viewer);
  if (!access.allowed) {
    return { access, locations: [] };
  }
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const futureCourses = await prisma.course.findMany({
    where: {
      teacherId: teacher.id,
      date: { gte: now },
      ...(access.scopeSchoolId ? { schoolId: access.scopeSchoolId } : {}),
    },
    select: {
      id: true,
      studio: { select: { name: true, address: true } },
    },
    orderBy: { date: "asc" },
  });

  const locations = futureCourses
    .map((course) => {
      const studioLabel = course.studio?.name ?? "Studio non renseigné";
      const studioAddress = course.studio?.address?.trim() || null;
      return {
        courseId: course.id,
        studioName: studioLabel,
        studioAddress,
      };
    })
    .filter((loc) => Boolean(loc.studioName));

  return { access, locations };
}
