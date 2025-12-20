"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const basePath = "/app/admin/partners";

const createSchema = z.object({
  name: z.string().min(2),
  kind: z.string().min(2),
  website: z.string().url().optional(),
  description: z.string().optional(),
  sponsored: z
    .array(
      z.object({
        category: z.string().min(2),
        label: z.string().optional(),
        url: z.string().url(),
      })
    )
    .optional(),
});

const updateSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(2),
  kind: z.string().min(2),
  website: z.string().url().optional(),
  description: z.string().optional(),
  sponsored: z
    .array(
      z.object({
        id: z.string().cuid().optional(),
        category: z.string().min(2),
        label: z.string().optional(),
        url: z.string().url(),
      })
    )
    .optional(),
});

const deleteSchema = z.object({
  id: z.string().cuid(),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SCHOOL_ADMIN" || !session.user.schoolId) {
    redirect("/access-denied");
  }
  return session.user.schoolId;
}

export async function createPartnerAction(formData: FormData) {
  const schoolId = await requireAdmin();
  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    kind: formData.get("kind") || "SERVICE",
    website: formData.get("website") || undefined,
    description: formData.get("description") || undefined,
    sponsored: safeParseSponsored(formData.get("sponsored") as string),
  });
  if (!parsed.success) {
    throw new Error("Formulaire invalide");
  }

  await prisma.partner.create({
    data: {
      name: parsed.data.name,
      kind: parsed.data.kind,
      website: parsed.data.website || null,
      description: parsed.data.description || null,
      schoolId,
      sponsoredLinks: parsed.data.sponsored
        ? {
            create: parsed.data.sponsored.map((s) => ({
              category: s.category,
              label: s.label || null,
              url: s.url,
            })),
          }
        : undefined,
    },
  });

  revalidatePath(basePath);
  redirect(basePath);
}

export async function updatePartnerAction(formData: FormData) {
  const schoolId = await requireAdmin();
  const parsed = updateSchema.safeParse({
    id: formData.get("partnerId"),
    name: formData.get("name"),
    kind: formData.get("kind"),
    website: formData.get("website") || undefined,
    description: formData.get("description") || undefined,
    sponsored: safeParseSponsored(formData.get("sponsored") as string),
  });
  if (!parsed.success) {
    throw new Error("Formulaire invalide");
  }

  const exists = await prisma.partner.findFirst({
    where: { id: parsed.data.id, schoolId },
    select: { id: true },
  });
  if (!exists) {
    redirect("/access-denied");
  }

  await prisma.partner.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      kind: parsed.data.kind,
      website: parsed.data.website || null,
      description: parsed.data.description || null,
      sponsoredLinks: parsed.data.sponsored
        ? {
            deleteMany: {},
            create: parsed.data.sponsored.map((s) => ({
              category: s.category,
              label: s.label || null,
              url: s.url,
            })),
          }
        : { deleteMany: {} },
    },
  });

  revalidatePath(basePath);
  redirect(basePath);
}

export async function deletePartnerAction(formData: FormData) {
  const schoolId = await requireAdmin();
  const parsed = deleteSchema.safeParse({ id: formData.get("partnerId") });
  if (!parsed.success) {
    throw new Error("Formulaire invalide");
  }

  const exists = await prisma.partner.findFirst({
    where: { id: parsed.data.id, schoolId },
    select: { id: true },
  });
  if (!exists) {
    redirect("/access-denied");
  }

  await prisma.partner.delete({ where: { id: parsed.data.id } });
  revalidatePath(basePath);
  redirect(basePath);
}

function safeParseSponsored(raw: string | undefined) {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => ({
          category: item?.category,
          label: item?.label,
          url: item?.url,
        }))
        .filter((s) => s.category && s.url);
    }
    return undefined;
  } catch {
    return undefined;
  }
}
