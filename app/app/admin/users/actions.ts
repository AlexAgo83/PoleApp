"use server";

import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const basePath = "/app/admin/users";

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  password: z.string().min(6),
  role: z.enum(["STUDENT", "TEACHER", "SCHOOL_ADMIN"]),
  isPremium: z.string().optional(),
});

const updateSchema = z.object({
  userId: z.string().cuid(),
  role: z.enum(["STUDENT", "TEACHER", "SCHOOL_ADMIN"]),
  name: z.string().optional(),
  isPremium: z.string().optional(),
});

const deleteSchema = z.object({
  userId: z.string().cuid(),
});

function redirectWithMessage(message: string, type: "success" | "error" = "success") {
  redirect(`${basePath}?${type}=${encodeURIComponent(message)}`);
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SCHOOL_ADMIN") {
    redirect("/access-denied");
  }
  if (!session.user.schoolId) {
    redirectWithMessage("Aucune école associée à ce compte admin", "error");
  }
  return session.user;
}

export async function createUserAction(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = createSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name") || undefined,
    password: formData.get("password"),
    role: formData.get("role"),
    isPremium: formData.get("isPremium") || undefined,
  });
  if (!parsed.success) {
    redirectWithMessage("Formulaire invalide", "error");
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    redirectWithMessage("Email déjà utilisé", "error");
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name?.toString().trim() || null,
      passwordHash,
      role: parsed.data.role,
      isPremium: Boolean(parsed.data.isPremium),
      schoolId: admin.schoolId,
    },
  });

  revalidatePath(basePath);
  redirectWithMessage("Utilisateur créé");
}

export async function updateUserAction(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = updateSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
    name: formData.get("name") || undefined,
    isPremium: formData.get("isPremium") || undefined,
  });
  if (!parsed.success) {
    redirectWithMessage("Formulaire invalide", "error");
  }

  const user = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { schoolId: true },
  });
  if (!user || user.schoolId !== admin.schoolId) {
    redirect("/access-denied");
  }

  await prisma.user.update({
    where: { id: parsed.data.userId },
    data: {
      role: parsed.data.role,
      name: parsed.data.name?.toString().trim() || null,
      isPremium: Boolean(parsed.data.isPremium),
    },
  });

  revalidatePath(basePath);
  redirectWithMessage("Utilisateur mis à jour");
}

export async function deleteUserAction(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = deleteSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) {
    redirectWithMessage("Formulaire invalide", "error");
  }

  if (parsed.data.userId === admin.id) {
    redirectWithMessage("Impossible de supprimer votre propre compte", "error");
  }

  const user = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { schoolId: true },
  });
  if (!user || user.schoolId !== admin.schoolId) {
    redirect("/access-denied");
  }

  try {
    await prisma.user.delete({ where: { id: parsed.data.userId } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      redirectWithMessage("Suppression impossible (liens cours/progression)", "error");
    }
    throw err;
  }

  revalidatePath(basePath);
  redirectWithMessage("Utilisateur supprimé");
}
