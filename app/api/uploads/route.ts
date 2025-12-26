import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { destroyAsset, isCloudinaryEnabled } from "@/lib/cloudinary";

const schema = z.object({
  publicId: z.string().trim().min(1),
  resourceType: z.enum(["image", "video"]).optional(),
});

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isCloudinaryEnabled()) {
    return NextResponse.json({ error: "cloudinary not configured" }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  try {
    const res = await destroyAsset(parsed.data.publicId, parsed.data.resourceType);
    return NextResponse.json({ ok: true, result: res });
  } catch {
    return NextResponse.json({ error: "destroy failed" }, { status: 500 });
  }
}
