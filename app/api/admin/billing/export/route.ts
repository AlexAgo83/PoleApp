import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { InvoiceStatus, Prisma } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function paramValue(value?: string | string[] | null) {
  if (Array.isArray(value)) return value[value.length - 1];
  return value ?? undefined;
}

function dateFromParam(value?: string) {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

type SortKey = "date_desc" | "date_asc" | "amount_desc" | "amount_asc" | "status" | "teacher";

const sortOptions: Record<SortKey, Prisma.InvoiceOrderByWithRelationInput[]> = {
  date_desc: [
    { course: { date: "desc" } },
    { issuedAt: "desc" },
    { id: "desc" },
  ],
  date_asc: [
    { course: { date: "asc" } },
    { issuedAt: "asc" },
    { id: "asc" },
  ],
  amount_desc: [
    { amountCents: "desc" },
    { course: { date: "desc" } },
    { id: "desc" },
  ],
  amount_asc: [
    { amountCents: "asc" },
    { course: { date: "desc" } },
    { id: "desc" },
  ],
  status: [
    { status: "asc" },
    { course: { date: "desc" } },
    { id: "desc" },
  ],
  teacher: [
    { course: { teacher: { name: "asc" } } },
    { course: { date: "desc" } },
    { id: "desc" },
  ],
};

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SCHOOL_ADMIN" || !session.user.schoolId) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const statusParam = paramValue(searchParams.getAll("status"));
  const teacherFilter = paramValue(searchParams.getAll("teacher"));
  const studioFilter = paramValue(searchParams.getAll("studio"));
  const fromParam = paramValue(searchParams.getAll("from"));
  const toParam = paramValue(searchParams.getAll("to"));
  const sortParam = paramValue(searchParams.getAll("sort"));
  const fromDate = dateFromParam(fromParam);
  const toDate = dateFromParam(toParam);
  const sortKey: SortKey = sortParam && sortOptions[sortParam as SortKey] ? (sortParam as SortKey) : "date_desc";

  const statusFilter =
    statusParam && Object.values(InvoiceStatus).includes(statusParam as InvoiceStatus)
      ? (statusParam as InvoiceStatus)
      : undefined;

  const where: Prisma.InvoiceWhereInput = {
    status: statusFilter,
    course: {
      schoolId: session.user.schoolId,
      ...(teacherFilter ? { teacherId: teacherFilter } : {}),
      ...(studioFilter ? { studioId: studioFilter } : {}),
      ...(fromDate || toDate
        ? {
            date: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            },
          }
        : {}),
    },
  };

  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: sortOptions[sortKey],
    include: {
      course: {
        include: {
          teacher: { select: { name: true, email: true } },
          studio: { select: { name: true } },
          _count: { select: { attendances: true } },
        },
      },
    },
  });

  const header = [
    "invoiceId",
    "courseTitle",
    "courseDate",
    "teacher",
    "studio",
    "attendances",
    "amount",
    "currency",
    "status",
    "note",
    "paidAt",
  ];
  const rows = invoices.map((invoice) => {
    const course = invoice.course;
    const formattedDate = new Date(course.date).toISOString();
    const paid = invoice.paidAt ? new Date(invoice.paidAt).toISOString() : "";
    return [
      invoice.id,
      course.title ?? "Cours",
      formattedDate,
      course.teacher?.name ?? course.teacher?.email ?? "",
      course.studio?.name ?? "",
      course._count.attendances.toString(),
      (invoice.amountCents / 100).toFixed(2),
      invoice.currency,
      invoice.status,
      invoice.note ?? "",
      paid,
    ];
  });
  const csv = [header, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"billing.csv\"",
    },
  });
}
