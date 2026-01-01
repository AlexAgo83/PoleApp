import { v2 as cloudinary } from "cloudinary";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

export function isCloudinaryEnabled() {
  return Boolean(cloudName && apiKey && apiSecret);
}

const defaultAvatarIds = (process.env.CLOUDINARY_AVATAR_DEFAULT_IDS ?? "")
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);

export function getDefaultAvatarPublicIds() {
  return defaultAvatarIds;
}

export function randomDefaultAvatarPublicId() {
  if (defaultAvatarIds.length === 0) return null;
  const idx = Math.floor(Math.random() * defaultAvatarIds.length);
  return defaultAvatarIds[idx];
}

export function isDefaultAvatarPublicId(publicId?: string | null) {
  if (!publicId) return false;
  return defaultAvatarIds.includes(publicId);
}

export function signUpload(options: {
  folder: string;
  publicId?: string;
  resourceType?: "image" | "video";
  deliveryType?: "upload" | "authenticated";
  accessMode?: "authenticated";
  transformation?: string;
}) {
  if (!isCloudinaryEnabled()) {
    throw new Error("Cloudinary not configured");
  }
  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign: Record<string, string | number> = {
    timestamp,
    folder: options.folder,
  };
  if (options.publicId) paramsToSign.public_id = options.publicId;
  if (options.deliveryType && options.deliveryType !== "upload") {
    paramsToSign.type = options.deliveryType;
  }
  if (options.accessMode === "authenticated") {
    paramsToSign.access_mode = options.accessMode;
  }
  if (options.transformation) {
    paramsToSign.transformation = options.transformation;
  }

  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret as string);

  return {
    cloudName,
    apiKey,
    timestamp,
    signature,
    folder: options.folder,
    publicId: options.publicId,
    resourceType: options.resourceType ?? "image",
    deliveryType: options.deliveryType ?? "upload",
    accessMode: options.accessMode,
    transformation: options.transformation,
  };
}

export async function destroyAsset(
  publicId: string,
  resourceType: "image" | "video" = "image",
  deliveryType: "upload" | "authenticated" = "upload",
) {
  if (!isCloudinaryEnabled()) {
    throw new Error("Cloudinary not configured");
  }
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType, type: deliveryType });
}

export function generateSignedUrl({
  publicId,
  resourceType = "image",
  deliveryType = "authenticated",
  expiresInSeconds = 3600,
  format,
}: {
  publicId: string;
  resourceType?: "image" | "video";
  deliveryType?: "upload" | "authenticated";
  expiresInSeconds?: number;
  format?: string;
}) {
  if (!isCloudinaryEnabled()) return null;
  const expiresAt = Math.round(Date.now() / 1000) + expiresInSeconds;
  return cloudinary.url(publicId, {
    resource_type: resourceType,
    type: deliveryType,
    sign_url: true,
    expires_at: expiresAt,
    secure: true,
    format,
  });
}
