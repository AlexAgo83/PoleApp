import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function formatUtc(date: Date) {
  // ICS expects basic format, UTC with trailing Z
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function formatWithTz(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});
  const y = parts.year ?? "1970";
  const m = parts.month ?? "01";
  const d = parts.day ?? "01";
  const h = parts.hour ?? "00";
  const min = parts.minute ?? "00";
  const s = parts.second ?? "00";
  return `${y}${m}${d}T${h}${min}${s}`;
}

export async function GET(
  _req: Request,
  context: { params: { id?: string } } | Promise<{ params: { id?: string } }>,
) {
  const { params } = await Promise.resolve(context);
  const courseId = params?.id;
  if (!courseId) {
    return NextResponse.json({ error: "missing id" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.schoolId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const course = await prisma.course.findFirst({
    where: { id: courseId, schoolId: session.user.schoolId },
    select: {
      id: true,
      title: true,
      date: true,
      durationMinutes: true,
      discipline: true,
      studio: { select: { name: true, address: true } },
      teacher: { select: { name: true, email: true } },
    },
  });

  const globalSettings = await prisma.globalSetting.findFirst({
    select: { timezone: true, icsDefaultAlarmMinutes: true },
  });

  if (!course) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const start = new Date(course.date);
  const duration = course.durationMinutes ?? 60;
  const end = new Date(start.getTime() + duration * 60_000);
  const summary = course.title || "Cours";
  const teacher = course.teacher?.name || course.teacher?.email || "Professeur";
  const locationParts = [course.studio?.name, course.studio?.address].filter(Boolean);
  const location = locationParts.join(" - ");
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const role = session.user.role;
  const coursePath =
    role === "STUDENT"
    ? `/app/student/courses/${course.id}`
    : `/app/teacher/courses/${course.id}`;
  const courseUrl = `${baseUrl}${coursePath}`;
  const tz = globalSettings?.timezone || "Europe/Paris";
  const alarmMinutes = Number.isFinite(globalSettings?.icsDefaultAlarmMinutes)
    ? globalSettings?.icsDefaultAlarmMinutes ?? 30
    : 30;
  const dtStart = formatWithTz(start, tz);
  const dtEnd = formatWithTz(end, tz);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PoleApp//Courses//FR",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${course.id}@poleapp`,
    `DTSTAMP:${formatUtc(new Date())}`,
    `DTSTART;TZID=${tz}:${dtStart}`,
    `DTEND;TZID=${tz}:${dtEnd}`,
    `SUMMARY:${summary}`,
    course.discipline ? `CATEGORIES:${course.discipline}` : undefined,
    location ? `LOCATION:${location}` : undefined,
    `DESCRIPTION:Cours avec ${teacher}\\n${courseUrl}`,
    "BEGIN:VALARM",
    `TRIGGER:-PT${alarmMinutes}M`,
    "ACTION:DISPLAY",
    "DESCRIPTION:Reminder",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  const body = lines.join("\r\n");
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"course-${course.id}.ics\"`,
    },
  });
}
