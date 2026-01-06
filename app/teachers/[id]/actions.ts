"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { z } from "zod";
import bcrypt from "bcryptjs";

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

const schema = z.object({
  teacherId: z.string().cuid(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  age: z
    .coerce.number()
    .int()
    .min(1, "Âge invalide")
    .max(120, "Âge invalide")
    .optional(),
  avatarPublicId: z.string().trim().max(512).optional(),
  diplomas: z.string().trim().max(2000, "Texte trop long").optional(),
  phone: z.string().trim().max(64, "Téléphone trop long").optional(),
  instagramUsername: z.string().trim().max(64, "Username trop long").optional(),
  favoritePositions: z.array(z.string().cuid()).optional(),
  favoriteDisciplines: z.array(z.string().cuid()).max(5, "Max 5 disciplines").optional(),
  returnTo: z.string().trim().optional(),
});

const passwordSchema = z
  .object({
    teacherId: z.string().cuid(),
    currentPassword: z.string().min(8, "Mot de passe actuel invalide"),
    newPassword: z.string().min(8, "Mot de passe trop court"),
    confirmPassword: z.string().min(8, "Confirmation requise"),
    returnTo: z.string().trim().optional(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export async function updateTeacherProfileAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.schoolId) {
    redirect("/access-denied");
  }
  if (session.user.role !== "SCHOOL_ADMIN" && session.user.role !== "TEACHER") {
    redirect("/access-denied");
  }

  const parsed = schema.safeParse({
    teacherId: formData.get("teacherId"),
    firstName: (formData.get("firstName") as string | null)?.trim() || "",
    lastName: (formData.get("lastName") as string | null)?.trim() || "",
    age: (formData.get("age") as string | null)?.trim() || undefined,
    avatarPublicId: (formData.get("avatarPublicId") as string | null)?.trim() || undefined,
    diplomas: (formData.get("diplomas") as string | null)?.trim() || undefined,
    phone: (formData.get("phone") as string | null)?.trim() || undefined,
    instagramUsername: (formData.get("instagramUsername") as string | null)?.trim() || undefined,
    favoritePositions: formData.getAll("favoritePositions").map((value) => value.toString()),
    favoriteDisciplines: formData.getAll("favoriteDisciplines").map((value) => value.toString()),
    returnTo: (formData.get("returnTo") as string | null)?.trim() || undefined,
  });

  if (!parsed.success) {
    throw new Error("Formulaire invalide");
  }

  const teacher = await prisma.user.findUnique({
    where: { id: parsed.data.teacherId },
    select: { schoolId: true, role: true, avatarPublicId: true },
  });
  if (!teacher || teacher.role !== "TEACHER" || teacher.schoolId !== session.user.schoolId) {
    redirect("/access-denied");
  }

  const name = [parsed.data.firstName, parsed.data.lastName].filter(Boolean).join(" ").trim() || null;
  const firstNameValue = parsed.data.firstName?.trim() || null;
  const lastNameValue = parsed.data.lastName?.trim() || null;
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
  const dedupedPositions = Array.from(new Set(parsed.data.favoritePositions ?? []));
  const dedupedDisciplines = Array.from(new Set(parsed.data.favoriteDisciplines ?? [])).slice(0, 5);

  const updateData: Record<string, unknown> = {
    name,
    firstName: firstNameValue,
    lastName: lastNameValue,
    age: parsed.data.age ?? null,
    diplomas: parsed.data.diplomas ?? null,
    phone,
    instagramUsername,
  };
  if (parsed.data.avatarPublicId !== undefined) {
    updateData.avatarPublicId = parsed.data.avatarPublicId ?? null;
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: parsed.data.teacherId },
      data: updateData,
    });

    await tx.teacherFavoritePosition.deleteMany({
      where: { teacherId: parsed.data.teacherId },
    });
    if (dedupedPositions.length) {
      await tx.teacherFavoritePosition.createMany({
        data: dedupedPositions.map((positionId) => ({
          teacherId: parsed.data.teacherId,
          positionId,
        })),
        skipDuplicates: true,
      });
    }
    await tx.teacherFavoriteDiscipline.deleteMany({
      where: { teacherId: parsed.data.teacherId },
    });
    if (dedupedDisciplines.length) {
      await tx.teacherFavoriteDiscipline.createMany({
        data: dedupedDisciplines.map((disciplineId) => ({
          teacherId: parsed.data.teacherId,
          disciplineId,
        })),
        skipDuplicates: true,
      });
    }
  });

  const safeReturn =
    parsed.data.returnTo && parsed.data.returnTo.startsWith("/") ? parsed.data.returnTo : undefined;
  const targetPath = `/teachers/${parsed.data.teacherId}${
    safeReturn ? `?from=${encodeURIComponent(safeReturn)}` : ""
  }`;
  const previousPublicId = teacher.avatarPublicId;
  const newPublicId = parsed.data.avatarPublicId ?? null;
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
      console.error("[teacher-profile] failed to destroy previous avatar", error);
    }
  }
  revalidatePath(targetPath);
  redirect(targetPath);
}

const avatarSchema = z.object({
  teacherId: z.string().cuid(),
  avatarPublicId: z.string().trim().max(512).nullable().optional(),
  returnTo: z.string().trim().optional(),
});

export async function updateTeacherAvatarAction(input: {
  teacherId: string;
  avatarPublicId: string | null;
  returnTo?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.schoolId) {
    redirect("/access-denied");
  }
  if (session.user.role !== "SCHOOL_ADMIN" && session.user.role !== "TEACHER") {
    redirect("/access-denied");
  }

  const parsed = avatarSchema.safeParse({
    teacherId: input.teacherId,
    avatarPublicId: input.avatarPublicId?.trim() || undefined,
    returnTo: input.returnTo?.trim() || undefined,
  });

  if (!parsed.success) {
    throw new Error("Formulaire avatar invalide");
  }

  const teacher = await prisma.user.findUnique({
    where: { id: parsed.data.teacherId },
    select: { schoolId: true, role: true, avatarPublicId: true },
  });
  if (!teacher || teacher.role !== "TEACHER" || teacher.schoolId !== session.user.schoolId) {
    redirect("/access-denied");
  }

  await prisma.user.update({
    where: { id: parsed.data.teacherId },
    data: {
      avatarPublicId: parsed.data.avatarPublicId ?? null,
    },
  });

  const previousPublicId = teacher.avatarPublicId;
  const newPublicId = parsed.data.avatarPublicId ?? null;
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
      console.error("[teacher-profile-avatar] failed to destroy previous avatar", error);
    }
  }

  const safeReturn =
    parsed.data.returnTo && parsed.data.returnTo.startsWith("/") ? parsed.data.returnTo : undefined;
  const targetPath = `/teachers/${parsed.data.teacherId}${
    safeReturn ? `?from=${encodeURIComponent(safeReturn)}` : ""
  }`;
  revalidatePath(targetPath);
  return { ok: true };
}

export async function updateTeacherPasswordAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/access-denied");
  }

  const parsed = passwordSchema.safeParse({
    teacherId: formData.get("teacherId"),
    currentPassword: formData.get("currentPassword")?.toString() ?? "",
    newPassword: formData.get("newPassword")?.toString() ?? "",
    confirmPassword: formData.get("confirmPassword")?.toString() ?? "",
    returnTo: (formData.get("returnTo") as string | null)?.trim() || undefined,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Formulaire invalide");
  }

  const teacher = await prisma.user.findUnique({
    where: { id: parsed.data.teacherId },
    select: { id: true, role: true, schoolId: true, passwordHash: true, disabledAt: true },
  });
  if (!teacher || teacher.role !== "TEACHER") {
    redirect("/access-denied");
  }

  const canAdminister =
    session.user.role === "SUPER_ADMIN" ||
    (session.user.role === "SCHOOL_ADMIN" &&
      session.user.schoolId &&
      session.user.schoolId === teacher.schoolId) ||
    session.user.id === teacher.id;
  if (!canAdminister) {
    redirect("/access-denied");
  }
  if (teacher.disabledAt) {
    throw new Error("Compte désactivé, contactez l’admin.");
  }

  const isValid = await bcrypt.compare(parsed.data.currentPassword, teacher.passwordHash);
  if (!isValid) {
    throw new Error("Mot de passe actuel incorrect.");
  }

  const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({
    where: { id: teacher.id },
    data: { passwordHash: newHash },
  });

  const safeReturn =
    parsed.data.returnTo && parsed.data.returnTo.startsWith("/") ? parsed.data.returnTo : undefined;
  const targetPath = `/teachers/${teacher.id}${
    safeReturn ? `?from=${encodeURIComponent(safeReturn)}` : ""
  }`;
  revalidatePath(targetPath);
  return;
}
