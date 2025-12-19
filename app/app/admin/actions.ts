"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateSchoolSchema = z.object({
  schoolId: z.string().cuid(),
  name: z.string().min(2, "Nom trop court"),
});

export async function updateSchoolAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SCHOOL_ADMIN" || !session.user.schoolId) {
    redirect("/access-denied");
  }

  const parsed = updateSchoolSchema.safeParse({
    schoolId: formData.get("schoolId"),
    name: formData.get("name"),
  });

  if (!parsed.success) {
    throw new Error("Formulaire invalide");
  }

  if (parsed.data.schoolId !== session.user.schoolId) {
    redirect("/access-denied");
  }

  await prisma.school.update({
    where: { id: parsed.data.schoolId },
    data: { name: parsed.data.name.trim() },
  });

  revalidatePath("/app/admin");
}
