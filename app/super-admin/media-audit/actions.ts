"use server";

import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import {
  DEFAULT_MEDIA_PREFIX,
  CloudAsset,
  DbMediaRef,
  collectCloudinaryAssets,
  collectDbMediaRefs,
  diffMediaAssets,
} from "@/lib/mediaAudit";

export type AuditState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | {
      status: "ok";
      data: {
        orphans: CloudAsset[];
        missing: DbMediaRef[];
        stats: {
          cloudCount: number;
          dbCount: number;
          orphans: number;
          missing: number;
          durationMs: number;
          startedAt: string;
          params: {
            prefix: string;
            resourceType: "image" | "video" | "all";
            deliveryType: "upload" | "authenticated" | "all";
            maxResults: number;
          };
        };
        cloudName?: string;
      };
    };

const formSchema = z.object({
  resourceType: z.enum(["image", "video", "all"]).default("all"),
  deliveryType: z.enum(["upload", "authenticated", "all"]).default("all"),
  maxResults: z.coerce
    .number()
    .int()
    .min(1)
    .max(1500)
    .default(400),
});

export async function scanMediaAuditAction(_prevState: AuditState, formData: FormData): Promise<AuditState> {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return { status: "error", message: "Non autorisé" };
  }

  const parsed = formSchema.safeParse({
    resourceType: formData.get("resourceType") ?? "all",
    deliveryType: formData.get("deliveryType") ?? "all",
    maxResults: formData.get("maxResults") ?? 400,
  });

  if (!parsed.success) {
    return { status: "error", message: "Paramètres invalides" };
  }

  const start = Date.now();
  const { resourceType, deliveryType, maxResults } = parsed.data;
  const prefix = DEFAULT_MEDIA_PREFIX;
  const includeSeeds = false;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

  try {
    const resourceTypes = resourceType === "all" ? ["image", "video"] : [resourceType];
    const deliveryTypes = deliveryType === "all" ? ["upload", "authenticated"] : [deliveryType];
    const combinations = resourceTypes.flatMap((rt) => deliveryTypes.map((dt) => ({ rt, dt })));
    const maxPerCombo = Math.max(1, Math.ceil(maxResults / combinations.length));

    const cloudAssets: CloudAsset[] = [];
    for (const combo of combinations) {
      const assets = await collectCloudinaryAssets({
        resourceType: combo.rt,
        deliveryType: combo.dt as "upload" | "authenticated",
        prefix,
        maxResults: maxPerCombo,
        includeSeeds,
        folderPrefix: prefix,
      });
      cloudAssets.push(...assets);
    }

    const dbRefs = await collectDbMediaRefs({ includeSeeds, folderPrefix: prefix });
    const { orphans, missing } = diffMediaAssets({ cloudAssets, dbRefs });

    return {
      status: "ok",
      data: {
        orphans,
        missing,
        stats: {
          cloudCount: cloudAssets.length,
          dbCount: dbRefs.length,
          orphans: orphans.length,
          missing: missing.length,
          durationMs: Date.now() - start,
          startedAt: new Date(start).toISOString(),
          params: { prefix, resourceType, deliveryType, maxResults },
        },
        cloudName: cloudName ?? undefined,
      },
    };
  } catch (error) {
    console.error("[media-audit] failed", error);
    return { status: "error", message: "Audit impossible (Cloudinary ou DB)" };
  }
}
