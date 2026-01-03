import { MediaKind } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";

import { getDefaultAvatarPublicIds, isCloudinaryEnabled } from "./cloudinary";
import { SEED_MEDIA_IDS, normalizeFolderedPublicId } from "./media";
import { prisma } from "./prisma";

export const DEFAULT_MEDIA_PREFIX = "";

export type MediaResourceType = "image" | "video";
export type MediaDeliveryType = "upload" | "authenticated";
const DEFAULT_EXCLUDED_PREFIXES = ["samples/"];

export type DbMediaRef = {
  publicId: string;
  normalizedFull: string;
  normalizedBase?: string;
  source: { table: string; field: string; id: string };
  resourceType?: MediaResourceType;
  deliveryType?: MediaDeliveryType;
  isSeed: boolean;
};

export type CloudAsset = {
  publicId: string;
  normalizedFull: string;
  normalizedBase?: string;
  resourceType: MediaResourceType;
  deliveryType: MediaDeliveryType;
  folder?: string;
  bytes?: number;
  format?: string;
  createdAt?: string;
  tags?: string[];
  isSeed: boolean;
};

export type MediaDiffResult = {
  orphans: CloudAsset[];
  missing: DbMediaRef[];
};

export function normalizePublicId(raw: string | null | undefined, folderPrefix: string = DEFAULT_MEDIA_PREFIX) {
  if (!raw) return null;
  let value = raw.trim();
  if (!value) return null;

  const uploadMatch = value.match(/res\.cloudinary\.com\/[a-z0-9_-]+\/(?:image|video)\/upload\/([^?#]+)/i);
  if (uploadMatch?.[1]) value = uploadMatch[1];

  value = value.replace(/^\/+|\/+$/g, "");
  value = value.replace(/\.(jpe?g|png|gif|webp|svg|mp4|mov|mkv|avi)$/i, "");

  const normalized = normalizeFolderedPublicId(value, folderPrefix) ?? value;
  const trimmed = normalized.trim();
  if (!trimmed) return null;

  const parts = trimmed.split("/").filter(Boolean);
  const base = parts[parts.length - 1];
  return { full: trimmed, base };
}

function buildSeedSet(folderPrefix: string) {
  const avatarIds = getDefaultAvatarPublicIds();
  const candidates = new Set<string>();
  for (const id of avatarIds) {
    const norm = normalizePublicId(id, folderPrefix);
    if (norm?.full) candidates.add(norm.full);
    if (norm?.base) candidates.add(norm.base);
  }
  for (const seed of SEED_MEDIA_IDS) {
    const norm = normalizePublicId(seed, folderPrefix);
    if (norm?.full) candidates.add(norm.full);
    if (norm?.base) candidates.add(norm.base);
  }
  return candidates;
}

function isSeedLike(full?: string | null, base?: string | null, seedSet?: Set<string>) {
  if (!seedSet) return false;
  if (full && seedSet.has(full)) return true;
  if (base && seedSet.has(base)) return true;
  return false;
}

export async function collectDbMediaRefs({
  includeSeeds = false,
  folderPrefix = DEFAULT_MEDIA_PREFIX,
}: {
  includeSeeds?: boolean;
  folderPrefix?: string;
}) {
  const seedSet = buildSeedSet(folderPrefix);
  const refs: DbMediaRef[] = [];

  const pushRef = (rawId: string | null | undefined, meta: Omit<DbMediaRef, "publicId" | "normalizedFull" | "normalizedBase" | "isSeed">) => {
    const norm = normalizePublicId(rawId, folderPrefix);
    if (!norm?.full) return;
    const isSeed = isSeedLike(norm.full, norm.base, seedSet);
    if (!includeSeeds && isSeed) return;
    refs.push({
      publicId: rawId!.trim(),
      normalizedFull: norm.full,
      normalizedBase: norm.base,
      isSeed,
      ...meta,
    });
  };

  const [users, schools, studios, courses, positionsMedia, presets] = await Promise.all([
    prisma.user.findMany({ select: { id: true, avatarPublicId: true } }),
    prisma.school.findMany({ select: { id: true, photoPublicId: true } }),
    prisma.studio.findMany({ select: { id: true, photoPublicId: true } }),
    prisma.course.findMany({ select: { id: true, photoPublicId: true } }),
    prisma.positionMedia.findMany({ select: { id: true, kind: true, publicId: true, url: true } }),
    prisma.preset.findMany({ select: { id: true, imagePublicId: true, videoPublicId: true } }),
  ]);

  users.forEach((u) => pushRef(u.avatarPublicId, { source: { table: "User", field: "avatarPublicId", id: u.id }, resourceType: "image", deliveryType: "upload" }));
  schools.forEach((s) => pushRef(s.photoPublicId, { source: { table: "School", field: "photoPublicId", id: s.id }, resourceType: "image", deliveryType: "upload" }));
  studios.forEach((s) => pushRef(s.photoPublicId, { source: { table: "Studio", field: "photoPublicId", id: s.id }, resourceType: "image", deliveryType: "upload" }));
  courses.forEach((c) => pushRef(c.photoPublicId, { source: { table: "Course", field: "photoPublicId", id: c.id }, resourceType: "image", deliveryType: "upload" }));
  presets.forEach((p) => {
    pushRef(p.imagePublicId, { source: { table: "Preset", field: "imagePublicId", id: p.id }, resourceType: "image", deliveryType: "upload" });
    pushRef(p.videoPublicId, { source: { table: "Preset", field: "videoPublicId", id: p.id }, resourceType: "video", deliveryType: "upload" });
  });
  positionsMedia.forEach((m) => {
    const type: MediaResourceType | undefined = m.kind === MediaKind.VIDEO ? "video" : "image";
    if (m.publicId) {
      pushRef(m.publicId, { source: { table: "PositionMedia", field: "publicId", id: m.id }, resourceType: type });
      return;
    }
    if (m.url) {
      pushRef(m.url, { source: { table: "PositionMedia", field: "url", id: m.id }, resourceType: type });
    }
  });

  return refs;
}

export async function collectCloudinaryAssets({
  resourceType,
  deliveryType,
  prefix = DEFAULT_MEDIA_PREFIX,
  maxResults,
  includeSeeds = false,
  folderPrefix = DEFAULT_MEDIA_PREFIX,
  excludePrefixes = DEFAULT_EXCLUDED_PREFIXES,
}: {
  resourceType: MediaResourceType;
  deliveryType: MediaDeliveryType;
  prefix?: string;
  maxResults: number;
  includeSeeds?: boolean;
  folderPrefix?: string;
  excludePrefixes?: string[];
}) {
  if (!isCloudinaryEnabled()) {
    throw new Error("Cloudinary not configured");
  }
  const seedSet = buildSeedSet(folderPrefix);
  const normalizedExcludes = (excludePrefixes ?? []).map((p) => p.replace(/^\/+|\/+$/g, "")).filter(Boolean);
  const shouldExclude = (publicId: string, folder?: string) => {
    const cleanPublicId = publicId.replace(/^\/+/, "");
    const cleanFolder = folder?.replace(/^\/+|\/+$/g, "");
    return normalizedExcludes.some((ex) => {
      if (cleanPublicId === ex || cleanPublicId.startsWith(`${ex}/`)) return true;
      if (cleanFolder && (cleanFolder === ex || cleanFolder.startsWith(`${ex}/`))) return true;
      return false;
    });
  };

  const assets: CloudAsset[] = [];
  let nextCursor: string | undefined;
  let remaining = maxResults;
  const pageSize = (size: number) => Math.max(1, Math.min(500, size));

  do {
    const res = (await cloudinary.api.resources({
      resource_type: resourceType,
      type: deliveryType,
      prefix,
      max_results: pageSize(remaining),
      next_cursor: nextCursor,
    })) as {
      resources: Array<{
        public_id: string;
        type: string;
        folder?: string;
        bytes?: number;
        format?: string;
        created_at?: string;
        tags?: string[];
      }>;
      next_cursor?: string;
    };

    const mapped = res.resources
      .map((r) => {
        if (shouldExclude(r.public_id, r.folder)) return null;
        const norm = normalizePublicId(r.public_id, folderPrefix);
        if (!norm?.full) return null;
        const isSeed = isSeedLike(norm.full, norm.base, seedSet);
        if (!includeSeeds && isSeed) return null;
        return {
          publicId: r.public_id,
          normalizedFull: norm.full,
          normalizedBase: norm.base,
          resourceType,
          deliveryType,
          folder: r.folder,
          bytes: r.bytes,
          format: r.format,
          createdAt: r.created_at,
          tags: r.tags,
          isSeed,
        } satisfies CloudAsset;
      })
      .filter(Boolean) as CloudAsset[];

    assets.push(...mapped);
    remaining = maxResults - assets.length;
    nextCursor = res.next_cursor;
  } while (nextCursor && remaining > 0);

  return assets;
}

export function diffMediaAssets({
  cloudAssets,
  dbRefs,
}: {
  cloudAssets: CloudAsset[];
  dbRefs: DbMediaRef[];
}): MediaDiffResult {
  const dbSet = new Set<string>();
  for (const ref of dbRefs) {
    dbSet.add(ref.normalizedFull);
    if (ref.normalizedBase) dbSet.add(ref.normalizedBase);
  }

  const cloudSet = new Set<string>();
  for (const asset of cloudAssets) {
    cloudSet.add(asset.normalizedFull);
    if (asset.normalizedBase) cloudSet.add(asset.normalizedBase);
  }

  const orphans = cloudAssets.filter(
    (asset) => !dbSet.has(asset.normalizedFull) && (!asset.normalizedBase || !dbSet.has(asset.normalizedBase)),
  );
  const missing = dbRefs.filter(
    (ref) => !cloudSet.has(ref.normalizedFull) && (!ref.normalizedBase || !cloudSet.has(ref.normalizedBase)),
  );

  return { orphans, missing };
}
