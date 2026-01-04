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
import { generateSignedUrl } from "@/lib/cloudinary";

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
            includeSeeds: boolean;
          };
        };
        cloudName?: string;
      };
    };

const formSchema = z.object({
  excludeSeeds: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.null(), z.undefined()])
    .transform((v) => v === "on" || v === "true"),
});

export async function scanMediaAuditAction(_prevState: AuditState, formData: FormData): Promise<AuditState> {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return { status: "error", message: "Non autorisé" };
  }

  const parsed = formSchema.safeParse({
    excludeSeeds: formData.get("excludeSeeds"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Paramètres invalides" };
  }

  const start = Date.now();
  const resourceType: "image" | "video" | "all" = "all";
  const deliveryType: "upload" | "authenticated" | "all" = "all";
  const maxResults = 400;
  const prefix = DEFAULT_MEDIA_PREFIX;
  const includeSeeds = !parsed.data.excludeSeeds;
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
    const enrichedOrphans = orphans.map((asset) => {
      if (asset.deliveryType !== "authenticated") return asset;
      const previewUrl = generateSignedUrl({
        publicId: asset.publicId,
        resourceType: asset.resourceType,
        deliveryType: "authenticated",
        expiresInSeconds: 600,
        format: asset.resourceType === "video" ? "jpg" : undefined,
      });
      const openUrl = generateSignedUrl({
        publicId: asset.publicId,
        resourceType: asset.resourceType,
        deliveryType: "authenticated",
        expiresInSeconds: 600,
        format: asset.resourceType === "video" ? "mp4" : undefined,
      });
      return { ...asset, previewUrl: previewUrl ?? undefined, openUrl: openUrl ?? undefined };
    });

    return {
      status: "ok",
      data: {
        orphans: enrichedOrphans,
        missing,
        stats: {
          cloudCount: cloudAssets.length,
          dbCount: dbRefs.length,
          orphans: orphans.length,
          missing: missing.length,
          durationMs: Date.now() - start,
          startedAt: new Date(start).toISOString(),
          params: { prefix, resourceType, deliveryType, maxResults, includeSeeds },
        },
        cloudName: cloudName ?? undefined,
      },
    };
  } catch (error) {
    console.error("[media-audit] failed", error);
    return { status: "error", message: "Audit impossible (Cloudinary ou DB)" };
  }
}
