import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function formatUtc(date: Date) {
  // ICS expects basic format, UTC with trailing Z
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
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

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PoleApp//Courses//FR",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${course.id}@poleapp`,
    `DTSTAMP:${formatUtc(new Date())}`,
    `DTSTART:${formatUtc(start)}`,
    `DTEND:${formatUtc(end)}`,
    `SUMMARY:${summary}`,
    course.discipline ? `CATEGORIES:${course.discipline}` : undefined,
    location ? `LOCATION:${location}` : undefined,
    `DESCRIPTION:Cours avec ${teacher}\\n${courseUrl}`,
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
