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

  const defaultIds = getDefaultAvatarPublicIds();
  if (defaultIds.length > 0 && isCloudinaryEnabled()) {
    const pickFromSeed = (() => {
      if (!seedKey) return defaultIds[0];
      let hash = 0;
      for (let i = 0; i < seedKey.length; i += 1) {
        hash = (hash * 31 + seedKey.charCodeAt(i)) >>> 0;
      }
      return defaultIds[hash % defaultIds.length];
    })();
    const signedDefault = generateSignedUrl({
      publicId: pickFromSeed,
      resourceType: "image",
      deliveryType: "upload",
      expiresInSeconds: 3600,
    });
    if (signedDefault) return signedDefault;
  }

  return placeholder;
}
