import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildTeacherWeekAgenda, resolveTeacherAgendaAccess } from "@/lib/teacherAgenda";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { teacherId: string } | Promise<{ teacherId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const resolvedParams = await Promise.resolve(params);
  const teacherId = resolvedParams.teacherId;
  if (!teacherId) {
    return NextResponse.json({ error: "teacherId missing" }, { status: 400 });
  }

  const teacher = await prisma.user.findUnique({
    where: { id: teacherId },
    select: { id: true, role: true, schoolId: true },
  });
  if (!teacher) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const access = resolveTeacherAgendaAccess(teacher, session.user);
  if (!access.allowed) {
    const status = access.reason === "forbidden" ? 403 : 404;
    return NextResponse.json({ error: access.reason }, { status });
  }

  const { searchParams } = new URL(req.url);
  const weekParam = searchParams.get("week");
  const agenda = await buildTeacherWeekAgenda({ teacher, viewer: session.user, weekParam });
  if (!agenda.data) {
    const status = agenda.access.allowed ? 500 : agenda.access.reason === "forbidden" ? 403 : 404;
    return NextResponse.json({ error: agenda.access.allowed ? "agenda_unavailable" : agenda.access.reason }, { status });
  }

  return NextResponse.json({
    week: agenda.data.week,
    prevWeek: agenda.data.prevWeek,
    nextWeek: agenda.data.nextWeek,
    days: agenda.data.days,
    disciplineNameById: agenda.data.disciplineNameById,
  });
}
export const revalidate = 60;
