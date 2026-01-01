"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { destroyAsset, isCloudinaryEnabled, isDefaultAvatarPublicId } from "@/lib/cloudinary";
import { isSeedPublicId } from "@/lib/media";

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
  favoritePositions: z.array(z.string().cuid()).optional(),
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
    avatarUrl: (() => {
      const raw = formData.get("avatarUrl")?.toString().trim();
      return raw ? raw : undefined;
    })(),
    avatarPublicId: formData.get("avatarPublicId")?.toString().trim() || undefined,
    diplomas: isTeacher
      ? formData.get("diplomas")?.toString().trim() || undefined
      : undefined,
    favoritePositions: (formData.getAll("favoritePositions") ?? []).map((value) => value.toString()),
  });

  if (!parsed.success) {
    throw new Error("Formulaire invalide");
  }

  const { firstName, lastName, age, diplomas, favoritePositions = [] } = parsed.data;
  const displayName = [firstName, lastName].filter(Boolean).join(" ").trim() || null;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: session.user.id },
      data: {
        name: displayName,
        age: age ?? null,
        diplomas: isTeacher ? diplomas ?? null : undefined,
      },
    });

    if (isTeacher) {
      await tx.teacherFavoritePosition.deleteMany({
        where: { teacherId: session.user.id },
      });
      if (favoritePositions.length > 0) {
        await tx.teacherFavoritePosition.createMany({
          data: favoritePositions.map((positionId) => ({
            teacherId: session.user.id,
            positionId,
          })),
          skipDuplicates: true,
        });
      }
    } else if (isStudent) {
      await tx.studentFavoritePosition.deleteMany({
        where: { studentId: session.user.id },
      });
      if (favoritePositions.length > 0) {
        await tx.studentFavoritePosition.createMany({
          data: favoritePositions.map((positionId) => ({
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
  avatarUrl: z
    .string()
    .trim()
    .url("URL invalide")
    .max(2048, "URL trop longue")
    .optional(),
  avatarPublicId: z
    .string()
    .trim()
    .max(512, "public_id trop long")
    .optional(),
});

export async function updateAvatarAction(payload: { avatarUrl?: string | null; avatarPublicId?: string | null }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/profile");
  }

  const parsed = avatarSchema.safeParse({
    avatarUrl: payload.avatarUrl ?? undefined,
    avatarPublicId: payload.avatarPublicId ?? undefined,
  });
  if (!parsed.success) {
    throw new Error("Avatar invalide");
  }

  const { avatarUrl, avatarPublicId } = parsed.data;

  const previous = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { avatarPublicId: true },
  });

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      avatarUrl: avatarUrl ?? null,
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
