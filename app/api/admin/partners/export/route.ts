import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SCHOOL_ADMIN" || !session.user.schoolId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";
  const kind = searchParams.get("kind")?.trim() || "";
  const from = searchParams.get("from")?.trim();
  const to = searchParams.get("to")?.trim();

  const partners = await prisma.partner.findMany({
    where: {
      schoolId: session.user.schoolId,
      ...(kind ? { kind } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { kind: { contains: q, mode: "insensitive" } },
              { website: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
  });
  const partnerIds = partners.map((p) => p.id);
  const eventCounts =
    partnerIds.length > 0
      ? await prisma.partnerEvent
          .groupBy({
            by: ["partnerId", "type"],
            _count: { _all: true },
            where: {
              partnerId: { in: partnerIds },
              ...(from || to
                ? {
                    createdAt: {
                      ...(from ? { gte: new Date(`${from}T00:00:00`) } : {}),
                      ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}),
                    },
                  }
                : {}),
            },
          })
          .then((rows) => {
            const map = new Map<string, { clicks: number; purchases: number }>();
            rows.forEach((row) => {
              const current = map.get(row.partnerId) ?? { clicks: 0, purchases: 0 };
              if (row.type === "PURCHASE") {
                current.purchases += row._count._all;
              } else {
                current.clicks += row._count._all;
              }
              map.set(row.partnerId, current);
            });
            return map;
          })
      : new Map<string, { clicks: number; purchases: number }>();

  const getStats = (partnerId: string) => {
    const stats = eventCounts.get(partnerId) ?? { clicks: 0, purchases: 0 };
    const ctr = stats.clicks > 0 ? Math.round((stats.purchases / stats.clicks) * 1000) / 10 : 0;
    return { ...stats, ctr };
  };

  const rows = partners.map((p) => {
    const stats = getStats(p.id);
    return {
      id: p.id,
      name: p.name,
      kind: p.kind,
      clicks: stats.clicks,
      purchases: stats.purchases,
      ctr: stats.ctr.toFixed(1),
    };
  });

  const header = ["id", "name", "kind", "clicks", "purchases", "ctr(%)"];
  const csv = [header.join(",")]
    .concat(rows.map((r) => [r.id, escapeCsv(r.name), escapeCsv(r.kind), r.clicks, r.purchases, r.ctr].join(",")))
    .join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="partners_metrics.csv"',
    },
  });
}

function escapeCsv(val: string) {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}
