"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  randomDefaultAvatarPublicId,
} from "@/lib/cloudinary";

const basePath = "/admin/users";

const createSchema = z.object({
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  password: z.string().min(6),
  role: z.enum(["STUDENT", "TEACHER", "SCHOOL_ADMIN"]),
  isPremium: z.string().optional(),
});

const updateSchema = z.object({
  userId: z.string().cuid(),
  role: z.enum(["STUDENT", "TEACHER", "SCHOOL_ADMIN"]),
  firstName: z.string(),
  lastName: z.string(),
  isPremium: z.string().optional(),
});

const toggleSchema = z.object({
  userId: z.string().cuid(),
  action: z.enum(["disable", "enable"]),
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
    firstName: formData.get("firstName") || undefined,
    lastName: formData.get("lastName") || undefined,
    password: formData.get("password"),
    role: formData.get("role"),
    isPremium: formData.get("isPremium") || undefined,
  });
  if (!parsed.success) {
    throw new Error("Formulaire invalide");
  }
  const data = parsed.data;

  const firstName = data.firstName?.toString().trim();
  const lastName = data.lastName?.toString().trim();
  if (!firstName || !lastName) {
    redirectWithMessage("Prénom et nom sont requis", "error");
  }

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    redirectWithMessage("Email déjà utilisé", "error");
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  const isPremium = Boolean(data.isPremium);
  const credits = data.role === "STUDENT" ? (isPremium ? 1000 : 0) : 0;
  const defaultAvatar = randomDefaultAvatarPublicId();

  await prisma.user.create({
    data: {
      email: data.email,
      name: `${firstName} ${lastName}`.trim(),
      passwordHash,
      role: data.role,
      isPremium,
      credits,
      schoolId: admin.schoolId,
      avatarPublicId: defaultAvatar ?? undefined,
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
    firstName: formData.get("firstName") || undefined,
    lastName: formData.get("lastName") || undefined,
    isPremium: formData.get("isPremium") || undefined,
  });
  if (!parsed.success) {
    throw new Error("Formulaire invalide");
  }
  const data = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: data.userId },
    select: { schoolId: true, avatarPublicId: true },
  });
  if (!user || user.schoolId !== admin.schoolId) {
    redirect("/access-denied");
  }

  const firstName = data.firstName?.toString().trim();
  const lastName = data.lastName?.toString().trim();
  if (!firstName || !lastName) {
    redirectWithMessage("Prénom et nom sont requis", "error");
  }
  const fullName = `${firstName} ${lastName}`.trim();

  await prisma.user.update({
    where: { id: data.userId },
    data: {
      role: data.role,
      name: fullName,
      isPremium: Boolean(data.isPremium),
    },
  });

  revalidatePath(basePath);
  redirectWithMessage("Utilisateur mis à jour");
}

export async function toggleUserAction(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = toggleSchema.safeParse({ userId: formData.get("userId"), action: formData.get("action") });
  if (!parsed.success) {
    throw new Error("Formulaire invalide");
  }
  const data = parsed.data;

  if (data.userId === admin.id) {
    redirectWithMessage("Impossible de désactiver votre propre compte", "error");
  }

  const user = await prisma.user.findUnique({
    where: { id: data.userId },
    select: { schoolId: true, avatarPublicId: true, disabledAt: true },
  });
  if (!user || user.schoolId !== admin.schoolId) {
    redirect("/access-denied");
  }

  if (data.action === "disable") {
    if (user.disabledAt) {
      redirectWithMessage("Compte déjà désactivé", "error");
    }
    await prisma.user.update({
      where: { id: data.userId },
      data: {
        disabledAt: new Date(),
        disabledById: admin.id,
      },
    });
    revalidatePath(basePath);
    redirectWithMessage("Utilisateur désactivé");
  }

  if (!user.disabledAt && data.action === "enable") {
    redirectWithMessage("Compte déjà actif", "error");
  }

  await prisma.user.update({
    where: { id: data.userId },
    data: {
      disabledAt: null,
      disabledById: null,
    },
  });

  revalidatePath(basePath);
  redirectWithMessage("Utilisateur réactivé");
}
