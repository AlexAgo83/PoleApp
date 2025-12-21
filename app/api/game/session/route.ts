import { GameMode } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const payloadSchema = z.object({
  mode: z.nativeEnum(GameMode),
  totalQuestions: z.number().int().positive(),
  correctAnswers: z.number().int().min(0),
  durationMs: z.number().int().nonnegative().optional(),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { mode, totalQuestions, correctAnswers, durationMs } = parsed.data;
  if (correctAnswers > totalQuestions) {
    return NextResponse.json({ error: "Invalid scores" }, { status: 400 });
  }

  try {
    const created = await prisma.gameSession.create({
      data: {
        mode,
        totalQuestions,
        correctAnswers,
        durationMs,
        userId: session.user.id,
        schoolId: session.user.schoolId ?? null,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("Failed to persist game session", err);
    return NextResponse.json({ error: "Failed to save session" }, { status: 500 });
  }
}
