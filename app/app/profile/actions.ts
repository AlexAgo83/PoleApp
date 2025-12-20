"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  avatarUrl: z
    .string()
    .trim()
    .url("URL invalide")
    .max(2048, "URL trop longue")
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
    redirect("/login?callbackUrl=/app/profile");
  }
  const isTeacher = session.user.role === "TEACHER";

  const parsed = schema.safeParse({
    firstName: formData.get("firstName")?.toString() || undefined,
    lastName: formData.get("lastName")?.toString() || undefined,
    age: formData.get("age")?.toString().trim() || undefined,
    avatarUrl: (() => {
      const raw = formData.get("avatarUrl")?.toString().trim();
      return raw ? raw : undefined;
    })(),
    diplomas: isTeacher
      ? formData.get("diplomas")?.toString().trim() || undefined
      : undefined,
    favoritePositions: isTeacher
      ? (formData.getAll("favoritePositions") ?? []).map((value) => value.toString())
      : [],
  });

  if (!parsed.success) {
    throw new Error("Formulaire invalide");
  }

  const { firstName, lastName, age, avatarUrl, diplomas, favoritePositions = [] } = parsed.data;
  const displayName = [firstName, lastName].filter(Boolean).join(" ").trim() || null;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: session.user.id },
      data: {
        name: displayName,
        age: age ?? null,
        avatarUrl: avatarUrl ?? null,
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
    }
  });

  revalidatePath("/app/profile");
  redirect("/app/profile");
}
