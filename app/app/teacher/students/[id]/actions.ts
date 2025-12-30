"use server";

import { LearningStatus, MasteryLevel } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { destroyAsset, isCloudinaryEnabled, isDefaultAvatarPublicId } from "@/lib/cloudinary";

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

  const saved = await prisma.studentPositionProgress.upsert({
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

  const targetPath = `/app/teacher/students/${parsed.data.studentId}`;
  revalidatePath(targetPath);
  return {
    ok: true,
    progress: {
      learningStatus: saved.learningStatus,
      masteryLevel: saved.masteryLevel,
      comment: saved.comment,
    },
  };
}

const updateProfileSchema = z.object({
  studentId: z.string().cuid(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  age: z
    .coerce.number()
    .int()
    .min(1, "Âge invalide")
    .max(120, "Âge invalide")
    .optional(),
});

export async function updateStudentProfileAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.schoolId) {
    redirect("/access-denied");
  }
  if (session.user.role !== "TEACHER" && session.user.role !== "SCHOOL_ADMIN") {
    redirect("/access-denied");
  }

  const parsed = updateProfileSchema.safeParse({
    studentId: formData.get("studentId"),
    firstName: (formData.get("firstName") as string | null)?.trim() || "",
    lastName: (formData.get("lastName") as string | null)?.trim() || "",
    age: (formData.get("age") as string | null)?.trim() || undefined,
  });

  if (!parsed.success) {
    throw new Error("Formulaire invalide");
  }

  const student = await prisma.user.findUnique({
    where: { id: parsed.data.studentId },
    select: { schoolId: true },
  });
  if (!student || student.schoolId !== session.user.schoolId) {
    redirect("/access-denied");
  }

  const name = [parsed.data.firstName, parsed.data.lastName].filter(Boolean).join(" ").trim() || null;

  await prisma.user.update({
    where: { id: parsed.data.studentId },
    data: {
      name,
      age: parsed.data.age ?? null,
    },
  });

  const targetPath = `/app/teacher/students/${parsed.data.studentId}`;
  revalidatePath(targetPath);
  redirect(targetPath);
}

const updateAvatarSchema = z.object({
  studentId: z.string().cuid(),
  avatarUrl: z.string().trim().url("URL invalide").max(2048).nullable(),
  avatarPublicId: z.string().trim().max(512).nullable(),
  returnTo: z.string().optional(),
});

export async function updateStudentAvatarAction(input: {
  studentId: string;
  avatarUrl: string | null;
  avatarPublicId: string | null;
  returnTo?: string | null;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.schoolId) {
    redirect("/access-denied");
  }
  if (session.user.role !== "TEACHER" && session.user.role !== "SCHOOL_ADMIN") {
    redirect("/access-denied");
  }

  const parsed = updateAvatarSchema.safeParse({
    studentId: input.studentId,
    avatarUrl: input.avatarUrl,
    avatarPublicId: input.avatarPublicId,
    returnTo: input.returnTo ?? undefined,
  });
  if (!parsed.success) {
    throw new Error("Formulaire avatar invalide");
  }

  const student = await prisma.user.findUnique({
    where: { id: parsed.data.studentId },
    select: { schoolId: true, avatarPublicId: true },
  });
  if (!student || student.schoolId !== session.user.schoolId) {
    redirect("/access-denied");
  }

  await prisma.user.update({
    where: { id: parsed.data.studentId },
    data: {
      avatarUrl: parsed.data.avatarUrl,
      avatarPublicId: parsed.data.avatarPublicId,
    },
  });

  const targetPath = parsed.data.returnTo || `/app/teacher/students/${parsed.data.studentId}`;
  revalidatePath(targetPath);

  const previousPublicId = student.avatarPublicId;
  const newPublicId = parsed.data.avatarPublicId;
  if (
    previousPublicId &&
    previousPublicId !== newPublicId &&
    !isDefaultAvatarPublicId(previousPublicId) &&
    isCloudinaryEnabled()
  ) {
    try {
      await destroyAsset(previousPublicId, "image", "authenticated");
    } catch (error) {
      console.error("[student-avatar] failed to destroy previous avatar", error);
    }
  }

  return { ok: true };
}
