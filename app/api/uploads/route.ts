import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { destroyAsset, isCloudinaryEnabled } from "@/lib/cloudinary";

const schema = z.object({
  publicId: z.string().trim().min(1),
  resourceType: z.enum(["image", "video"]).optional(),
  deliveryType: z.enum(["upload", "authenticated"]).optional(),
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
    console.error("[cloudinary-destroy] invalid payload", parsed.error.flatten());
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const avatarFolder = process.env.NEXT_PUBLIC_CLOUDINARY_AVATAR_FOLDER ?? "poleapp/avatars";
  const shouldForceAuthenticated =
    parsed.data.resourceType === "video" || parsed.data.publicId.startsWith(avatarFolder);

  try {
    const res = await destroyAsset(
      parsed.data.publicId,
      parsed.data.resourceType ?? "image",
      shouldForceAuthenticated ? "authenticated" : parsed.data.deliveryType ?? "upload",
    );
    return NextResponse.json({ ok: true, result: res });
  } catch (error) {
    console.error("[cloudinary-destroy] destroy failed", error);
    return NextResponse.json({ error: "destroy failed" }, { status: 500 });
  }
}
