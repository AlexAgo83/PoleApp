"use client";

import { useState } from "react";

type Props = {
  label?: string;
  currentUrl?: string | null;
  currentPublicId?: string | null;
  folder: string;
  resourceType?: "image" | "video";
  accept?: string;
  maxSizeMB?: number;
  transformPreset?: "avatar" | "cover";
  deliveryType?: "upload" | "authenticated";
  onChange: (url: string | null, publicId?: string | null) => void;
};

type SignatureResponse = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  publicId?: string;
  resourceType: "image" | "video";
  deliveryType?: "upload" | "authenticated";
  transformation?: string;
};

export function CloudinaryUpload({
  label,
  currentUrl,
  currentPublicId,
  folder,
  resourceType = "image",
  accept = "image/*",
  maxSizeMB = 5,
  transformPreset,
  deliveryType = "upload",
  onChange,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isVideo = resourceType === "video";
  const avatarFolder = process.env.NEXT_PUBLIC_CLOUDINARY_AVATAR_FOLDER ?? "poleapp/avatars";
  const forceAuthenticated = resourceType === "video" || folder.startsWith(avatarFolder);

  const handleSelect = async (file?: File | null) => {
    if (!file) return;
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`Fichier trop volumineux (max ${maxSizeMB}MB)`);
      return;
    }
    setError(null);
    setUploading(true);
    const transformation =
      transformPreset === "avatar"
        ? "c_fill,g_auto:face,h_400,w_400,q_auto,f_auto"
        : transformPreset === "cover"
          ? "c_fill,g_auto,h_720,w_1280,q_auto,f_auto"
          : undefined;
    try {
      const sigRes = await fetch("/api/uploads/signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folder,
          publicId: currentPublicId ?? undefined,
          resourceType,
          deliveryType: forceAuthenticated ? "authenticated" : deliveryType,
          accessMode: forceAuthenticated || deliveryType === "authenticated" ? "authenticated" : undefined,
          transformation,
        }),
      });
      if (!sigRes.ok) {
        const txt = await sigRes.text().catch(() => "");
        console.error("[cloudinary-upload] signature failed", sigRes.status, txt);
        throw new Error("Signature indisponible");
      }
      const sig: SignatureResponse = await sigRes.json();

      const form = new FormData();
      form.append("file", file);
      form.append("api_key", sig.apiKey);
      form.append("timestamp", String(sig.timestamp));
      form.append("signature", sig.signature);
      form.append("folder", sig.folder);
      if (sig.publicId) form.append("public_id", sig.publicId);
      if (sig.deliveryType && sig.deliveryType !== "upload") {
        form.append("type", sig.deliveryType);
        form.append("access_mode", "authenticated");
      }
      if (sig.transformation) {
        form.append("transformation", sig.transformation);
      }

      const uploadUrl = `https://api.cloudinary.com/v1_1/${sig.cloudName}/${sig.resourceType}/upload`;
      const uploadRes = await fetch(uploadUrl, { method: "POST", body: form });
      if (!uploadRes.ok) {
        const txt = await uploadRes.text().catch(() => "");
        console.error("[cloudinary-upload] upload failed", uploadRes.status, txt);
        throw new Error("Upload Cloudinary échoué");
      }
      const uploaded = await uploadRes.json();
      onChange(uploaded.secure_url as string, uploaded.public_id as string);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentPublicId) {
      onChange(null, null);
      return;
    }
    setUploading(true);
    setError(null);
    try {
      await fetch("/api/uploads", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicId: currentPublicId,
          resourceType,
          deliveryType: forceAuthenticated ? "authenticated" : deliveryType,
        }),
      });
      onChange(null, null);
    } catch (e) {
      console.error("[cloudinary-upload] delete failed", e);
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-semibold text-slate-100">{label}</p>}
      <div className="flex flex-wrap items-center gap-3">
        {currentUrl ? (
          isVideo ? (
            <video
              src={currentUrl}
              className="h-24 w-36 rounded-lg object-cover"
              controls
              preload="metadata"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentUrl} alt="aperçu" className="h-24 w-24 rounded-lg object-cover" />
          )
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-dashed border-white/20 text-xs text-slate-300">
            Aucun
          </div>
        )}
        <div className="flex gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-300/70 hover:bg-white/15">
            <input
              type="file"
              accept={accept}
              className="hidden"
              onChange={(e) => handleSelect(e.target.files?.[0])}
              disabled={uploading}
            />
            {uploading ? "Téléversement..." : "Uploader"}
          </label>
          <button
            type="button"
            onClick={handleDelete}
            disabled={uploading || !currentUrl}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-red-300/70 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Supprimer
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-amber-300">{error}</p>}
    </div>
  );
}
