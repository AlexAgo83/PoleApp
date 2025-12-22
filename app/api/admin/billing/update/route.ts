import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { InvoiceStatus } from "@prisma/client";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
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
    const { invoiceId, status, amount, note } = parsed.data;

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { course: true },
    });
    if (!invoice || invoice.course.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: "Invoice introuvable" }, { status: 404 });
    }

    const paidAt = status === InvoiceStatus.PAID ? new Date() : null;
    const updated = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status,
        ...(paidAt ? { paidAt } : { paidAt: null }),
        ...(amount !== undefined ? { amountCents: amount } : {}),
        note: note ?? undefined,
      },
      select: {
        id: true,
        status: true,
        amountCents: true,
        currency: true,
        note: true,
        paidAt: true,
      },
    });

    return NextResponse.json({ invoice: updated });
  } catch (err) {
    console.error("update invoice failed", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
