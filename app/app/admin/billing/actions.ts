"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { InvoiceStatus } from "@prisma/client";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateInvoiceSchema = z.object({
  invoiceId: z.string().min(1),
  status: z.nativeEnum(InvoiceStatus),
  amount: z
    .string()
    .optional()
    .transform((val) => {
      if (!val || val.trim().length === 0) return undefined;
      const parsed = Number.parseFloat(val.replace(",", "."));
      return Number.isNaN(parsed) ? undefined : Math.round(parsed * 100);
    })
    .refine((v) => v === undefined || v >= 0, "Montant invalide"),
  note: z.string().optional(),
});

export async function updateInvoiceStatusAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SCHOOL_ADMIN") {
    throw new Error("Accès refusé");
  }
  const parsed = updateInvoiceSchema.safeParse({
    invoiceId: formData.get("invoiceId")?.toString(),
    status: formData.get("status")?.toString(),
    amount: formData.get("amount")?.toString(),
    note: formData.get("note")?.toString(),
  });
  if (!parsed.success) {
    throw new Error("Paramètres invalides");
  }
  const { invoiceId, status: statusStr, amount: parsedAmount, note } = parsed.data;

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { course: true },
  });
  if (!invoice || invoice.course.schoolId !== session.user.schoolId) {
    throw new Error("Facture introuvable");
  }

  const paidAt = statusStr === InvoiceStatus.PAID ? new Date() : null;
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: statusStr,
      ...(paidAt ? { paidAt } : { paidAt: null }),
      ...(parsedAmount !== undefined ? { amountCents: parsedAmount } : {}),
      note: note ?? undefined,
    },
  });
  revalidatePath("/app/admin/billing");
}
