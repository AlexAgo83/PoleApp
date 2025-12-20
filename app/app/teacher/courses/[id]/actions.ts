"use server";

import { LearningStatus, MasteryLevel, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  id: z.string().cuid(),
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

export async function updateCourseAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.schoolId) {
    redirect("/access-denied");
  }
  if (session.user.role !== "TEACHER" && session.user.role !== "SCHOOL_ADMIN") {
    redirect("/access-denied");
  }

  const parsed = updateSchema.safeParse({
    id: formData.get("courseId"),
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

  const data = parsed.data;

  const existing = await prisma.course.findFirst({
    where: { id: data.id, schoolId: session.user.schoolId },
    select: { id: true, teacherId: true, studioId: true },
  });
  if (!existing) {
    redirect("/access-denied");
  }
  if (data.studioId) {
    const studioValid = await prisma.studio.findFirst({
      where: { id: data.studioId, schoolId: session.user.schoolId },
      select: { id: true },
    });
    if (!studioValid) {
      redirect("/access-denied");
    }
  }

  let teacherId: string | null = null;
  if (session.user.role === "TEACHER") {
    teacherId = session.user.id;
  } else if (data.teacherId) {
    teacherId = data.teacherId;
  } else if (existing.teacherId) {
    teacherId = existing.teacherId;
  }

  if (session.user.role === "SCHOOL_ADMIN" && teacherId) {
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

  await prisma.$transaction(async (tx) => {
    await tx.course.update({
      where: { id: data.id },
      data: {
        title: data.title || null,
        date: data.date,
        teacherId: teacherId ?? existing.teacherId ?? null,
        studioId: data.studioId ?? null,
        durationMinutes: data.durationMinutes,
      },
    });

    await tx.courseAttendance.deleteMany({ where: { courseId: data.id } });
    await tx.coursePosition.deleteMany({ where: { courseId: data.id } });
    await tx.courseNote.deleteMany({ where: { courseId: data.id } });

    await tx.courseAttendance.createMany({
      data: data.studentIds.map((studentId) => ({
        courseId: data.id,
        studentId,
      })),
    });

    await tx.coursePosition.createMany({
      data: data.positionIds.map((positionId) => ({
        courseId: data.id,
        positionId,
      })),
    });

    if (data.notes && data.notes.length > 0) {
      await tx.courseNote.createMany({
        data: data.notes.map((n) => ({
          courseId: data.id,
          studentId: n.studentId,
          positionId: n.positionId,
          masteryLevel: n.masteryLevel ?? MasteryLevel.INITIATED,
          comment: n.comment || null,
        })),
      });

      await upsertProgressFromNotes(tx, data.notes, session.user.id);
    }
  });

  revalidatePath("/app/teacher/courses");
  revalidatePath(`/app/teacher/courses/${data.id}`);
  redirect(`/app/teacher/courses/${data.id}`);
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

const deleteSchema = z.object({
  courseId: z.string().cuid(),
});

export async function deleteCourseAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.schoolId) {
    redirect("/access-denied");
  }
  if (session.user.role !== "TEACHER" && session.user.role !== "SCHOOL_ADMIN") {
    redirect("/access-denied");
  }

  const parsed = deleteSchema.safeParse({
    courseId: formData.get("courseId"),
  });

  if (!parsed.success) {
    throw new Error("Form invalid");
  }

  const existing = await prisma.course.findFirst({
    where: { id: parsed.data.courseId, schoolId: session.user.schoolId },
    select: { id: true },
  });
  if (!existing) {
    redirect("/access-denied");
  }

  await prisma.$transaction(async (tx) => {
    await tx.courseAttendance.deleteMany({ where: { courseId: parsed.data.courseId } });
    await tx.coursePosition.deleteMany({ where: { courseId: parsed.data.courseId } });
    await tx.courseNote.deleteMany({ where: { courseId: parsed.data.courseId } });
    await tx.course.delete({ where: { id: parsed.data.courseId } });
  });

  revalidatePath("/app/teacher/courses");
  redirect("/app/teacher/courses");
}
