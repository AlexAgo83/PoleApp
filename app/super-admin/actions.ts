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

export async function upsertSubscriptionOfferAction(formData: FormData) {
  await requireSuperAdmin();
  const name = formData.get("name")?.toString().trim() ?? "";
  const monthly = toNumberOrZero(formData.get("monthly"));
  const annual = toNumberOrZero(formData.get("annual"));
  const credits = toNumberOrZero(formData.get("credits"));
  const vat = toNumberOrZero(formData.get("vat"), 20);
  const sortOrder = toNumberOrZero(formData.get("sortOrder"));
  const defaultTerm = (formData.get("defaultTerm") || "MONTHLY").toString().toUpperCase();
  const isActive = Boolean(formData.get("isActive"));
  const isOpen = Boolean(formData.get("isOpen"));

  const errors: string[] = [];
  if (name.length < 2) errors.push("Nom requis (min 2)");
  if (monthly < 0 || Number.isNaN(monthly)) errors.push("Prix mensuel invalide");
  if (annual < 0 || Number.isNaN(annual)) errors.push("Prix annuel invalide");
  if (credits < 0 || Number.isNaN(credits)) errors.push("Crédits mensuels invalides");
  if (vat < 0 || vat > 100 || Number.isNaN(vat)) errors.push("TVA invalide");
  if (!["MONTHLY", "ANNUAL"].includes(defaultTerm)) errors.push("Term par défaut invalide");

  if (errors.length > 0) {
    const qs = new URLSearchParams({ flash: "invalid-offer", error: errors.join("; ") });
    // eslint-disable-next-line no-console
    console.error("super-admin invalid offer", errors.join("; "), { form: Object.fromEntries(formData.entries()) });
    revalidatePath(basePath);
    redirect(`${basePath}?${qs.toString()}`);
  }

  const payload = {
    name,
    monthlyPriceCents: euroToCents(monthly),
    annualPriceCents: euroToCents(annual),
    monthlyCredits: credits,
    vatPercent: vat,
    sortOrder,
    defaultTerm,
    isActive,
    isOpen,
  };

  const id = formData.get("id")?.toString();
  if (id) {
    await prisma.subscriptionOffer.update({ where: { id }, data: payload });
    await logAudit("offer:subscription:update", id, payload);
  } else {
    const created = await prisma.subscriptionOffer.create({ data: payload });
    await logAudit("offer:subscription:create", created.id, payload);
  }
  revalidatePath(basePath);
}

export async function upsertCreditPackOfferAction(formData: FormData) {
  await requireSuperAdmin();
  const name = formData.get("name")?.toString().trim() ?? "";
  const credits = toNumberOrZero(formData.get("credits"));
  const price = toNumberOrZero(formData.get("price"));
  const vat = toNumberOrZero(formData.get("vat"), 20);
  const sortOrder = toNumberOrZero(formData.get("sortOrder"));
  const isActive = Boolean(formData.get("isActive"));
  const isOpen = Boolean(formData.get("isOpen"));

  const errors: string[] = [];
  if (name.length < 2) errors.push("Nom requis (min 2)");
  if (credits < 0 || Number.isNaN(credits)) errors.push("Crédits invalides");
  if (price < 0 || Number.isNaN(price)) errors.push("Prix invalide");
  if (vat < 0 || vat > 100 || Number.isNaN(vat)) errors.push("TVA invalide");

  if (errors.length > 0) {
    const qs = new URLSearchParams({ flash: "invalid-pack", error: errors.join("; ") });
    // eslint-disable-next-line no-console
    console.error("super-admin invalid pack", errors.join("; "), { form: Object.fromEntries(formData.entries()) });
    revalidatePath(basePath);
    redirect(`${basePath}?${qs.toString()}`);
  }

  const payload = {
    name,
    credits,
    priceCents: euroToCents(price),
    vatPercent: vat,
    sortOrder,
    isActive,
    isOpen,
  };

  const id = formData.get("id")?.toString();
  if (id) {
    await prisma.creditPackOffer.update({ where: { id }, data: payload });
    await logAudit("offer:pack:update", id, payload);
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

function toNumberOrZero(val: FormDataEntryValue | null, fallback = 0) {
  if (val === null || val === undefined) return fallback;
  const str = val.toString().replace(",", ".");
  const num = Number.parseFloat(str);
  return Number.isNaN(num) ? fallback : num;
}
