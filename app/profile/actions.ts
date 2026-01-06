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
  firstName: z
    .string()
    .trim()
    .max(60, "Prénom trop long")
    .optional(),
  lastName: z
    .string()
    .trim()
    .max(120, "Nom trop long")
    .optional(),
  age: z
    .coerce.number()
    .int()
    .min(1, "Âge invalide")
    .max(120, "Âge invalide")
    .optional(),
  diplomas: z
    .string()
    .trim()
    .max(2000, "Texte trop long")
    .optional(),
  phone: z.string().trim().max(64, "Téléphone trop long").optional(),
  instagramUsername: z.string().trim().max(64, "Username trop long").optional(),
  favoritePositions: z.array(z.string().cuid()).optional(),
  favoriteDisciplines: z.array(z.string().cuid()).max(5, "Max 5 disciplines").optional(),
});

export async function updateProfileAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/profile");
  }
  const isTeacher = session.user.role === "TEACHER";
  const isStudent = session.user.role === "STUDENT";

  const parsed = schema.safeParse({
    firstName: formData.get("firstName")?.toString() || undefined,
    lastName: formData.get("lastName")?.toString() || undefined,
    age: formData.get("age")?.toString().trim() || undefined,
    diplomas: isTeacher
      ? formData.get("diplomas")?.toString().trim() || undefined
      : undefined,
    phone: formData.get("phone")?.toString() ?? undefined,
    instagramUsername: formData.get("instagramUsername")?.toString() ?? undefined,
    favoritePositions: (formData.getAll("favoritePositions") ?? []).map((value) => value.toString()),
    favoriteDisciplines: (formData.getAll("favoriteDisciplines") ?? []).map((value) =>
      value.toString()
    ),
  });

  if (!parsed.success) {
    throw new Error("Formulaire invalide");
  }

  const { firstName, lastName, age, diplomas, favoritePositions = [], favoriteDisciplines = [] } =
    parsed.data;
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
  const firstNameValue = firstName?.trim() || null;
  const lastNameValue = lastName?.trim() || null;
  const displayName = [firstNameValue, lastNameValue].filter(Boolean).join(" ").trim() || null;
  const dedupedDisciplines = Array.from(new Set(favoriteDisciplines)).slice(0, 5);
  const dedupedPositions = Array.from(new Set(favoritePositions));

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: session.user.id },
      data: {
        name: displayName,
        firstName: firstNameValue,
        lastName: lastNameValue,
        age: age ?? null,
        diplomas: isTeacher ? diplomas ?? null : undefined,
        phone,
        instagramUsername,
      },
    });

    if (isTeacher) {
      await tx.teacherFavoritePosition.deleteMany({
        where: { teacherId: session.user.id },
      });
      if (dedupedPositions.length > 0) {
        await tx.teacherFavoritePosition.createMany({
          data: dedupedPositions.map((positionId) => ({
            teacherId: session.user.id,
            positionId,
          })),
          skipDuplicates: true,
        });
      }
      await tx.teacherFavoriteDiscipline.deleteMany({
        where: { teacherId: session.user.id },
      });
      if (dedupedDisciplines.length > 0) {
        await tx.teacherFavoriteDiscipline.createMany({
          data: dedupedDisciplines.map((disciplineId) => ({
            teacherId: session.user.id,
            disciplineId,
          })),
          skipDuplicates: true,
        });
      }
    } else if (isStudent) {
      await tx.studentFavoritePosition.deleteMany({
        where: { studentId: session.user.id },
      });
      if (dedupedPositions.length > 0) {
        await tx.studentFavoritePosition.createMany({
          data: dedupedPositions.map((positionId) => ({
            studentId: session.user.id,
            positionId,
          })),
          skipDuplicates: true,
        });
      }
    }
  });

  revalidatePath("/profile");
  redirect("/profile?saved=1");
}

const avatarSchema = z.object({
  avatarPublicId: z.string().trim().max(512, "public_id trop long").optional(),
});

export async function updateAvatarAction(payload: { avatarPublicId?: string | null }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/profile");
  }

  const parsed = avatarSchema.safeParse({
    avatarPublicId: payload.avatarPublicId ?? undefined,
  });
  if (!parsed.success) {
    throw new Error("Avatar invalide");
  }

  const { avatarPublicId } = parsed.data;

  const previous = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { avatarPublicId: true },
  });

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      avatarPublicId: avatarPublicId ?? null,
    },
  });

  const previousPublicId = previous?.avatarPublicId;
  const newPublicId = avatarPublicId ?? null;
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
      console.error("[profile] failed to destroy previous avatar", error);
    }
  }

  revalidatePath("/profile");
  return { ok: true };
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(8, "Mot de passe actuel invalide"),
    newPassword: z.string().min(8, "Mot de passe trop court"),
    confirmPassword: z.string().min(8, "Confirmation requise"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export async function updatePasswordAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/profile");
  }

  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword")?.toString() ?? "",
    newPassword: formData.get("newPassword")?.toString() ?? "",
    confirmPassword: formData.get("confirmPassword")?.toString() ?? "",
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Formulaire invalide");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true, disabledAt: true },
  });
  if (!user) {
    redirect("/login");
  }
  if (user.disabledAt) {
    throw new Error("Compte désactivé, contactez l’admin.");
  }

  const isValid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!isValid) {
    throw new Error("Mot de passe actuel incorrect.");
  }

  const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash: newHash },
  });

  revalidatePath("/profile");
  return;
}
