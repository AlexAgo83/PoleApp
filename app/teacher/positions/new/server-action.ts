"use server";

import { MediaKind, PositionLevel, PositionType, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeFolderedPublicId } from "@/lib/media";

const schema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  type: z.nativeEnum(PositionType),
  levelRequired: z.nativeEnum(PositionLevel),
  disciplineId: z.string().trim().min(1),
  grips: z.string().optional(),
  tips: z.string().optional(),
  contraindications: z.string().optional(),
  imagePublicId: z.string().optional(),
  videoPublicId: z.string().optional(),
  muscles: z.array(z.string()).optional(),
});

export async function createPositionAction(input: z.infer<typeof schema>) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!role || (role !== "TEACHER" && role !== "SCHOOL_ADMIN")) {
    redirect("/access-denied");
  }

  const parsed = schema.parse(input);
  const data = {
    ...parsed,
    imagePublicId: normalizeFolderedPublicId(parsed.imagePublicId, "poleapp/positions") ?? undefined,
    videoPublicId: normalizeFolderedPublicId(parsed.videoPublicId, "poleapp/positions") ?? undefined,
  };
  const discipline = await prisma.discipline.findUnique({
    where: { id: data.disciplineId },
    select: { id: true, name: true },
  });

  const position = await prisma.position.create({
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
      createdByUserId: session?.user?.id,
      media:
        data.imagePublicId || data.videoPublicId
          ? {
              create: [
                ...(data.imagePublicId
                  ? [{ kind: MediaKind.PHOTO, publicId: data.imagePublicId } satisfies Prisma.PositionMediaCreateWithoutPositionInput]
                  : []),
                ...(data.videoPublicId
                  ? [{ kind: MediaKind.VIDEO, publicId: data.videoPublicId } satisfies Prisma.PositionMediaCreateWithoutPositionInput]
                  : []),
              ],
            }
          : undefined,
      ...(data.muscles && data.muscles.length > 0
        ? {
            muscles: {
              create: data.muscles.map((id) => ({ muscleId: id })),
            },
          }
        : {}),
    },
  });

  revalidatePath("/positions");
  return { id: position.id };
}
