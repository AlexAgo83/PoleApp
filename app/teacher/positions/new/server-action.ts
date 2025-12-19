"use server";

import { MediaKind, PositionLevel, PositionType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  type: z.nativeEnum(PositionType),
  levelRequired: z.nativeEnum(PositionLevel),
  grips: z.string().optional(),
  tips: z.string().optional(),
  contraindications: z.string().optional(),
  imageUrl: z.string().url().optional(),
});

export async function createPositionAction(input: z.infer<typeof schema>) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!role || (role !== "TEACHER" && role !== "SCHOOL_ADMIN")) {
    redirect("/access-denied");
  }

  const data = schema.parse(input);

  const position = await prisma.position.create({
    data: {
      name: data.name,
      description: data.description ?? data.tips,
      type: data.type,
      levelRequired: data.levelRequired,
      grips: data.grips ?? null,
      tips: data.tips,
      contraindications: data.contraindications,
      createdByUserId: session?.user?.id,
      media: data.imageUrl
        ? {
            create: {
              kind: MediaKind.PHOTO,
              url: data.imageUrl,
            },
          }
        : undefined,
    },
  });

  revalidatePath("/positions");
  return { id: position.id };
}
