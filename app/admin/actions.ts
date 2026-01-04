"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateSchoolSchema = z.object({
  schoolId: z.string().cuid(),
  name: z.string().min(2, "Nom trop court"),
  website: z.string().trim().url({ message: "URL invalide" }).or(z.literal("")).optional(),
  photoPublicId: z.string().trim().max(512).optional(),
});

export async function updateSchoolAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SCHOOL_ADMIN" || !session.user.schoolId) {
    redirect("/access-denied");
  }

  const parsed = updateSchoolSchema.safeParse({
    schoolId: formData.get("schoolId"),
    name: formData.get("name"),
    website: (formData.get("website") ?? "") as string,
    photoPublicId: (formData.get("photoPublicId") ?? "") as string,
  });

  if (!parsed.success) {
    throw new Error("Formulaire invalide");
  }

  if (parsed.data.schoolId !== session.user.schoolId) {
    redirect("/access-denied");
  }

  const trimmedName = parsed.data.name.trim();
  const website =
    parsed.data.website && parsed.data.website.length > 0 ? parsed.data.website : null;
  const photoPublicId =
    parsed.data.photoPublicId && parsed.data.photoPublicId.length > 0
      ? parsed.data.photoPublicId
      : null;

  await prisma.school.update({
    where: { id: parsed.data.schoolId },
    data: { name: trimmedName, website, photoPublicId },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/school");
}

const disciplineSchema = z.object({
  name: z.string().trim().min(2, "Nom trop court"),
  color: z.string().trim().min(3).max(16),
});

export async function createDisciplineAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SCHOOL_ADMIN" || !session.user.schoolId) {
    redirect("/access-denied");
  }
  const parsed = disciplineSchema.safeParse({
    name: formData.get("name"),
    color: formData.get("color") ?? "#7c3aed",
  });
  if (!parsed.success) {
    return;
  }
  const name = parsed.data!.name.trim();
  const color = parsed.data!.color.trim();
  try {
    await prisma.discipline.create({
      data: {
        name,
        color,
      },
    });
    revalidatePath("/admin/school");
    revalidatePath("/admin");
    return;
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return;
    }
    throw error;
  }
}

export async function updateDisciplineAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SCHOOL_ADMIN" || !session.user.schoolId) {
    redirect("/access-denied");
  }
  const parsed = disciplineSchema
    .extend({ disciplineId: z.string().cuid() })
    .safeParse({
      disciplineId: formData.get("disciplineId"),
      name: formData.get("name"),
      color: formData.get("color") ?? "#7c3aed",
    });
  if (!parsed.success) {
    return;
  }
  const { disciplineId, name, color } = parsed.data;
  const existing = await prisma.discipline.findFirst({
    where: { id: disciplineId },
  });
  if (!existing) {
    redirect("/access-denied");
  }
  try {
    await prisma.discipline.update({
      where: { id: disciplineId },
      data: { name: name.trim(), color: color.trim() },
    });
    revalidatePath("/admin/school");
    revalidatePath("/admin");
    return;
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return;
    }
    throw error;
  }
}

export async function deleteDisciplineAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SCHOOL_ADMIN" || !session.user.schoolId) {
    redirect("/access-denied");
  }
  const disciplineId = formData.get("disciplineId") as string | null;
  const action = (formData.get("action") as string | null) ?? "disable";
  if (!disciplineId) {
    return;
  }
  const discipline = await prisma.discipline.findFirst({
    where: { id: disciplineId },
  });
  if (!discipline) {
    redirect("/access-denied");
  }

  if (action === "disable") {
    await prisma.discipline.update({
      where: { id: disciplineId },
      data: { disabledAt: new Date(), disabledById: session.user.id },
    });
  } else {
    await prisma.discipline.update({
      where: { id: disciplineId },
      data: { disabledAt: null, disabledById: null },
    });
  }
  revalidatePath("/admin/school");
  revalidatePath("/admin");
  return;
}
