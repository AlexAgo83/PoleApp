import {
  generateSignedUrl,
  getDefaultAvatarPublicIds,
  isCloudinaryEnabled,
  isDefaultAvatarPublicId,
} from "./cloudinary";

type AvatarParams = {
  avatarPublicId?: string | null;
  avatarUrl?: string | null;
  placeholder: string;
  deliveryType?: "upload" | "authenticated";
  seedKey?: string;
};

export function resolveAvatarUrl({
  avatarPublicId,
  avatarUrl,
  placeholder,
  deliveryType = "authenticated",
  seedKey,
}: AvatarParams) {
  const effectiveDelivery =
    avatarPublicId && isDefaultAvatarPublicId(avatarPublicId) ? "upload" : deliveryType;

  if (avatarPublicId && isCloudinaryEnabled()) {
    const signed = generateSignedUrl({
      publicId: avatarPublicId,
      resourceType: "image",
      deliveryType: effectiveDelivery,
      expiresInSeconds: 3600,
    });
    if (signed) return signed;
  }
  const cleanedAvatarUrl = avatarUrl?.trim();
  if (cleanedAvatarUrl) return cleanedAvatarUrl;

  return placeholder;
}
