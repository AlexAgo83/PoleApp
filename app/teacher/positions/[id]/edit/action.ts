"use server";

import { MediaKind, PositionLevel, PositionType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  id: z.string().min(1),
  name: z.string().min(2),
  description: z.string().optional(),
  type: z.nativeEnum(PositionType),
  levelRequired: z.nativeEnum(PositionLevel),
  grips: z.string().optional(),
  tips: z.string().optional(),
  contraindications: z.string().optional(),
  imageUrl: z.string().url().optional(),
});

export async function updatePositionAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!role || (role !== "TEACHER" && role !== "SCHOOL_ADMIN")) {
    redirect("/access-denied");
  }

  const parsed = schema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    type: formData.get("type"),
    levelRequired: formData.get("levelRequired"),
    grips: formData.get("grips") || undefined,
    tips: formData.get("tips") || undefined,
    contraindications: formData.get("contraindications") || undefined,
    imageUrl: formData.get("imageUrl") || undefined,
  });

  if (!parsed.success) {
    throw new Error("Formulaire invalide.");
  }

  const data = parsed.data;

  await prisma.position.update({
    where: { id: data.id },
    data: {
      name: data.name,
      description: data.description ?? data.tips,
      type: data.type,
      levelRequired: data.levelRequired,
      grips: data.grips ?? null,
      tips: data.tips,
      contraindications: data.contraindications,
      media: data.imageUrl
        ? {
            deleteMany: { positionId: data.id },
            create: {
              kind: MediaKind.PHOTO,
              url: data.imageUrl,
            },
          }
        : undefined,
    },
  });

  revalidatePath("/positions");
  redirect(`/positions/${data.id}?from=/positions`);
}

const deleteSchema = z.object({
  positionId: z.string().cuid(),
});

export async function deletePositionAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!role || (role !== "TEACHER" && role !== "SCHOOL_ADMIN")) {
    redirect("/access-denied");
  }

  const parsed = deleteSchema.safeParse({
    positionId: formData.get("positionId"),
  });

  if (!parsed.success) {
    throw new Error("Formulaire invalide.");
  }

  const existing = await prisma.position.findUnique({
    where: { id: parsed.data.positionId },
    select: { id: true },
  });

  if (!existing) {
    redirect("/positions");
  }

  await prisma.$transaction(async (tx) => {
    await tx.coursePosition.deleteMany({ where: { positionId: parsed.data.positionId } });
    await tx.courseNote.deleteMany({ where: { positionId: parsed.data.positionId } });
    await tx.studentPositionProgress.deleteMany({ where: { positionId: parsed.data.positionId } });
    await tx.positionMedia.deleteMany({ where: { positionId: parsed.data.positionId } });
    await tx.position.delete({ where: { id: parsed.data.positionId } });
  });

  revalidatePath("/positions");
  redirect("/positions");
}
