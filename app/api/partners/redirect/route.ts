import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ALLOWED_TYPES = new Set(["click", "purchase"]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const partnerId = searchParams.get("partnerId") ?? undefined;
  const urlParam = searchParams.get("url") ?? undefined;
  const courseId = searchParams.get("courseId") ?? undefined;
  const studioId = searchParams.get("studioId") ?? undefined;
  const rawType = (searchParams.get("type") ?? "click").toLowerCase();
  const type = ALLOWED_TYPES.has(rawType) ? rawType : "click";

  if (!partnerId) {
    return NextResponse.json({ error: "partnerId is required" }, { status: 400 });
  }

  const partner = await prisma.partner.findUnique({
    where: { id: partnerId },
    select: { id: true, website: true },
  });
  if (!partner) {
    return NextResponse.json({ error: "Partner not found" }, { status: 404 });
  }

  const target = urlParam ?? partner.website;
  if (!target) {
    return NextResponse.json({ error: "Missing target URL" }, { status: 400 });
  }

  let safeUrl: URL | null = null;
  try {
    safeUrl = new URL(target);
    if (!["http:", "https:"].includes(safeUrl.protocol)) {
      throw new Error("Invalid protocol");
    }
  } catch (err) {
    return NextResponse.json({ error: `Invalid URL: ${(err as Error).message}` }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  try {
    await prisma.partnerEvent.create({
      data: {
        partnerId,
        userId,
        courseId: courseId || undefined,
        studioId: studioId || undefined,
        type: type === "purchase" ? "PURCHASE" : "CLICK",
      },
    });
  } catch (err) {
    console.warn("[partner-event] failed to record", err);
  }

  return NextResponse.redirect(safeUrl.toString(), { status: 302 });
}
