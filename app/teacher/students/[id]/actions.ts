"use server";

import { LearningStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { destroyAsset, isCloudinaryEnabled, isDefaultAvatarPublicId } from "@/lib/cloudinary";
import { isSeedPublicId } from "@/lib/media";
import {
  INSTAGRAM_ERROR_MESSAGE,
  PHONE_ERROR_MESSAGE,
  normalizePhone,
  validateInstagramUsername,
} from "@/lib/contacts";

const updateProgressSchema = z.object({
  studentId: z.string().cuid(),
  positionId: z.string().cuid(),
  learningStatus: z.nativeEnum(LearningStatus),
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
      comment: parsed.data.comment?.toString().trim() || null,
      lastUpdatedByUserId: session.user.id,
    },
    create: {
      studentId: parsed.data.studentId,
      positionId: parsed.data.positionId,
      learningStatus: parsed.data.learningStatus,
      comment: parsed.data.comment?.toString().trim() || null,
      lastUpdatedByUserId: session.user.id,
    },
  });

  const targetPath = `/teacher/students/${parsed.data.studentId}`;
  revalidatePath(targetPath);
  return {
    ok: true,
    progress: {
      learningStatus: saved.learningStatus,
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
  phone: z.string().trim().max(64, "Téléphone trop long").optional(),
  instagramUsername: z.string().trim().max(64, "Username trop long").optional(),
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
    phone: (formData.get("phone") as string | null)?.trim() || undefined,
    instagramUsername: (formData.get("instagramUsername") as string | null)?.trim() || undefined,
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
  let phone: string | null = null;
  let instagramUsername: string | null = null;
  try {
    phone = normalizePhone(parsed.data.phone);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message || PHONE_ERROR_MESSAGE);
    }
    throw new Error(PHONE_ERROR_MESSAGE);
  }
  try {
    instagramUsername = validateInstagramUsername(parsed.data.instagramUsername);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message || INSTAGRAM_ERROR_MESSAGE);
    }
    throw new Error(INSTAGRAM_ERROR_MESSAGE);
  }

  await prisma.user.update({
    where: { id: parsed.data.studentId },
    data: {
      name,
      firstName: parsed.data.firstName?.trim() || null,
      lastName: parsed.data.lastName?.trim() || null,
      age: parsed.data.age ?? null,
      phone,
      instagramUsername,
    },
  });

  const targetPath = `/teacher/students/${parsed.data.studentId}`;
  revalidatePath(targetPath);
  redirect(targetPath);
}

const updateAvatarSchema = z.object({
  studentId: z.string().cuid(),
  avatarPublicId: z.string().trim().max(512).nullable(),
  returnTo: z.string().optional(),
});

export async function updateStudentAvatarAction(input: {
  studentId: string;
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
      avatarPublicId: parsed.data.avatarPublicId,
    },
  });

  const targetPath = parsed.data.returnTo || `/teacher/students/${parsed.data.studentId}`;
  revalidatePath(targetPath);

  const previousPublicId = student.avatarPublicId;
  const newPublicId = parsed.data.avatarPublicId;
  if (
    previousPublicId &&
    previousPublicId !== newPublicId &&
    !isDefaultAvatarPublicId(previousPublicId) &&
    !isSeedPublicId(previousPublicId) &&
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
