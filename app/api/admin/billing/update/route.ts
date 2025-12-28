import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { InvoiceStatus, ManualFinancialStatus } from "@prisma/client";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  invoiceId: z.string().min(1),
  status: z.nativeEnum(InvoiceStatus).optional(),
  amount: z
    .string()
    .optional()
    .transform((val) => {
      if (!val || val.trim().length === 0) return undefined;
      const parsed = Number.parseFloat(val.replace(",", "."));
      return Number.isNaN(parsed) ? undefined : Math.round(parsed * 100);
    })
    .refine((v) => v === undefined || v >= 0, "Montant invalide"),
  manualStatus: z.nativeEnum(ManualFinancialStatus).optional(),
  manualNote: z.string().optional(),
  refund: z.boolean().optional(),
  refundNote: z.string().optional(),
});

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Payload invalide" }, { status: 400 });
    }
    const { invoiceId, status, amount, manualStatus, manualNote, refund, refundNote } = parsed.data;

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { course: true },
    });
    if (!invoice || invoice.course.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: "Invoice introuvable" }, { status: 404 });
    }

    const now = new Date();
    const paidAt = status === InvoiceStatus.PAID ? now : null;
    const data: Record<string, unknown> = {};
    if (status) {
      data.status = status;
      data.paidAt = paidAt ?? null;
    }
    if (amount !== undefined) data.amountCents = amount;
    if (manualStatus) {
      data.manualStatus = manualStatus;
      data.manualNote = manualNote || null;
      data.manualSetById = session.user.id;
      data.manualSetAt = now;
    }
    if (refund) {
      data.status = InvoiceStatus.REFUNDED;
      data.refundedAt = now;
      data.refundedById = session.user.id;
      data.refundNote = refundNote || null;
      data.paidAt = null;
    }

    const updated = await prisma.invoice.update({
      where: { id: invoiceId },
      data,
      select: {
        id: true,
        status: true,
        amountCents: true,
        currency: true,
        paidAt: true,
        manualStatus: true,
        manualNote: true,
        manualSetAt: true,
        manualSetById: true,
        manualSetBy: { select: { id: true, name: true, email: true } },
        refundedAt: true,
        refundNote: true,
        refundedById: true,
        refundedBy: { select: { id: true, name: true, email: true } },
      },
    });

    console.info(
      JSON.stringify({
        event: refund ? "invoice_refunded_api" : manualStatus ? "invoice_manual_status_updated_api" : "invoice_status_updated_api",
        invoiceId,
        previousStatus: invoice.status,
        newStatus: data.status ?? invoice.status,
        previousAmountCents: invoice.amountCents,
        newAmountCents: amount ?? invoice.amountCents,
        paidAt: data.paidAt ?? null,
        manualStatus: data.manualStatus ?? null,
        refund: refund ?? false,
        courseId: invoice.courseId,
        schoolId: invoice.course.schoolId,
        userId: session.user.id,
      })
    );

    return NextResponse.json({ invoice: updated });
  } catch (err) {
    console.error("update invoice failed", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
