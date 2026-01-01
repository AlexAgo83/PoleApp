import { generateSignedUrl, isCloudinaryEnabled } from "./cloudinary";

type ResolveArgs = {
  publicId?: string | null;
  resourceType?: "image" | "video";
  deliveryType?: "upload" | "authenticated";
  expiresInSeconds?: number;
  fallback?: string;
};

export function resolvePublicIdUrl({
  publicId,
  resourceType = "image",
  deliveryType = "authenticated",
  expiresInSeconds = 3600,
  fallback,
}: ResolveArgs): string {
  // Avoid importing cloudinary lib in the client bundle: only resolve server-side
  if (typeof window !== "undefined") {
    return fallback ?? "";
  }
  const trimmed = publicId?.trim();
  if (trimmed && isCloudinaryEnabled()) {
    const signed = generateSignedUrl({
      publicId: trimmed,
      resourceType,
      deliveryType,
      expiresInSeconds,
    });
    if (signed) return signed;
  }
  if (fallback) return fallback;
  return "";
}
