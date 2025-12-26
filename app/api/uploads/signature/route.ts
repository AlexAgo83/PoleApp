import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { isCloudinaryEnabled, signUpload } from "@/lib/cloudinary";

const schema = z.object({
  folder: z.string().trim().min(1),
  publicId: z.string().trim().optional(),
  resourceType: z.enum(["image", "video"]).optional(),
});

export async function POST(request: Request) {
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

  const data = signUpload({
    folder: parsed.data.folder,
    publicId: parsed.data.publicId,
    resourceType: parsed.data.resourceType,
  });

  return NextResponse.json(data);
}
