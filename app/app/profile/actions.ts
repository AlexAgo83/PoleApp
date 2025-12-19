"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  firstName: z
    .string()
    .trim()
    .max(60, "Prénom trop long")
    .optional(),
  lastName: z
    .string()
    .trim()
    .max(120, "Nom trop long")
    .optional(),
});

export async function updateProfileAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/app/profile");
  }

  const parsed = schema.safeParse({
    firstName: formData.get("firstName")?.toString() || undefined,
    lastName: formData.get("lastName")?.toString() || undefined,
  });

  if (!parsed.success) {
    throw new Error("Formulaire invalide");
  }

  const { firstName, lastName } = parsed.data;
  const displayName = [firstName, lastName].filter(Boolean).join(" ").trim() || null;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name: displayName },
  });

  revalidatePath("/app/profile");
  redirect("/app/profile");
}
