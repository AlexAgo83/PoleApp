"use server";

import { LearningStatus, MasteryLevel } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateProgressSchema = z.object({
  studentId: z.string().cuid(),
  positionId: z.string().cuid(),
  learningStatus: z.nativeEnum(LearningStatus),
  masteryLevel: z.nativeEnum(MasteryLevel).optional(),
  comment: z.string().optional(),
});

export async function updateProgressAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.schoolId) {
    redirect("/access-denied");
  }
  if (session.user.role !== "TEACHER" && session.user.role !== "SCHOOL_ADMIN") {
    redirect("/access-denied");
  }

  const parsed = updateProgressSchema.safeParse({
    studentId: formData.get("studentId"),
    positionId: formData.get("positionId"),
    learningStatus: formData.get("learningStatus"),
    masteryLevel: formData.get("masteryLevel") || undefined,
    comment: formData.get("comment") || undefined,
  });
  if (!parsed.success) {
    throw new Error("Invalid form");
  }

  const student = await prisma.user.findUnique({
    where: { id: parsed.data.studentId },
    select: { schoolId: true },
  });
  if (!student || student.schoolId !== session.user.schoolId) {
    redirect("/access-denied");
  }

  await prisma.studentPositionProgress.upsert({
    where: {
      studentId_positionId: {
        studentId: parsed.data.studentId,
        positionId: parsed.data.positionId,
      },
    },
    update: {
      learningStatus: parsed.data.learningStatus,
      masteryLevel: parsed.data.masteryLevel ?? null,
      comment: parsed.data.comment?.toString().trim() || null,
      lastUpdatedByUserId: session.user.id,
    },
    create: {
      studentId: parsed.data.studentId,
      positionId: parsed.data.positionId,
      learningStatus: parsed.data.learningStatus,
      masteryLevel: parsed.data.masteryLevel ?? null,
      comment: parsed.data.comment?.toString().trim() || null,
      lastUpdatedByUserId: session.user.id,
    },
  });

  revalidatePath(`/app/teacher/students/${parsed.data.studentId}`);
}
