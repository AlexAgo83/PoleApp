"use server";

import { InvoiceStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const allowedStatuses: InvoiceStatus[] = ["SENT", "PAID"];

export async function updateInvoiceStatusAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.schoolId || session.user.role !== "TEACHER") {
    redirect("/access-denied");
  }

  const invoiceId = formData.get("invoiceId")?.toString();
  const status = formData.get("status")?.toString() as InvoiceStatus | undefined;

  if (!invoiceId || !status || !allowedStatuses.includes(status)) {
    throw new Error("Paramètres invalides");
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, course: { teacherId: session.user.id, schoolId: session.user.schoolId } },
    select: { id: true },
  });

  if (!invoice) {
    redirect("/access-denied");
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status, paidAt: status === "PAID" ? new Date() : null },
  });

  revalidatePath("/teacher/billing");
}

export async function sendInvoiceAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.schoolId || session.user.role !== "TEACHER") {
    redirect("/access-denied");
  }
  const invoiceId = formData.get("invoiceId")?.toString();
  if (!invoiceId) throw new Error("Paramètres invalides");

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, course: { teacherId: session.user.id, schoolId: session.user.schoolId } },
    select: { id: true },
  });
  if (!invoice) {
    redirect("/access-denied");
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "SENT" },
  });

  revalidatePath("/teacher/billing");
}
