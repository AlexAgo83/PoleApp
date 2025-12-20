"use server";

import { LearningStatus, MasteryLevel, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const courseSchema = z.object({
  title: z.string().optional(),
  date: z.coerce.date(),
  studentIds: z.array(z.string().cuid()).min(1),
  positionIds: z.array(z.string().cuid()).min(1),
  teacherId: z.string().cuid().optional(),
  studioId: z.string().cuid().optional().nullable(),
  durationMinutes: z
    .coerce.number()
    .min(30)
    .refine((n) => n % 15 === 0, { message: "La durée doit être un multiple de 15 minutes" }),
  notes: z
    .array(
      z.object({
        studentId: z.string().cuid(),
        positionId: z.string().cuid(),
        masteryLevel: z.nativeEnum(MasteryLevel).optional(),
        comment: z.string().optional(),
      })
    )
    .optional(),
});

export async function createCourseAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.schoolId) {
    redirect("/access-denied");
  }
  if (session.user.role !== "TEACHER" && session.user.role !== "SCHOOL_ADMIN") {
    redirect("/access-denied");
  }

  const parsed = courseSchema.safeParse({
    title: formData.get("title") || undefined,
    date: formData.get("date"),
    studentIds: JSON.parse((formData.get("studentIds") as string) ?? "[]"),
    positionIds: JSON.parse((formData.get("positionIds") as string) ?? "[]"),
    teacherId: formData.get("teacherId") || undefined,
    studioId: formData.get("studioId") || null,
    durationMinutes: formData.get("durationMinutes") ?? 60,
    notes: JSON.parse((formData.get("notes") as string) ?? "[]"),
  });

  if (!parsed.success) {
    throw new Error("Form invalid");
  }

  const teacherId =
    session.user.role === "TEACHER"
      ? session.user.id
      : parsed.data.teacherId ?? null;

  if (session.user.role === "SCHOOL_ADMIN") {
    if (!teacherId) {
      redirect("/access-denied");
    }
    const teacherValid = await prisma.user.findFirst({
      where: {
        id: teacherId,
        schoolId: session.user.schoolId,
        role: "TEACHER",
      },
      select: { id: true },
    });
    if (!teacherValid) {
      redirect("/access-denied");
    }
  }

  if (parsed.data.studioId) {
    const studioValid = await prisma.studio.findFirst({
      where: { id: parsed.data.studioId, schoolId: session.user.schoolId },
      select: { id: true },
    });
    if (!studioValid) {
      redirect("/access-denied");
    }
  }

  const courseId = await prisma.$transaction(async (tx) => {
    const course = await tx.course.create({
      data: {
        title: parsed.data.title || null,
        date: parsed.data.date,
        schoolId: session.user.schoolId!,
        teacherId: teacherId ?? session.user.id,
        studioId: parsed.data.studioId || null,
        durationMinutes: parsed.data.durationMinutes,
      },
    });

    await tx.courseAttendance.createMany({
      data: parsed.data.studentIds.map((studentId) => ({
        courseId: course.id,
        studentId,
      })),
    });

    await tx.coursePosition.createMany({
      data: parsed.data.positionIds.map((positionId) => ({
        courseId: course.id,
        positionId,
      })),
    });

    if (parsed.data.notes && parsed.data.notes.length > 0) {
      await tx.courseNote.createMany({
        data: parsed.data.notes.map((n) => ({
          courseId: course.id,
          studentId: n.studentId,
          positionId: n.positionId,
          masteryLevel: n.masteryLevel ?? MasteryLevel.INITIATED,
          comment: n.comment || null,
        })),
      });

      await upsertProgressFromNotes(tx, parsed.data.notes, session.user.id);
    }

    return course.id;
  });

  revalidatePath("/app/teacher/courses");
  redirect(`/app/teacher/courses`);
}

async function upsertProgressFromNotes(
  tx: Prisma.TransactionClient,
  notes: {
    studentId: string;
    positionId: string;
    masteryLevel?: MasteryLevel;
    comment?: string;
  }[],
  teacherId: string
) {
  for (const note of notes) {
    const learningStatus =
      note.masteryLevel === MasteryLevel.PASSED ||
      note.masteryLevel === MasteryLevel.FLUID ||
      note.masteryLevel === MasteryLevel.CHOREO
        ? LearningStatus.PASSED
        : LearningStatus.IN_PROGRESS;

    await tx.studentPositionProgress.upsert({
      where: {
        studentId_positionId: {
          studentId: note.studentId,
          positionId: note.positionId,
        },
      },
      update: {
        learningStatus,
        masteryLevel: note.masteryLevel ?? null,
        comment: note.comment ?? null,
        lastUpdatedByUserId: teacherId,
      },
      create: {
        studentId: note.studentId,
        positionId: note.positionId,
        learningStatus,
        masteryLevel: note.masteryLevel ?? null,
        comment: note.comment ?? null,
        lastUpdatedByUserId: teacherId,
      },
    });
  }
}
