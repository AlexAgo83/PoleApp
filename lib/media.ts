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

const seedPositionVideos = ["01_xphtvq", "02_e8rhmg", "03_yjmfi7", "04_exjndq", "05_flr6zp", "06_shrnly"];
const seedPositionPhotos = [
  "po_01_haci3z",
  "po_02_fl8akp",
  "po_03_tdkgoo",
  "po_04_xysi2j",
  "po_05_xlfq5t",
  "po_06_lx7gwx",
  "po_07_xisr9g",
  "po_08_aexxm6",
  "po_09_guym8w",
  "po_10_olw4fz",
  "po_11_cygxow",
  "po_12_g9vukb",
  "po_13_vdwgew",
  "po_14_nrxlmz",
  "po_15_o3nbw9",
  "po_16_dqdlc4",
  "po_17_rocm06",
  "po_18_xaekjy",
  "po_19_dfrqlk",
  "po_20_akrajr",
];
const seedPresetImages = ["ps_001_fe48zf", "ps_002_r2gphs"];

export const SEED_MEDIA_IDS = new Set([...seedPositionVideos, ...seedPositionPhotos, ...seedPresetImages]);

export function isSeedPublicId(publicId?: string | null): boolean {
  if (!publicId) return false;
  const base = publicId.split("/").pop()?.trim();
  if (!base) return false;
  return SEED_MEDIA_IDS.has(base);
}

export function normalizeFolderedPublicId(publicId: string | null | undefined, folder = "poleapp/positions") {
  const trimmed = publicId?.trim();
  if (!trimmed) return null;
  const folderParts = folder.split("/").filter(Boolean);
  const tokens = trimmed.split("/").filter(Boolean);
  // Trouve la dernière occurrence du dossier (ex: poleapp/positions) pour éviter les doublons
  const lastIdx = tokens.lastIndexOf(folderParts[folderParts.length - 1]);
  if (lastIdx >= folderParts.length - 1) {
    const candidate = tokens.slice(lastIdx - (folderParts.length - 1), lastIdx + 1).join("/");
    if (candidate === folderParts.join("/")) {
      const tail = tokens.slice(lastIdx + 1);
      return [...folderParts, ...tail].join("/");
    }
  }
  if (trimmed.startsWith(`${folder}/`)) return trimmed;
  return trimmed;
}
