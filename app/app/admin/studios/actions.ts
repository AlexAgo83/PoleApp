"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  name: z.string().trim().min(1),
  address: z.string().trim().optional(),
  photoUrl: z.string().trim().url().max(2048).optional(),
});

const updateSchema = z.object({
  id: z.string().cuid(),
  name: z.string().trim().min(1),
  address: z.string().trim().optional(),
  photoUrl: z.string().trim().url().max(2048).optional(),
});

const deleteSchema = z.object({
  id: z.string().cuid(),
});

const basePath = "/app/admin/studios";

function sanitizeRedirect(redirectTo: unknown): string | null {
  if (typeof redirectTo !== "string") return null;
  if (!redirectTo.startsWith("/")) return null;
  return redirectTo;
}

async function requireAdminWithSchool() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SCHOOL_ADMIN" || !session.user.schoolId) {
    redirect("/access-denied");
  }
  return session.user.schoolId;
}

export async function createStudioAction(formData: FormData) {
  const schoolId = await requireAdminWithSchool();
  const redirectTo = sanitizeRedirect(formData.get("redirectTo"));
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
  if (redirectTo && redirectTo !== basePath) {
    revalidatePath(redirectTo);
  }
  redirect(`${redirectTo ?? basePath}?flash=created`);
}

export async function updateStudioAction(formData: FormData) {
  const schoolId = await requireAdminWithSchool();
  const redirectTo = sanitizeRedirect(formData.get("redirectTo"));
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
  if (redirectTo && redirectTo !== basePath) {
    revalidatePath(redirectTo);
  }
  redirect(`${redirectTo ?? basePath}?flash=updated`);
}

export async function deleteStudioAction(formData: FormData) {
  const schoolId = await requireAdminWithSchool();
  const redirectTo = sanitizeRedirect(formData.get("redirectTo"));
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
  if (redirectTo && redirectTo !== basePath) {
    revalidatePath(redirectTo);
  }
  redirect(`${redirectTo ?? basePath}?flash=deleted`);
}
