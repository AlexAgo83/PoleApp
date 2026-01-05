"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createVerificationToken } from "@/lib/emailVerification";
import { sendMail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";

const signupSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Mot de passe trop court (8 caractères min)"),
  confirmPassword: z.string().min(8, "Mot de passe trop court (8 caractères min)"),
  firstName: z.string().min(1, "Prénom requis"),
  lastName: z.string().min(1, "Nom requis"),
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
    confirmPassword: formData.get("confirmPassword"),
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
  if (data.password !== data.confirmPassword) {
    redirect(`/signup?error=${encodeURIComponent("Les mots de passe ne correspondent pas")}`);
  }

  // Use chosen school or fallback to the first one
  const school =
    (data.schoolId
      ? await prisma.school.findUnique({ where: { id: data.schoolId } })
      : await prisma.school.findFirst({ orderBy: { createdAt: "asc" } })) ?? undefined;

  const passwordHash = await bcrypt.hash(data.password, 10);
  const name = [data.firstName, data.lastName].filter(Boolean).join(" ").trim() || null;
  const isPremium = Boolean(data.isPremium);
  const credits = isPremium ? 1000 : 0;
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const user = await prisma.user.create({
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

    const { token } = await createVerificationToken(user.id);
    const link = `${baseUrl}/auth/verify?token=${token}`;
    const subject = "Vérifie ton compte Pole App";
    const text = `Bonjour ${data.firstName},

Merci pour ton inscription. Clique sur ce lien pour activer ton compte :
${link}

Si tu n'es pas à l'origine de cette demande, ignore ce message.`;
    const html = `<p>Bonjour ${data.firstName},</p><p>Merci pour ton inscription. Clique sur ce lien pour activer ton compte :</p><p><a href="${link}">${link}</a></p><p>Si tu n'es pas à l'origine de cette demande, ignore ce message.</p>`;

    void sendMail({ to: user.email, subject, text, html });

    await prisma.auditLog.create({
      data: {
        action: "user:signup",
        target: user.id,
        details: { email: user.email, schoolId: school?.id },
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
