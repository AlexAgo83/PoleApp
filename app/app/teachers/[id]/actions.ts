"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { destroyAsset, isCloudinaryEnabled, isDefaultAvatarPublicId } from "@/lib/cloudinary";

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
  avatarUrl: z
    .string()
    .trim()
    .url("URL invalide")
    .max(2048, "URL trop longue")
    .optional(),
  avatarPublicId: z.string().trim().max(512).optional(),
  diplomas: z.string().trim().max(2000, "Texte trop long").optional(),
  favoritePositions: z.array(z.string().cuid()).optional(),
  returnTo: z.string().trim().optional(),
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
    avatarUrl: (formData.get("avatarUrl") as string | null)?.trim() || undefined,
    avatarPublicId: (formData.get("avatarPublicId") as string | null)?.trim() || undefined,
    diplomas: (formData.get("diplomas") as string | null)?.trim() || undefined,
    favoritePositions: formData.getAll("favoritePositions").map((value) => value.toString()),
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

  const updateData: Record<string, unknown> = {
    name,
    age: parsed.data.age ?? null,
    diplomas: parsed.data.diplomas ?? null,
  };
  if (parsed.data.avatarUrl !== undefined) {
    updateData.avatarUrl = parsed.data.avatarUrl ?? null;
  }
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
    if (parsed.data.favoritePositions?.length) {
      await tx.teacherFavoritePosition.createMany({
        data: parsed.data.favoritePositions.map((positionId) => ({
          teacherId: parsed.data.teacherId,
          positionId,
        })),
        skipDuplicates: true,
      });
    }
  });

  const safeReturn =
    parsed.data.returnTo && parsed.data.returnTo.startsWith("/") ? parsed.data.returnTo : undefined;
  const targetPath = `/app/teachers/${parsed.data.teacherId}${
    safeReturn ? `?from=${encodeURIComponent(safeReturn)}` : ""
  }`;
  const previousPublicId = teacher.avatarPublicId;
  const newPublicId = parsed.data.avatarPublicId ?? null;
  if (
    previousPublicId &&
    previousPublicId !== newPublicId &&
    !isDefaultAvatarPublicId(previousPublicId) &&
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
  avatarUrl: z
    .string()
    .trim()
    .url("URL invalide")
    .max(2048, "URL trop longue")
    .nullable()
    .optional(),
  avatarPublicId: z.string().trim().max(512).nullable().optional(),
  returnTo: z.string().trim().optional(),
});

export async function updateTeacherAvatarAction(input: {
  teacherId: string;
  avatarUrl: string | null;
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
    avatarUrl: input.avatarUrl?.trim() || undefined,
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
      avatarUrl: parsed.data.avatarUrl ?? null,
      avatarPublicId: parsed.data.avatarPublicId ?? null,
    },
  });

  const previousPublicId = teacher.avatarPublicId;
  const newPublicId = parsed.data.avatarPublicId ?? null;
  if (
    previousPublicId &&
    previousPublicId !== newPublicId &&
    !isDefaultAvatarPublicId(previousPublicId) &&
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
  const targetPath = `/app/teachers/${parsed.data.teacherId}${
    safeReturn ? `?from=${encodeURIComponent(safeReturn)}` : ""
  }`;
  revalidatePath(targetPath);
  return { ok: true };
}
