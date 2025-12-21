"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  name: z.string().min(2),
  address: z.string().optional(),
  photoUrl: z.string().url().max(2048).optional(),
});

const updateSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(2),
  address: z.string().optional(),
  photoUrl: z.string().url().max(2048).optional(),
});

const deleteSchema = z.object({
  id: z.string().cuid(),
});

const basePath = "/app/admin/studios";

async function requireAdminWithSchool() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SCHOOL_ADMIN" || !session.user.schoolId) {
    redirect("/access-denied");
  }
  return session.user.schoolId;
}

export async function createStudioAction(formData: FormData) {
  const schoolId = await requireAdminWithSchool();
  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address") || undefined,
    photoUrl: formData.get("photoUrl") || undefined,
  });
  if (!parsed.success) {
    throw new Error("Formulaire invalide");
  }

  await prisma.studio.create({
    data: {
      name: parsed.data.name,
      address: parsed.data.address || null,
      photoUrl: parsed.data.photoUrl || null,
      schoolId,
    },
  });

  revalidatePath(basePath);
  redirect(basePath);
}

export async function updateStudioAction(formData: FormData) {
  const schoolId = await requireAdminWithSchool();
  const parsed = updateSchema.safeParse({
    id: formData.get("studioId"),
    name: formData.get("name"),
    address: formData.get("address") || undefined,
    photoUrl: formData.get("photoUrl") || undefined,
  });
  if (!parsed.success) {
    throw new Error("Formulaire invalide");
  }

  const exists = await prisma.studio.findFirst({
    where: { id: parsed.data.id, schoolId },
    select: { id: true },
  });
  if (!exists) {
    redirect("/access-denied");
  }

  await prisma.studio.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      address: parsed.data.address || null,
      photoUrl: parsed.data.photoUrl || null,
    },
  });

  revalidatePath(basePath);
  redirect(basePath);
}

export async function deleteStudioAction(formData: FormData) {
  const schoolId = await requireAdminWithSchool();
  const parsed = deleteSchema.safeParse({ id: formData.get("studioId") });
  if (!parsed.success) {
    throw new Error("Formulaire invalide");
  }

  const exists = await prisma.studio.findFirst({
    where: { id: parsed.data.id, schoolId },
    select: { id: true },
  });
  if (!exists) {
    redirect("/access-denied");
  }

  await prisma.course.updateMany({
    where: { studioId: parsed.data.id },
    data: { studioId: null },
  });
  await prisma.studio.delete({ where: { id: parsed.data.id } });

  revalidatePath(basePath);
  redirect(basePath);
}
