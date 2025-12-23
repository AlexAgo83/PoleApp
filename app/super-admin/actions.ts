"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const basePath = "/super-admin";

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/access-denied");
  }
  return session.user;
}

async function logAudit(action: string, target?: string, details?: unknown) {
  const session = await getServerSession(authOptions);
  const actorId = session?.user?.id;
  await prisma.auditLog.create({
    data: {
      actorId: actorId ?? undefined,
      action,
      target,
      details: details as any,
    },
  });
}

const settingsSchema = z.object({
  vatPercent: z.coerce.number().min(0).max(100),
  currency: z.string().min(1).max(8),
});

export async function updateSettingsAction(formData: FormData) {
  await requireSuperAdmin();
  const parsed = settingsSchema.safeParse({
    vatPercent: formData.get("vatPercent"),
    currency: formData.get("currency"),
  });
  if (!parsed.success) throw new Error("Paramètres invalides");
  await prisma.globalSetting.upsert({
    where: { id: "global" },
    update: {
      defaultVatPercent: parsed.data.vatPercent,
      currency: parsed.data.currency.trim().toUpperCase(),
    },
    create: {
      id: "global",
      defaultVatPercent: parsed.data.vatPercent,
      currency: parsed.data.currency.trim().toUpperCase(),
    },
  });
  await logAudit("settings:update", "global", parsed.data);
  revalidatePath(basePath);
}

const schoolSchema = z.object({
  name: z.string().min(2),
  website: z.string().url().optional().or(z.literal("")).transform((v) => v || undefined),
});

export async function createSchoolAction(formData: FormData) {
  const admin = await requireSuperAdmin();
  const parsed = schoolSchema.safeParse({
    name: formData.get("name"),
    website: formData.get("website")?.toString().trim(),
  });
  if (!parsed.success) throw new Error("École invalide");
  const school = await prisma.school.create({
    data: {
      name: parsed.data.name.trim(),
      website: parsed.data.website,
    },
  });
  await logAudit("school:create", school.id, { name: school.name, by: admin.email });
  revalidatePath(basePath);
}

export async function toggleArchiveSchoolAction(formData: FormData) {
  const admin = await requireSuperAdmin();
  const schoolId = formData.get("schoolId")?.toString();
  const mode = formData.get("mode")?.toString();
  if (!schoolId || !mode) throw new Error("Requête invalide");

  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) {
    throw new Error("École introuvable");
  }

  const archivedAt = mode === "archive" ? new Date() : null;
  await prisma.school.update({
    where: { id: schoolId },
    data: { archivedAt },
  });
  await logAudit(`school:${mode}`, schoolId, { name: school.name, by: admin.email });
  revalidatePath(basePath);
}

const assignAdminSchema = z.object({
  schoolId: z.string().cuid(),
  email: z.string().email(),
});

export async function assignSchoolAdminAction(formData: FormData) {
  const admin = await requireSuperAdmin();
  const parsed = assignAdminSchema.safeParse({
    schoolId: formData.get("schoolId"),
    email: formData.get("email"),
  });
  if (!parsed.success) throw new Error("Formulaire invalide");

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) throw new Error("Utilisateur introuvable");

  await prisma.user.update({
    where: { email: parsed.data.email },
    data: {
      role: "SCHOOL_ADMIN",
      schoolId: parsed.data.schoolId,
    },
  });
  await logAudit("school:assign-admin", parsed.data.schoolId, { email: user.email, by: admin.email });
  revalidatePath(basePath);
}

const promoteSchema = z.object({
  email: z.string().email(),
  action: z.enum(["promote", "demote"]),
});

export async function promoteSuperAdminAction(formData: FormData) {
  const admin = await requireSuperAdmin();
  const parsed = promoteSchema.safeParse({
    email: formData.get("email"),
    action: formData.get("action"),
  });
  if (!parsed.success) throw new Error("Formulaire invalide");

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) throw new Error("Utilisateur introuvable");

  const newRole = parsed.data.action === "promote" ? "SUPER_ADMIN" : user.schoolId ? "SCHOOL_ADMIN" : "STUDENT";

  await prisma.user.update({
    where: { email: parsed.data.email },
    data: { role: newRole },
  });
  await logAudit(`super-admin:${parsed.data.action}`, user.id, {
    email: user.email,
    by: admin.email,
  });
  revalidatePath(basePath);
}

function euroToCents(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.round(value * 100);
}

function parseNumberInput(val: FormDataEntryValue | null) {
  if (val === null || val === undefined) return undefined;
  const str = val.toString().replace(",", ".");
  const num = Number.parseFloat(str);
  return Number.isNaN(num) ? undefined : num;
}

const subscriptionSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().min(2),
  monthly: z.number().min(0).optional().default(0),
  annual: z.number().min(0).optional().default(0),
  credits: z.number().min(0).optional().default(0),
  vat: z.number().min(0).max(100).optional().default(20),
  sortOrder: z.number().min(0).optional().default(0),
  defaultTerm: z.string().optional(),
  isActive: z.string().optional(),
  isOpen: z.string().optional(),
});

export async function upsertSubscriptionOfferAction(formData: FormData) {
  await requireSuperAdmin();
  const parsed = subscriptionSchema.safeParse({
    id: formData.get("id") ?? undefined,
    name: formData.get("name"),
    monthly: parseNumberInput(formData.get("monthly")) ?? 0,
    annual: parseNumberInput(formData.get("annual")) ?? 0,
    credits: parseNumberInput(formData.get("credits")) ?? 0,
    vat: parseNumberInput(formData.get("vat")) ?? 20,
    sortOrder: parseNumberInput(formData.get("sortOrder")) ?? 0,
    defaultTerm: formData.get("defaultTerm") || undefined,
    isActive: formData.get("isActive"),
    isOpen: formData.get("isOpen"),
  });
  if (!parsed.success) {
    const err = parsed.error.errors
      ?.map((e) => `${e.path?.join?.(".") || "champ"}: ${e.message}`)
      .join("; ") || "Données invalides";
    // Log pour debug console
    // eslint-disable-next-line no-console
    console.error("super-admin invalid offer", err, { form: Object.fromEntries(formData.entries()) });
    const qs = new URLSearchParams({ flash: "invalid-offer", error: err });
    revalidatePath(basePath);
    redirect(`${basePath}?${qs.toString()}`);
  }

  const payload = {
    name: parsed.data.name.trim(),
    monthlyPriceCents: euroToCents(parsed.data.monthly),
    annualPriceCents: euroToCents(parsed.data.annual),
    monthlyCredits: parsed.data.credits,
    vatPercent: parsed.data.vat,
    sortOrder: parsed.data.sortOrder,
    defaultTerm: parsed.data.defaultTerm?.trim() || null,
    isActive: Boolean(parsed.data.isActive),
    isOpen: Boolean(parsed.data.isOpen),
  };

  if (parsed.data.id) {
    await prisma.subscriptionOffer.update({ where: { id: parsed.data.id }, data: payload });
    await logAudit("offer:subscription:update", parsed.data.id, payload);
  } else {
    const created = await prisma.subscriptionOffer.create({ data: payload });
    await logAudit("offer:subscription:create", created.id, payload);
  }
  revalidatePath(basePath);
}

const packSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().min(2),
  credits: z.number().min(0).optional().default(0),
  price: z.number().min(0).optional().default(0),
  vat: z.number().min(0).max(100).optional().default(20),
  sortOrder: z.number().min(0).optional().default(0),
  isActive: z.string().optional(),
  isOpen: z.string().optional(),
});

export async function upsertCreditPackOfferAction(formData: FormData) {
  await requireSuperAdmin();
  const parsed = packSchema.safeParse({
    id: formData.get("id") ?? undefined,
    name: formData.get("name"),
    credits: parseNumberInput(formData.get("credits")) ?? 0,
    price: parseNumberInput(formData.get("price")) ?? 0,
    vat: parseNumberInput(formData.get("vat")) ?? 20,
    sortOrder: parseNumberInput(formData.get("sortOrder")) ?? 0,
    isActive: formData.get("isActive"),
    isOpen: formData.get("isOpen"),
  });
  if (!parsed.success) {
    const err = parsed.error.errors
      ?.map((e) => `${e.path?.join?.(".") || "champ"}: ${e.message}`)
      .join("; ") || "Données invalides";
    // eslint-disable-next-line no-console
    console.error("super-admin invalid pack", err, { form: Object.fromEntries(formData.entries()) });
    const qs = new URLSearchParams({ flash: "invalid-pack", error: err });
    revalidatePath(basePath);
    redirect(`${basePath}?${qs.toString()}`);
  }

  const payload = {
    name: parsed.data.name.trim(),
    credits: parsed.data.credits,
    priceCents: euroToCents(parsed.data.price),
    vatPercent: parsed.data.vat,
    sortOrder: parsed.data.sortOrder,
    isActive: Boolean(parsed.data.isActive),
    isOpen: Boolean(parsed.data.isOpen),
  };

  if (parsed.data.id) {
    await prisma.creditPackOffer.update({ where: { id: parsed.data.id }, data: payload });
    await logAudit("offer:pack:update", parsed.data.id, payload);
  } else {
    const created = await prisma.creditPackOffer.create({ data: payload });
    await logAudit("offer:pack:create", created.id, payload);
  }
  revalidatePath(basePath);
}

export async function deleteSubscriptionOfferAction(formData: FormData) {
  await requireSuperAdmin();
  const id = formData.get("id")?.toString();
  if (!id) throw new Error("ID manquant");
  await prisma.subscriptionOffer.delete({ where: { id } });
  await logAudit("offer:subscription:delete", id);
  revalidatePath(basePath);
}

export async function deleteCreditPackOfferAction(formData: FormData) {
  await requireSuperAdmin();
  const id = formData.get("id")?.toString();
  if (!id) throw new Error("ID manquant");
  await prisma.creditPackOffer.delete({ where: { id } });
  await logAudit("offer:pack:delete", id);
  revalidatePath(basePath);
}
