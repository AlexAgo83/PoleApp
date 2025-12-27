import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "TEACHER" || !session.user.schoolId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const kind = (searchParams.get("kind") ?? "").toUpperCase();
  const status = (searchParams.get("status") ?? "").toUpperCase();
  const q = searchParams.get("q")?.trim() ?? "";

  const where: Prisma.PurchaseWhereInput = {
    user: { schoolId: session.user.schoolId },
    ...(kind ? { kind } : {}),
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { offerName: { contains: q, mode: "insensitive" } },
            { user: { name: { contains: q, mode: "insensitive" } } },
            { user: { email: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const rows = await prisma.purchase.findMany({
    where,
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  const header = [
    "eleve",
    "email",
    "offre",
    "type",
    "montant_eur",
    "credits",
    "premium",
    "statut",
    "date_iso",
  ];

  const csvLines = rows.map((row) => {
    const safeName = row.user.name ?? "";
    const values = [
      safeName.replace(/"/g, '""'),
      (row.user.email ?? "").replace(/"/g, '""'),
      (row.offerName ?? "").replace(/"/g, '""'),
      row.kind ?? "",
      (row.amountCents / 100).toFixed(2),
      row.creditsGranted ?? "",
      row.isPremiumGranted ? "oui" : "non",
      row.status ?? "",
      row.createdAt.toISOString(),
    ];
    return values.map((v) => `"${v}"`).join(",");
  });

  const body = [header.join(","), ...csvLines].join("\n");

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="purchases_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
