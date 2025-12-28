import { generateSignedUrl, isCloudinaryEnabled } from "./cloudinary";

type AvatarParams = {
  avatarPublicId?: string | null;
  avatarUrl?: string | null;
  placeholder: string;
  deliveryType?: "upload" | "authenticated";
};

export function resolveAvatarUrl({
  avatarPublicId,
  avatarUrl,
  placeholder,
  deliveryType = "authenticated",
}: AvatarParams) {
  if (avatarPublicId && isCloudinaryEnabled()) {
    const signed = generateSignedUrl({
      publicId: avatarPublicId,
      resourceType: "image",
      deliveryType,
      expiresInSeconds: 3600,
    });
    if (signed) return signed;
  }
  return avatarUrl?.trim() || placeholder;
}
