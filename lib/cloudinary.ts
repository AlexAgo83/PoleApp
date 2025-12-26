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

export function signUpload(options: { folder: string; publicId?: string; resourceType?: "image" | "video" }) {
  if (!isCloudinaryEnabled()) {
    throw new Error("Cloudinary not configured");
  }
  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign: Record<string, string | number> = {
    timestamp,
    folder: options.folder,
  };
  if (options.publicId) paramsToSign.public_id = options.publicId;
  if (options.resourceType) paramsToSign.resource_type = options.resourceType;

  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret as string);

  return {
    cloudName,
    apiKey,
    timestamp,
    signature,
    folder: options.folder,
    publicId: options.publicId,
    resourceType: options.resourceType ?? "image",
  };
}

export async function destroyAsset(publicId: string, resourceType: "image" | "video" = "image") {
  if (!isCloudinaryEnabled()) {
    throw new Error("Cloudinary not configured");
  }
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}
