"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const presetSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  discipline: z.string().optional(),
  videoUrl: z.string().url().optional().or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
  premiumRequired: z.boolean().optional(),
  priceCredits: z.coerce.number().min(0).optional(),
  positionIds: z.array(z.string().cuid()).min(1),
});

export async function createPresetAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !session.user.schoolId || (session.user.role !== "TEACHER" && session.user.role !== "SCHOOL_ADMIN")) {
    redirect("/access-denied");
  }

  const rawPositionIds = formData.getAll("positionIds").map((id) => id.toString());
  const disciplineInput = formData.get("discipline")?.toString().trim() || undefined;
  const disciplineRecord = disciplineInput
    ? await prisma.discipline.findFirst({
        where: {
          OR: [{ id: disciplineInput }, { name: disciplineInput }],
        },
        select: { id: true, name: true },
      })
    : null;
  const fallbackDisciplineId = await prisma.discipline
    .findFirst({ select: { id: true }, orderBy: { name: "asc" } })
    .then((d) => d?.id);
  const parsed = presetSchema.safeParse({
    title: formData.get("title")?.toString().trim(),
    description: formData.get("description")?.toString().trim() || undefined,
    discipline: disciplineRecord?.name ?? disciplineInput ?? undefined,
    videoUrl: formData.get("videoUrl")?.toString().trim() || undefined,
    imageUrl: formData.get("imageUrl")?.toString().trim() || undefined,
    premiumRequired: formData.get("premiumRequired") === "on",
    priceCredits: formData.get("priceCredits") ? Number(formData.get("priceCredits")) : undefined,
    positionIds: rawPositionIds,
  });

  if (!parsed.success) {
    redirect("/access-denied");
  }

  await prisma.preset.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      discipline: parsed.data.discipline,
      disciplineId: disciplineRecord?.id ?? fallbackDisciplineId ?? parsed.data.discipline ?? "",
      videoUrl: parsed.data.videoUrl || null,
      imageUrl: parsed.data.imageUrl || null,
      premiumRequired: parsed.data.premiumRequired ?? false,
      priceCredits: parsed.data.premiumRequired ? null : parsed.data.priceCredits ?? null,
      schoolId: session.user.schoolId,
      createdByUserId: session.user.id,
      positions: {
        create: parsed.data.positionIds.map((id) => ({ positionId: id })),
      },
    },
  });

  revalidatePath("/app/teacher/presets");
  redirect("/app/teacher/presets?flash=created");
}

export async function deletePresetAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !session.user.schoolId || (session.user.role !== "TEACHER" && session.user.role !== "SCHOOL_ADMIN")) {
    redirect("/access-denied");
  }
  const id = formData.get("id")?.toString();
  if (!id) redirect("/access-denied");

  const preset = await prisma.preset.findUnique({ where: { id } });
  if (!preset || preset.schoolId !== session.user.schoolId) redirect("/access-denied");

  await prisma.preset.delete({ where: { id } });
  revalidatePath("/app/teacher/presets");
  redirect("/app/teacher/presets?flash=deleted");
}

const presetImageSchema = z.object({
  id: z.string().cuid(),
  imageUrl: z.string().url().optional().or(z.literal("")),
});

export async function updatePresetImageAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !session.user.schoolId || (session.user.role !== "TEACHER" && session.user.role !== "SCHOOL_ADMIN")) {
    redirect("/access-denied");
  }
  const parsed = presetImageSchema.safeParse({
    id: formData.get("id")?.toString(),
    imageUrl: formData.get("imageUrl")?.toString().trim() || undefined,
  });
  if (!parsed.success) redirect("/access-denied");

  const preset = await prisma.preset.findUnique({ where: { id: parsed.data.id } });
  if (!preset || preset.schoolId !== session.user.schoolId) redirect("/access-denied");

  await prisma.preset.update({
    where: { id: parsed.data.id },
    data: { imageUrl: parsed.data.imageUrl || null },
  });

  revalidatePath("/app/teacher/presets");
}
