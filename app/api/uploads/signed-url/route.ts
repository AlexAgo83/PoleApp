import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { generateSignedUrl, isCloudinaryEnabled } from "@/lib/cloudinary";

const schema = z.object({
  publicId: z.string().trim().min(1),
  resourceType: z.enum(["image", "video"]).optional(),
  deliveryType: z.enum(["upload", "authenticated"]).optional(),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isCloudinaryEnabled()) return NextResponse.json({ error: "cloudinary not configured" }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const signed = generateSignedUrl({
    publicId: parsed.data.publicId,
    resourceType: parsed.data.resourceType ?? "image",
    deliveryType: parsed.data.deliveryType ?? "authenticated",
  });
  if (!signed) return NextResponse.json({ error: "sign failed" }, { status: 500 });
  return NextResponse.json({ url: signed });
}
