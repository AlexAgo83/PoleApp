import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { isCloudinaryEnabled, signUpload } from "@/lib/cloudinary";

const schema = z.object({
  folder: z.string().trim().min(1),
  publicId: z.string().trim().optional(),
  resourceType: z.enum(["image", "video"]).optional(),
  deliveryType: z.enum(["upload", "authenticated"]).optional(),
  accessMode: z.enum(["authenticated"]).optional(),
  transformation: z.string().trim().optional(),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    console.error("[cloudinary-signature] unauthorized request");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isCloudinaryEnabled()) {
    console.error("[cloudinary-signature] cloudinary not configured");
    return NextResponse.json({ error: "cloudinary not configured" }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    console.error("[cloudinary-signature] invalid payload", parsed.error.flatten());
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  try {
    const resourceType = parsed.data.resourceType ?? "image";
    // On force en authenticated tous les uploads (avatars/images/vidéos) pour éviter les assets publics.
    const deliveryType = "authenticated";
    const accessMode = "authenticated";

    const data = signUpload({
      folder: parsed.data.folder,
      publicId: parsed.data.publicId,
      resourceType,
      deliveryType,
      accessMode,
      transformation: parsed.data.transformation,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("[cloudinary-signature] failed to sign", error);
    return NextResponse.json({ error: "signature failed" }, { status: 500 });
  }
}
