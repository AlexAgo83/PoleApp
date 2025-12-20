"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const signupSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Mot de passe trop court (8 caractères min)"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  schoolId: z.string().optional(),
  isPremium: z.coerce.boolean().optional(),
});

function normalize(input: FormDataEntryValue | null | undefined) {
  if (typeof input !== "string") return undefined;
  const trimmed = input.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export async function signupStudentAction(formData: FormData) {
  const parsed = signupSchema.safeParse({
    email: normalize(formData.get("email")),
    password: formData.get("password"),
    firstName: normalize(formData.get("firstName")),
    lastName: normalize(formData.get("lastName")),
    schoolId: normalize(formData.get("schoolId")),
    isPremium: formData.get("isPremium"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Formulaire invalide";
    redirect(`/signup?error=${encodeURIComponent(message)}`);
  }

  const data = parsed.data;

  // Use chosen school or fallback to the first one
  const school =
    (data.schoolId
      ? await prisma.school.findUnique({ where: { id: data.schoolId } })
      : await prisma.school.findFirst({ orderBy: { createdAt: "asc" } })) ?? undefined;

  const passwordHash = await bcrypt.hash(data.password, 10);
  const name = [data.firstName, data.lastName].filter(Boolean).join(" ").trim() || null;
  const isPremium = Boolean(data.isPremium);
  const credits = isPremium ? 1000 : 0;

  try {
    await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        role: "STUDENT",
        name,
        isPremium,
        credits,
        schoolId: school?.id,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Création impossible";
    if (message.includes("Unique constraint") || message.includes("Unique constraint failed")) {
      throw new Error("Un compte existe déjà avec cet email.");
    }
    throw new Error("Erreur lors de la création du compte.");
  }

  redirect("/login?signup=success");
}
