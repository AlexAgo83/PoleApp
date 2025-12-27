"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    diplomas: (formData.get("diplomas") as string | null)?.trim() || undefined,
    favoritePositions: formData.getAll("favoritePositions").map((value) => value.toString()),
    returnTo: (formData.get("returnTo") as string | null)?.trim() || undefined,
  });

  if (!parsed.success) {
    throw new Error("Formulaire invalide");
  }

  const teacher = await prisma.user.findUnique({
    where: { id: parsed.data.teacherId },
    select: { schoolId: true, role: true },
  });
  if (!teacher || teacher.role !== "TEACHER" || teacher.schoolId !== session.user.schoolId) {
    redirect("/access-denied");
  }

  const name = [parsed.data.firstName, parsed.data.lastName].filter(Boolean).join(" ").trim() || null;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: parsed.data.teacherId },
      data: {
        name,
        age: parsed.data.age ?? null,
        avatarUrl: parsed.data.avatarUrl ?? null,
        diplomas: parsed.data.diplomas ?? null,
      },
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
  revalidatePath(targetPath);
  redirect(targetPath);
}
