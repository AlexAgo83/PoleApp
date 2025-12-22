"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { InvoiceStatus } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function updateInvoiceStatusAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SCHOOL_ADMIN") {
    throw new Error("Accès refusé");
  }
  const invoiceId = formData.get("invoiceId")?.toString();
  const statusStr = formData.get("status")?.toString() as InvoiceStatus | undefined;
  if (!invoiceId || !statusStr || !Object.values(InvoiceStatus).includes(statusStr)) {
    throw new Error("Paramètres invalides");
  }

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
      ...(paidAt ? { paidAt } : {}),
    },
  });
  revalidatePath("/app/admin/billing");
}
