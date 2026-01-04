"use server";

import { MediaKind, PositionLevel, PositionType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { destroyAsset, isCloudinaryEnabled } from "@/lib/cloudinary";
import { isSeedPublicId, normalizeFolderedPublicId } from "@/lib/media";

const schema = z.object({
  id: z.string().min(1),
  name: z.string().min(2),
  description: z.string().optional(),
  type: z.nativeEnum(PositionType),
  levelRequired: z.nativeEnum(PositionLevel),
  disciplineId: z.string().min(1),
  grips: z.string().optional(),
  tips: z.string().optional(),
  contraindications: z.string().optional(),
  imagePublicId: z.string().optional(),
  videoPublicId: z.string().optional(),
  muscles: z.array(z.string()).optional(),
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
    disciplineId: formData.get("disciplineId"),
    grips: formData.get("grips") || undefined,
    tips: formData.get("tips") || undefined,
    contraindications: formData.get("contraindications") || undefined,
    imagePublicId: formData.get("imagePublicId") || undefined,
    videoPublicId: formData.get("videoPublicId") || undefined,
    muscles: formData.getAll("muscles").map((m) => m.toString()).filter(Boolean),
  });

  if (!parsed.success) {
    throw new Error("Formulaire invalide.");
  }

  const data = parsed.data;

  const cleanedVideoPublicId = normalizeFolderedPublicId(data.videoPublicId, "poleapp/positions");
  const cleanedImagePublicId = normalizeFolderedPublicId(data.imagePublicId, "poleapp/positions");
  const discipline = await prisma.discipline.findUnique({
    where: { id: data.disciplineId },
    select: { id: true, name: true },
  });
  const existing = await prisma.position.findUnique({
    where: { id: data.id },
    select: { id: true, createdByUserId: true, media: true },
  });
  if (!existing) {
    redirect("/positions");
  }
  if (role === "TEACHER" && (!existing.createdByUserId || existing.createdByUserId !== session.user.id)) {
    redirect("/access-denied");
  }

  const existingVideo = existing.media.find((m) => m.kind === MediaKind.VIDEO && m.publicId);
  const existingImage = existing.media.find((m) => m.kind === MediaKind.PHOTO && m.publicId);
  const nextVideoPublicId = cleanedVideoPublicId ?? existingVideo?.publicId ?? null;
  const nextImagePublicId = cleanedImagePublicId ?? existingImage?.publicId ?? null;

  if (isCloudinaryEnabled() && existingVideo && nextVideoPublicId !== existingVideo.publicId) {
    if (existingVideo.publicId && !isSeedPublicId(existingVideo.publicId)) {
      destroyAsset(existingVideo.publicId, "video", "authenticated").catch(() => {});
    }
  }

  await prisma.position.update({
    where: { id: data.id },
    data: {
      name: data.name,
      description: data.description ?? data.tips,
      type: data.type,
      levelRequired: data.levelRequired,
      discipline: discipline?.name ?? null,
      disciplineId: discipline?.id ?? data.disciplineId,
      grips: data.grips ?? null,
      tips: data.tips,
      contraindications: data.contraindications,
      media:
        nextImagePublicId || nextVideoPublicId
          ? {
              deleteMany: { positionId: data.id },
              create: [
                ...(nextImagePublicId ? [{ kind: MediaKind.PHOTO, publicId: nextImagePublicId }] : []),
                ...(nextVideoPublicId ? [{ kind: MediaKind.VIDEO, publicId: nextVideoPublicId }] : []),
              ],
            }
          : undefined,
      ...(data.muscles
        ? {
            muscles: {
              deleteMany: { positionId: data.id },
              create: data.muscles.map((id) => ({ muscleId: id })),
            },
          }
        : {}),
    },
  });

  revalidatePath("/positions");
  revalidatePath(`/positions/${data.id}`);
  revalidatePath("/teacher/positions");
  revalidatePath(`/teacher/positions/${data.id}/edit`);
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
  if (role === "TEACHER") {
    const teacher = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { canDeletePositionAndPreset: true },
    });
    if (!teacher?.canDeletePositionAndPreset) {
      redirect("/access-denied");
    }
  }

  const parsed = deleteSchema.safeParse({
    positionId: formData.get("positionId"),
  });

  if (!parsed.success) {
    throw new Error("Formulaire invalide.");
  }

  const existing = await prisma.position.findUnique({
    where: { id: parsed.data.positionId },
    select: { id: true, createdByUserId: true, media: true },
  });

  if (!existing) {
    redirect("/positions");
  }
  if (role === "TEACHER" && (!existing.createdByUserId || existing.createdByUserId !== session.user.id)) {
    redirect("/access-denied");
  }

  await prisma.$transaction(async (tx) => {
    await tx.coursePosition.deleteMany({ where: { positionId: parsed.data.positionId } });
    await tx.courseNote.deleteMany({ where: { positionId: parsed.data.positionId } });
    await tx.studentPositionProgress.deleteMany({ where: { positionId: parsed.data.positionId } });
    await tx.positionMedia.deleteMany({ where: { positionId: parsed.data.positionId } });
    await tx.position.delete({ where: { id: parsed.data.positionId } });
  });

  if (isCloudinaryEnabled()) {
    existing.media
      .filter((m) => m.publicId && !isSeedPublicId(m.publicId))
      .forEach((m) => {
        destroyAsset(
          m.publicId!,
          m.kind === MediaKind.VIDEO ? "video" : "image",
          m.kind === MediaKind.VIDEO ? "authenticated" : "upload",
        ).catch(() => {});
      });
  }

  revalidatePath("/positions");
  redirect("/positions");
}
