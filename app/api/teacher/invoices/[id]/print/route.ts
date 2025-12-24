import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "TEACHER" || !session.user.schoolId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const resolvedParams = await context.params;
  const url = new URL(request.url);
  const invoiceId = resolvedParams?.id || url.searchParams.get("id") || undefined;
  if (!invoiceId) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, course: { teacherId: session.user.id, schoolId: session.user.schoolId } },
    include: {
      course: {
        include: {
          studio: true,
          teacher: { select: { name: true, email: true } },
        },
      },
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const course = invoice.course;
  const issued = invoice.issuedAt?.toLocaleDateString("fr-FR") ?? "—";
  const paid = invoice.paidAt?.toLocaleDateString("fr-FR") ?? "—";
  const amount = (invoice.amountCents ?? 0) / 100;
  const currency = invoice.currency || "EUR";

  const html = `<!doctype html>
  <html lang="fr">
    <head>
      <meta charset="utf-8" />
      <title>Facture ${invoice.id}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 24px; background: #0f172a; color: #e2e8f0; }
        .card { background: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 20px; }
        h1 { margin: 0 0 8px; font-size: 20px; color: #fff; }
        h2 { margin: 16px 0 8px; font-size: 16px; color: #cbd5e1; }
        .row { display: flex; justify-content: space-between; margin: 4px 0; }
        .badge { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 999px; font-weight: 600; font-size: 12px; }
        .status { background: #0ea5e9; color: #fff; }
        .muted { color: #94a3b8; font-size: 14px; }
        .amount { font-size: 20px; font-weight: 700; color: #fff; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Facture cours ${course?.title ?? "Sans titre"}</h1>
        <div class="row"><span>ID facture</span><span>${invoice.id}</span></div>
        <div class="row"><span>Date d'émission</span><span>${issued}</span></div>
        <div class="row"><span>Statut</span><span class="badge status">${invoice.status}</span></div>
        <div class="row"><span>Montant</span><span class="amount">${amount.toFixed(2)} ${currency}</span></div>
        ${invoice.vatPercent ? `<div class="row"><span>TVA</span><span>${invoice.vatPercent}% incluse</span></div>` : ""}
        <div class="row"><span>Payée le</span><span>${paid}</span></div>
        <h2>Cours</h2>
        <div class="row"><span>Titre</span><span>${course?.title ?? "Cours"}</span></div>
        <div class="row"><span>Date</span><span>${course?.date.toLocaleString("fr-FR", { hour12: false }) ?? "—"}</span></div>
        <div class="row"><span>Studio</span><span>${course?.studio?.name ?? "—"}</span></div>
        <div class="row"><span>Professeur</span><span>${course?.teacher?.name ?? course?.teacher?.email ?? "—"}</span></div>
        ${invoice.note ? `<h2>Note</h2><p class="muted">${invoice.note}</p>` : ""}
      </div>
    </body>
  </html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
