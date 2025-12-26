import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().trim().min(2),
  kind: z.string().trim().min(3).max(32).optional().default("MUSCLE"),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!role || (role !== "TEACHER" && role !== "SCHOOL_ADMIN" && role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  try {
    const created = await prisma.muscle.create({
      data: {
        name: parsed.data.name.trim(),
        kind: parsed.data.kind.trim().toUpperCase(),
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    // Duplicate muscle name
    return NextResponse.json({ error: "create failed", details: (error as Error).message }, { status: 400 });
  }
}
