import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { InvoiceStatus, Prisma } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function param(value?: string | string[]) {
  if (Array.isArray(value)) return value[value.length - 1];
  return value;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "TEACHER" || !session.user.schoolId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const statusParam = param(searchParams.getAll("status"));
  const studioParam = param(searchParams.getAll("studio"));
  const fromParam = param(searchParams.getAll("from"));
  const toParam = param(searchParams.getAll("to"));
  const q = param(searchParams.getAll("q"))?.trim() || "";

  const statusFilter = statusParam && Object.values(InvoiceStatus).includes(statusParam as InvoiceStatus)
    ? (statusParam as InvoiceStatus)
    : undefined;

  const where: Prisma.InvoiceWhereInput = {
    status: statusFilter,
    course: {
      teacherId: session.user.id,
      schoolId: session.user.schoolId,
      ...(studioParam ? { studioId: studioParam } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(fromParam || toParam
        ? {
            date: {
              ...(fromParam ? { gte: new Date(`${fromParam}T00:00:00`) } : {}),
              ...(toParam ? { lte: new Date(`${toParam}T23:59:59`) } : {}),
            },
          }
        : {}),
    },
  };

  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: [{ course: { date: "desc" } }, { issuedAt: "desc" }, { id: "desc" }],
    include: {
      course: { select: { title: true, date: true, studio: { select: { name: true } } } },
    },
  });

  const header = ["id", "status", "amount", "currency", "course_title", "course_date", "studio"];
  const csv = [header.join(",")]
    .concat(
      invoices.map((inv) => {
        const date = inv.course.date.toISOString();
        return [
          inv.id,
          inv.status,
          (inv.amountCents ?? 0) / 100,
          inv.currency,
          escapeCsv(inv.course.title ?? "Cours"),
          date,
          escapeCsv(inv.course.studio?.name ?? ""),
        ].join(",");
      })
    )
    .join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="teacher_invoices.csv"',
    },
  });
}

function escapeCsv(val: string) {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}
