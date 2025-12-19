"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Mot de passe trop court"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  schoolId: z.string().cuid().optional(),
  isPremium: z.coerce.boolean().optional(),
});

export async function signupStudentAction(formData: FormData) {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    schoolId: formData.get("schoolId"),
    isPremium: formData.get("isPremium"),
  });

  if (!parsed.success) {
    throw new Error("Formulaire invalide");
  }

  const data = parsed.data;

  // Use chosen school or fallback to the first one
  const school =
    (data.schoolId
      ? await prisma.school.findUnique({ where: { id: data.schoolId } })
      : await prisma.school.findFirst({ orderBy: { createdAt: "asc" } })) ?? undefined;

  const passwordHash = await bcrypt.hash(data.password, 10);
  const name = [data.firstName, data.lastName].filter(Boolean).join(" ").trim() || null;

  try {
    await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        role: "STUDENT",
        name,
        isPremium: Boolean(data.isPremium),
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
