import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { InvoiceStatus } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "TEACHER" || !session.user.schoolId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const invoiceId = id;
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      course: {
        include: { studio: true, teacher: { select: { name: true, email: true } } },
      },
    },
  });
  if (!invoice || invoice.course.teacherId !== session.user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const school = await prisma.school.findUnique({
    where: { id: session.user.schoolId },
    select: { name: true },
  });
  const amount = (invoice.amountCents ?? 0) / 100;
  const issuedAt = invoice.issuedAt?.toLocaleDateString("fr-FR") ?? "";
  const courseDate = invoice.course.date.toLocaleString("fr-FR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const statusLabel: Record<InvoiceStatus, string> = {
    GENERATED: "Générée",
    SENT: "Envoyée",
    PAID: "Payée",
    LATE: "En retard",
    CANCELLED: "Annulée",
  };

  const html = `<!doctype html>
  <html lang="fr">
    <head>
      <meta charset="utf-8" />
      <title>Facture ${invoice.id}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
        h1 { margin-bottom: 8px; }
        .meta { color: #444; font-size: 13px; margin-bottom: 16px; }
        .card { border: 1px solid #ddd; border-radius: 8px; padding: 16px; }
        .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .label { font-weight: 600; }
      </style>
    </head>
    <body>
      <h1>Facture cours</h1>
      <div class="meta">École : ${school?.name ?? "École"}</div>
      <div class="card">
        <div class="row"><span class="label">N°</span><span>${invoice.id}</span></div>
        <div class="row"><span class="label">Statut</span><span>${statusLabel[invoice.status]}</span></div>
        <div class="row"><span class="label">Montant</span><span>${amount.toFixed(2)} ${invoice.currency}</span></div>
        <div class="row"><span class="label">TVA</span><span>20% (par défaut)</span></div>
        <div class="row"><span class="label">Date d'émission</span><span>${issuedAt}</span></div>
        <div class="row"><span class="label">Cours</span><span>${invoice.course.title ?? "Cours"} — ${courseDate}</span></div>
        <div class="row"><span class="label">Prof</span><span>${invoice.course.teacher?.name ?? invoice.course.teacher?.email ?? "Prof"}</span></div>
        <div class="row"><span class="label">Studio</span><span>${invoice.course.studio?.name ?? "Studio"}</span></div>
      </div>
      <p style="margin-top:16px;font-size:12px;color:#555;">Document HTML imprimable (PDF à venir).</p>
    </body>
  </html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
