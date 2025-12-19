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
  date: z.string().datetime(),
  studentIds: z.array(z.string().cuid()).min(1),
  positionIds: z.array(z.string().cuid()).min(1),
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
    notes: JSON.parse((formData.get("notes") as string) ?? "[]"),
  });

  if (!parsed.success) {
    throw new Error("Form invalid");
  }

  return prisma.$transaction(async (tx) => {
    const course = await tx.course.create({
      data: {
        title: parsed.data.title || null,
        date: new Date(parsed.data.date),
        schoolId: session.user.schoolId!,
        teacherId: session.user.id,
      },
    });

    // Attendance
    await tx.courseAttendance.createMany({
      data: parsed.data.studentIds.map((studentId) => ({
        courseId: course.id,
        studentId,
      })),
    });

    // Positions taught
    await tx.coursePosition.createMany({
      data: parsed.data.positionIds.map((positionId) => ({
        courseId: course.id,
        positionId,
      })),
    });

    // Notes
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

      // Update progression for impacted students/positions
      await upsertProgressFromNotes(tx, parsed.data.notes, session.user.id);
    }

    revalidatePath("/app/teacher/courses");
    redirect(`/app/teacher/courses`);
  });
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
