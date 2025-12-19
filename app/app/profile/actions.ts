"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z
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
    name: formData.get("name")?.toString() || undefined,
  });

  if (!parsed.success) {
    throw new Error("Formulaire invalide");
  }

  const { name } = parsed.data;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name: name || null },
  });

  revalidatePath("/app/profile");
  redirect("/app/profile");
}
