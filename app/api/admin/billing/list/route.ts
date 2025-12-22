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
  const pageParam = paramValue(searchParams.getAll("page"));
  const rawPage = Number(pageParam ?? "1");
  const statusParam = paramValue(searchParams.getAll("status"));
  const teacherFilter = paramValue(searchParams.getAll("teacher"));
  const studioFilter = paramValue(searchParams.getAll("studio"));
  const fromParam = paramValue(searchParams.getAll("from"));
  const toParam = paramValue(searchParams.getAll("to"));
  const sortParam = paramValue(searchParams.getAll("sort"));
  const thresholdParam = paramValue(searchParams.getAll("threshold"));

  const fromDate = dateFromParam(fromParam);
  const toDate = dateFromParam(toParam);
  const sortKey: SortKey = sortParam && sortOptions[sortParam as SortKey] ? (sortParam as SortKey) : "date_desc";
  const statusFilter =
    statusParam && Object.values(InvoiceStatus).includes(statusParam as InvoiceStatus)
      ? (statusParam as InvoiceStatus)
      : undefined;
  const threshold = Number.parseInt(thresholdParam ?? "", 10);
  const creditThreshold = Number.isFinite(threshold) && threshold > 0 ? threshold : 200;

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

  const [totalCount, invoices, students] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      orderBy: sortOptions[sortKey],
      skip: Math.max(0, (Math.min(Math.max(1, rawPage || 1), 10_000) - 1) * 10),
      take: 10,
      include: {
        course: {
          include: {
            teacher: { select: { id: true, name: true, email: true } },
            studio: { select: { id: true, name: true } },
            _count: { select: { attendances: true } },
          },
        },
      },
    }),
    prisma.user.findMany({
      where: { schoolId: session.user.schoolId, role: "STUDENT" },
      select: { id: true, name: true, email: true, credits: true },
      orderBy: { credits: "asc" },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / 10));
  const currentPage = Math.min(Math.max(1, rawPage || 1), totalPages);
  const totalCredits = students.reduce((acc, s) => acc + (s.credits ?? 0), 0);
  const lowCredits = students.filter((s) => (s.credits ?? 0) < creditThreshold).slice(0, 5);
  const lowCreditsCount = students.filter((s) => (s.credits ?? 0) < creditThreshold).length;

  return NextResponse.json({
    invoices,
    totalCount,
    totalPages,
    currentPage,
    creditThreshold,
    totalCredits,
    lowCredits,
    lowCreditsCount,
  });
}
