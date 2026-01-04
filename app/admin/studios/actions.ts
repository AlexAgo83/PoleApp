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
  photoPublicId: z.string().trim().max(512).optional(),
});

const updateSchema = z.object({
  id: z.string().cuid(),
  name: z.string().trim().min(1),
  address: z.string().trim().optional(),
  photoPublicId: z.string().trim().max(512).optional(),
});

const toggleSchema = z.object({
  id: z.string().cuid(),
  action: z.enum(["disable", "enable"]),
});

const basePath = "/admin/studios";

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
    photoPublicId: formData.get("photoPublicId")?.toString().trim() || undefined,
  });
  if (!parsed.success) {
    throw new Error("Formulaire invalide");
  }

  await prisma.studio.create({
    data: {
      name: parsed.data.name,
      address: parsed.data.address || null,
      photoPublicId: parsed.data.photoPublicId || null,
      schoolId,
    },
  });

  revalidatePath(basePath);
  if (redirectTo && redirectTo !== basePath) {
    revalidatePath(redirectTo);
  }
  return;
}

export async function updateStudioAction(formData: FormData) {
  const schoolId = await requireAdminWithSchool();
  const parsed = updateSchema.safeParse({
    id: formData.get("studioId"),
    name: formData.get("name"),
    address: formData.get("address") || undefined,
    photoPublicId: formData.get("photoPublicId")?.toString().trim() || undefined,
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
      photoPublicId: parsed.data.photoPublicId || null,
    },
  });

  revalidatePath(basePath);
  return;
}

export async function deleteStudioAction(formData: FormData) {
  const schoolId = await requireAdminWithSchool();
  const parsed = toggleSchema.safeParse({
    id: formData.get("studioId"),
    action: formData.get("action")?.toString().trim() as "disable" | "enable",
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

  if (parsed.data.action === "disable") {
    await prisma.studio.update({
      where: { id: parsed.data.id },
      data: { disabledAt: new Date(), disabledById: undefined },
    });
  } else {
    await prisma.studio.update({
      where: { id: parsed.data.id },
      data: { disabledAt: null, disabledById: undefined },
    });
  }

  revalidatePath(basePath);
  return;
}
