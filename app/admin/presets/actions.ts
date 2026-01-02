"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { normalizeFolderedPublicId } from "@/lib/media";
import { prisma } from "@/lib/prisma";

const presetSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  discipline: z.string().optional(),
  videoPublicId: z.string().optional().or(z.literal("")),
  imagePublicId: z.string().optional().or(z.literal("")),
  premiumRequired: z.boolean().optional(),
  teacherId: z.string().cuid().optional(),
  priceCredits: z.coerce.number().min(0).optional(),
  positionIds: z.array(z.string().cuid()).min(1),
});

export async function createPresetAdminAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SCHOOL_ADMIN" || !session.user.schoolId) {
    redirect("/access-denied");
  }

  const rawPositionIds = formData.getAll("positionIds").map((id) => id.toString());
  const disciplineInput = formData.get("discipline")?.toString().trim() || undefined;
  const disciplineRecord = disciplineInput
    ? await prisma.discipline.findFirst({
        where: { OR: [{ id: disciplineInput }, { name: disciplineInput }] },
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
    videoPublicId: formData.get("videoPublicId")?.toString().trim() || undefined,
    imagePublicId: formData.get("imagePublicId")?.toString().trim() || undefined,
    premiumRequired: formData.get("premiumRequired") === "on",
    priceCredits: formData.get("priceCredits") ? Number(formData.get("priceCredits")) : undefined,
    positionIds: rawPositionIds,
  });
  if (!parsed.success) redirect("/access-denied");

  const teacherId = parsed.data.teacherId
    ? await prisma.user
        .findFirst({
          where: { id: parsed.data.teacherId, schoolId: session.user.schoolId, role: "TEACHER" },
          select: { id: true },
        })
        .then((t) => t?.id)
    : null;

  await prisma.preset.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      discipline: parsed.data.discipline,
      disciplineId: disciplineRecord?.id ?? fallbackDisciplineId ?? parsed.data.discipline ?? "",
      videoPublicId: normalizeFolderedPublicId(parsed.data.videoPublicId, "poleapp/presets"),
      imagePublicId: normalizeFolderedPublicId(parsed.data.imagePublicId, "poleapp/presets"),
      premiumRequired: parsed.data.premiumRequired ?? false,
      priceCredits: parsed.data.premiumRequired ? null : parsed.data.priceCredits ?? null,
      schoolId: session.user.schoolId,
      createdByUserId: teacherId ?? session.user.id,
      positions: { create: parsed.data.positionIds.map((id) => ({ positionId: id })) },
    },
  });

  revalidatePath("/teacher/presets");
  redirect("/teacher/presets?flash=created");
}

export async function deletePresetAdminAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SCHOOL_ADMIN" || !session.user.schoolId) {
    redirect("/access-denied");
  }
  const id = formData.get("id")?.toString();
  if (!id) redirect("/access-denied");
  const preset = await prisma.preset.findUnique({ where: { id } });
  if (!preset || preset.schoolId !== session.user.schoolId) redirect("/access-denied");

  await prisma.preset.delete({ where: { id } });
  revalidatePath("/teacher/presets");
  redirect("/teacher/presets?flash=deleted");
}

const presetImageSchema = z.object({
  id: z.string().cuid(),
  imagePublicId: z.string().optional().or(z.literal("")),
});

export async function updatePresetImageAdminAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SCHOOL_ADMIN" || !session.user.schoolId) {
    redirect("/access-denied");
  }
  const parsed = presetImageSchema.safeParse({
    id: formData.get("id")?.toString(),
    imagePublicId: formData.get("imagePublicId")?.toString().trim() || undefined,
  });
  if (!parsed.success) redirect("/access-denied");

  const preset = await prisma.preset.findUnique({ where: { id: parsed.data.id } });
  if (!preset || preset.schoolId !== session.user.schoolId) redirect("/access-denied");

  await prisma.preset.update({
    where: { id: parsed.data.id },
    data: { imagePublicId: normalizeFolderedPublicId(parsed.data.imagePublicId, "poleapp/presets") },
  });

  revalidatePath("/teacher/presets");
}
