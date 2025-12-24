"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const addCreditsSchema = z.object({
  credits: z.coerce.number().min(1).max(10_000),
  packId: z.string().optional(),
  packName: z.string().optional(),
});

export async function demoAddCreditsAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    redirect("/access-denied");
  }

  const parsed = addCreditsSchema.safeParse({
    credits: formData.get("credits"),
    packId: formData.get("packId") || undefined,
    packName: formData.get("packName") || undefined,
  });

  if (!parsed.success) {
    throw new Error("Formulaire invalide");
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { credits: { increment: parsed.data.credits } },
  });

  try {
    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "demo_purchase",
        target: parsed.data.packId ?? parsed.data.packName ?? "credits_pack",
        details: {
          credits: parsed.data.credits,
          packId: parsed.data.packId,
          packName: parsed.data.packName,
          ts: new Date().toISOString(),
        },
      },
    });
  } catch (err) {
    console.warn("audit demo_purchase failed", err);
  }

  revalidatePath("/app/student");
  revalidatePath("/app/student/courses");
  revalidatePath("/app/student/courses/agenda");
}
