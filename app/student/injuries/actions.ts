"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  injuryTypeId: z.string().min(1),
  notes: z.string().optional(),
});

const updateSchema = z.object({
  injuryId: z.string().min(1),
  notes: z.string().optional(),
  isActive: z
    .preprocess(
      (value) => {
        if (typeof value === "string") {
          return value === "true";
        }
        if (typeof value === "boolean") {
          return value;
        }
        return undefined;
      },
      z.boolean()
    )
    .optional(),
});

const deleteSchema = z.object({
  injuryId: z.string().cuid(),
});

async function assertStudentSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function createInjuryAction(formData: FormData) {
  const session = await assertStudentSession();
  const parsed = createSchema.safeParse({
    injuryTypeId: formData.get("injuryTypeId"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    throw new Error("Formulaire invalide");
  }

  await prisma.studentInjury.create({
    data: {
      studentId: session.user.id,
      injuryTypeId: parsed.data.injuryTypeId,
      notes: parsed.data.notes?.toString().trim() || null,
      isActive: true,
    },
  });

  revalidatePath("/student/injuries");
  redirect("/student/injuries");
}

export async function updateInjuryAction(formData: FormData) {
  const session = await assertStudentSession();
  const parsed = updateSchema.safeParse({
    injuryId: formData.get("injuryId"),
    notes: formData.get("notes") ?? "",
    isActive: formData.get("isActive"),
  });
  if (!parsed.success) {
    throw new Error("Formulaire invalide");
  }

  const injury = await prisma.studentInjury.findUnique({
    where: { id: parsed.data.injuryId },
    select: { studentId: true, isActive: true },
  });
  if (!injury || injury.studentId !== session.user.id) {
    throw new Error("Injury introuvable");
  }

  const nextIsActive = parsed.data.isActive ?? injury.isActive;

  await prisma.studentInjury.update({
    where: { id: parsed.data.injuryId },
    data: {
      notes: parsed.data.notes?.toString().trim() || null,
      isActive: nextIsActive,
    },
  });

  revalidatePath("/student/injuries");
  redirect("/student/injuries");
}

export async function deleteInjuryAction(formData: FormData) {
  const session = await assertStudentSession();
  const parsed = deleteSchema.safeParse({
    injuryId: formData.get("injuryId"),
  });
  if (!parsed.success) {
    throw new Error("Formulaire invalide");
  }

  const injury = await prisma.studentInjury.findUnique({
    where: { id: parsed.data.injuryId },
    select: { studentId: true },
  });
  if (!injury || injury.studentId !== session.user.id) {
    throw new Error("Injury introuvable");
  }

  await prisma.studentInjury.delete({
    where: { id: parsed.data.injuryId },
  });

  revalidatePath("/student/injuries");
  redirect("/student/injuries");
}
