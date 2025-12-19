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
  const school = admin.schoolId
    ? await prisma.school.findUnique({ where: { id: admin.schoolId } })
    : null;
  if (!school) {
    redirectWithMessage("École introuvable pour cet admin", "error");
  }
  const parsed = createSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name") || undefined,
    password: formData.get("password"),
    role: formData.get("role"),
    isPremium: formData.get("isPremium") || undefined,
  });
  if (!parsed.success) {
    throw new Error("Formulaire invalide");
  }
  const data = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    redirectWithMessage("Email déjà utilisé", "error");
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  await prisma.user.create({
    data: {
      email: data.email,
      name: data.name?.toString().trim() || null,
      passwordHash,
      role: data.role,
      isPremium: Boolean(data.isPremium),
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
    throw new Error("Formulaire invalide");
  }
  const data = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: data.userId },
    select: { schoolId: true },
  });
  if (!user || user.schoolId !== admin.schoolId) {
    redirect("/access-denied");
  }

  await prisma.user.update({
    where: { id: data.userId },
    data: {
      role: data.role,
      name: data.name?.toString().trim() || null,
      isPremium: Boolean(data.isPremium),
    },
  });

  revalidatePath(basePath);
  redirectWithMessage("Utilisateur mis à jour");
}

export async function deleteUserAction(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = deleteSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) {
    throw new Error("Formulaire invalide");
  }
  const data = parsed.data;

  if (data.userId === admin.id) {
    redirectWithMessage("Impossible de supprimer votre propre compte", "error");
  }

  const user = await prisma.user.findUnique({
    where: { id: data.userId },
    select: { schoolId: true },
  });
  if (!user || user.schoolId !== admin.schoolId) {
    redirect("/access-denied");
  }

  try {
    await prisma.user.delete({ where: { id: data.userId } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      redirectWithMessage("Suppression impossible (liens cours/progression)", "error");
    }
    throw err;
  }

  revalidatePath(basePath);
  redirectWithMessage("Utilisateur supprimé");
}
