"use server";

import { MediaKind, PositionLevel, PositionType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { destroyAsset, isCloudinaryEnabled } from "@/lib/cloudinary";

const RESERVED_POSITION_VIDEO_PUBLIC_IDS = new Set([
  "01_xphtvq",
  "02_e8rhmg",
  "03_yjmfi7",
  "04_exjndq",
  "05_flr6zp",
  "06_shrnly",
]);

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

  if (
    isCloudinaryEnabled() &&
    existing.media.some((m) => m.kind === MediaKind.VIDEO && m.publicId && m.publicId !== data.videoPublicId)
  ) {
    const old = existing.media.find((m) => m.kind === MediaKind.VIDEO && m.publicId);
    if (old?.publicId && !RESERVED_POSITION_VIDEO_PUBLIC_IDS.has(old.publicId)) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      destroyAsset(old.publicId, "video", "authenticated").catch(() => {});
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
        data.imagePublicId || data.videoPublicId
          ? {
              deleteMany: { positionId: data.id },
              create: [
                ...(data.imagePublicId
                  ? [{ kind: MediaKind.PHOTO, publicId: data.imagePublicId }]
                  : []),
                ...(data.videoPublicId
                  ? [{ kind: MediaKind.VIDEO, publicId: data.videoPublicId ?? null }]
                  : []),
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
      .filter((m) => m.publicId && !RESERVED_POSITION_VIDEO_PUBLIC_IDS.has(m.publicId))
      .forEach((m) => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
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
