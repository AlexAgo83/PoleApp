"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const packPurchaseSchema = z.object({
  packId: z.string().cuid(),
});

const subscriptionPurchaseSchema = z.object({
  subscriptionId: z.string().cuid(),
});

export async function demoAddCreditsAction(formData: FormData) {
  // Legacy fallback
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    redirect("/access-denied");
  }

  const credits = Number(formData.get("credits") ?? 0);
  if (!Number.isFinite(credits) || credits <= 0) {
    throw new Error("Crédits invalides");
  }
  await prisma.user.update({
    where: { id: session.user.id },
    data: { credits: { increment: credits } },
  });
  revalidatePath("/app/student");
}

export async function buyPackAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    redirect("/access-denied");
  }
  const parsed = packPurchaseSchema.safeParse({
    packId: formData.get("packId"),
  });
  if (!parsed.success) throw new Error("Pack invalide");

  const pack = await prisma.creditPackOffer.findFirst({
    where: { id: parsed.data.packId, isActive: true, isOpen: true },
  });
  if (!pack) throw new Error("Pack non disponible");

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: session.user!.id },
      data: { credits: { increment: pack.credits } },
    });
    await tx.purchase.create({
      data: {
        userId: session.user!.id,
        offerId: pack.id,
        offerName: pack.name,
        kind: "PACK",
        amountCents: pack.priceCents,
        vatPercent: pack.vatPercent ?? 20,
        currency: "EUR",
        creditsGranted: pack.credits,
        isPremiumGranted: false,
        status: "PAID",
      },
    });
  });

  revalidatePath("/app/student");
  revalidatePath("/app/student/courses");
  revalidatePath("/app/student/courses/agenda");
}

export async function buySubscriptionAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    redirect("/access-denied");
  }
  const parsed = subscriptionPurchaseSchema.safeParse({
    subscriptionId: formData.get("subscriptionId"),
  });
  if (!parsed.success) throw new Error("Abonnement invalide");

  const sub = await prisma.subscriptionOffer.findFirst({
    where: { id: parsed.data.subscriptionId, isActive: true, isOpen: true },
  });
  if (!sub) throw new Error("Abonnement indisponible");

  const creditsToGrant = sub.monthlyCredits ?? 1000;
  const amountCents = sub.monthlyPriceCents ?? sub.annualPriceCents ?? 0;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: session.user!.id },
      data: {
        credits: { increment: creditsToGrant },
        isPremium: true,
      },
    });
    await tx.purchase.create({
      data: {
        userId: session.user!.id,
        offerId: sub.id,
        offerName: sub.name,
        kind: "SUBSCRIPTION",
        amountCents,
        vatPercent: sub.vatPercent ?? 20,
        currency: "EUR",
        creditsGranted: creditsToGrant,
        isPremiumGranted: true,
        status: "PAID",
      },
    });
  });

  revalidatePath("/app/student");
  revalidatePath("/app/student/courses");
  revalidatePath("/app/student/courses/agenda");
}
