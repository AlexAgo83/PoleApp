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
  discipline: z.string().min(1),
  videoPublicId: z.string().optional().or(z.literal("")),
  imagePublicId: z.string().optional().or(z.literal("")),
  premiumRequired: z.boolean().optional(),
  teacherId: z.string().cuid().optional(),
  priceCredits: z.coerce.number().min(0).optional(),
  positionIds: z.array(z.string().cuid()).min(1),
});
const updatePresetSchema = presetSchema.extend({
  id: z.string().cuid(),
});
const deletePresetSchema = z.object({
  id: z.string().cuid(),
});

export async function createPresetAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !session.user.schoolId || (session.user.role !== "TEACHER" && session.user.role !== "SCHOOL_ADMIN")) {
    redirect("/access-denied");
  }

  const rawPositionIds = formData.getAll("positionIds").map((id) => id.toString());
  const metaIds = formData.getAll("positionMetaId").map((id) => id.toString());
  const metaOrders = formData.getAll("positionMetaOrder").map((n) => Number(n));
  const metaTimestamps = formData.getAll("positionMetaTimestamp").map((n) =>
    n === null || n === undefined || n.toString().trim() === "" ? null : Number(n)
  );
  const metaNotes = formData.getAll("positionMetaNote").map((n) => n.toString());
  const metaById = new Map<
    string,
    { order: number; timestampSeconds: number | null; note: string | null }
  >();
  metaIds.forEach((id, idx) => {
    metaById.set(id, {
      order: Number.isFinite(metaOrders[idx]) ? Number(metaOrders[idx]) : idx + 1,
      timestampSeconds: Number.isFinite(metaTimestamps[idx]) ? Number(metaTimestamps[idx]) : null,
      note: metaNotes[idx]?.toString() || null,
    });
  });
  const disciplineInput = formData.get("discipline")?.toString().trim() || "";
  if (!disciplineInput) {
    redirect("/presets/new?flash=invalid");
  }
  const disciplineRecord = await prisma.discipline.findFirst({
    where: {
      OR: [{ id: disciplineInput }, { name: disciplineInput }],
    },
    select: { id: true, name: true },
  });
  if (!disciplineRecord) {
    redirect("/presets/new?flash=invalid");
  }
  const teacherIdRaw = formData.get("teacherId")?.toString().trim() || undefined;
  const parsed = presetSchema.safeParse({
    title: formData.get("title")?.toString().trim(),
    description: formData.get("description")?.toString().trim() || undefined,
    discipline: disciplineRecord.name,
    videoPublicId: formData.get("videoPublicId")?.toString().trim() || undefined,
    imagePublicId: formData.get("imagePublicId")?.toString().trim() || undefined,
    premiumRequired: formData.get("premiumRequired") === "on",
    teacherId: teacherIdRaw,
    priceCredits: formData.get("priceCredits") ? Number(formData.get("priceCredits")) : undefined,
    positionIds: rawPositionIds,
  });

  if (!parsed.success) {
    redirect("/presets/new?flash=invalid");
  }

  const teacherId =
    session.user.role === "SCHOOL_ADMIN" && parsed.data.teacherId
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
      disciplineId: disciplineRecord.id,
      videoPublicId: normalizeFolderedPublicId(parsed.data.videoPublicId, "poleapp/presets"),
      imagePublicId: normalizeFolderedPublicId(parsed.data.imagePublicId, "poleapp/presets"),
      premiumRequired: parsed.data.premiumRequired ?? false,
      priceCredits: parsed.data.premiumRequired ? null : parsed.data.priceCredits ?? null,
      schoolId: session.user.schoolId,
      createdByUserId: teacherId ?? session.user.id,
      positions: {
        create: parsed.data.positionIds
          .map((id, idx) => {
            const meta = metaById.get(id);
            return {
              positionId: id,
              order: meta?.order ?? idx + 1,
              timestampSeconds: meta?.timestampSeconds ?? null,
              note: meta?.note ?? null,
            };
          })
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
      },
    },
  });

  revalidatePath("/presets");
  redirect("/presets?flash=created");
}

export async function updatePresetAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !session.user.schoolId || (session.user.role !== "TEACHER" && session.user.role !== "SCHOOL_ADMIN")) {
    redirect("/access-denied");
  }

  const rawId = formData.get("id")?.toString();
  const rawPositionIds = formData.getAll("positionIds").map((id) => id.toString());
  const metaIds = formData.getAll("positionMetaId").map((id) => id.toString());
  const metaOrders = formData.getAll("positionMetaOrder").map((n) => Number(n));
  const metaTimestamps = formData.getAll("positionMetaTimestamp").map((n) =>
    n === null || n === undefined || n.toString().trim() === "" ? null : Number(n)
  );
  const metaNotes = formData.getAll("positionMetaNote").map((n) => n.toString());
  const metaById = new Map<
    string,
    { order: number; timestampSeconds: number | null; note: string | null }
  >();
  metaIds.forEach((id, idx) => {
    metaById.set(id, {
      order: Number.isFinite(metaOrders[idx]) ? Number(metaOrders[idx]) : idx + 1,
      timestampSeconds: Number.isFinite(metaTimestamps[idx]) ? Number(metaTimestamps[idx]) : null,
      note: metaNotes[idx]?.toString() || null,
    });
  });
  const disciplineInput = formData.get("discipline")?.toString().trim() || "";
  if (!disciplineInput) {
    redirect(rawId ? `/presets/${rawId}/edit?flash=invalid` : "/presets");
  }
  const disciplineRecord = await prisma.discipline.findFirst({
    where: {
      OR: [{ id: disciplineInput }, { name: disciplineInput }],
    },
    select: { id: true, name: true },
  });
  if (!disciplineRecord) {
    redirect(rawId ? `/presets/${rawId}/edit?flash=invalid` : "/presets");
  }
  const teacherIdRaw = formData.get("teacherId")?.toString().trim() || undefined;

  const parsed = updatePresetSchema.safeParse({
    id: rawId,
    title: formData.get("title")?.toString().trim(),
    description: formData.get("description")?.toString().trim() || undefined,
    discipline: disciplineRecord.name,
    videoPublicId: formData.get("videoPublicId")?.toString().trim() || undefined,
    imagePublicId: formData.get("imagePublicId")?.toString().trim() || undefined,
    premiumRequired: formData.get("premiumRequired") === "on",
    teacherId: teacherIdRaw,
    priceCredits: formData.get("priceCredits") ? Number(formData.get("priceCredits")) : undefined,
    positionIds: rawPositionIds,
  });

  if (!parsed.success) {
    redirect(rawId ? `/presets/${rawId}/edit?flash=invalid` : "/presets");
  }

  const preset = await prisma.preset.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, schoolId: true, createdByUserId: true, disciplineId: true },
  });
  if (!preset || preset.schoolId !== session.user.schoolId) redirect("/access-denied");
  if (session.user.role === "TEACHER" && preset.createdByUserId && preset.createdByUserId !== session.user.id) {
    redirect("/access-denied");
  }

  const teacherId =
    session.user.role === "SCHOOL_ADMIN" && parsed.data.teacherId
      ? await prisma.user
          .findFirst({
            where: { id: parsed.data.teacherId, schoolId: session.user.schoolId, role: "TEACHER" },
            select: { id: true },
          })
          .then((t) => t?.id)
      : preset.createdByUserId ?? session.user.id;

  await prisma.preset.update({
    where: { id: parsed.data.id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      discipline: parsed.data.discipline,
      disciplineId: disciplineRecord.id ?? preset.disciplineId ?? "",
      videoPublicId: normalizeFolderedPublicId(parsed.data.videoPublicId, "poleapp/presets"),
      imagePublicId: normalizeFolderedPublicId(parsed.data.imagePublicId, "poleapp/presets"),
      premiumRequired: parsed.data.premiumRequired ?? false,
      priceCredits: parsed.data.premiumRequired ? null : parsed.data.priceCredits ?? null,
      createdByUserId: teacherId ?? preset.createdByUserId ?? session.user.id,
      positions: {
        deleteMany: {},
        create: parsed.data.positionIds
          .map((id, idx) => {
            const meta = metaById.get(id);
            return {
              positionId: id,
              order: meta?.order ?? idx + 1,
              timestampSeconds: meta?.timestampSeconds ?? null,
              note: meta?.note ?? null,
            };
          })
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
      },
    },
  });

  revalidatePath("/presets");
  revalidatePath(`/presets/${parsed.data.id}`);
  redirect(`/presets/${parsed.data.id}?from=${encodeURIComponent(`/presets/${parsed.data.id}/edit`)}`);
}

const presetImageSchema = z.object({
  id: z.string().cuid(),
  imagePublicId: z.string().optional().or(z.literal("")),
});

export async function deletePresetAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !session.user.schoolId || (session.user.role !== "TEACHER" && session.user.role !== "SCHOOL_ADMIN")) {
    redirect("/access-denied");
  }

  const parsed = deletePresetSchema.safeParse({
    id: formData.get("presetId")?.toString(),
  });
  if (!parsed.success) redirect("/access-denied");

  const preset = await prisma.preset.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, schoolId: true, createdByUserId: true },
  });
  if (!preset || preset.schoolId !== session.user.schoolId) redirect("/access-denied");
  if (session.user.role === "TEACHER" && preset.createdByUserId && preset.createdByUserId !== session.user.id) {
    redirect("/access-denied");
  }

  await prisma.preset.delete({ where: { id: parsed.data.id } });

  revalidatePath("/presets");
  redirect("/presets?flash=deleted");
}

export async function updatePresetImageAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !session.user.schoolId || (session.user.role !== "TEACHER" && session.user.role !== "SCHOOL_ADMIN")) {
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

  revalidatePath("/presets");
}
