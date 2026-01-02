"use client";

import { useEffect, useState } from "react";

import { CloudinaryUpload } from "./CloudinaryUpload";

type Props = {
  name: string;
  label?: string;
  currentUrl?: string | null;
  currentPublicId?: string | null;
  folder: string;
  resourceType?: "image" | "video";
  accept?: string;
  maxSizeMB?: number;
  transformPreset?: "avatar" | "cover";
  deliveryType?: "upload" | "authenticated";
  maxWidth?: number;
  maxHeight?: number;
};

/**
 * Client-side wrapper to use CloudinaryUpload inside server components.
 * Persists the chosen publicId into a hidden input.
 */
export function CloudinaryField({
  name,
  label,
  currentUrl,
  currentPublicId,
  folder,
  resourceType = "image",
  accept,
  maxSizeMB,
  transformPreset,
  deliveryType,
  maxWidth,
  maxHeight,
}: Props) {
  const [publicId, setPublicId] = useState(currentPublicId ?? "");

  useEffect(() => {
    setPublicId(currentPublicId ?? "");
  }, [currentPublicId]);

  return (
    <div className="space-y-1">
      <CloudinaryUpload
        label={label}
        currentUrl={currentUrl}
        currentPublicId={publicId || undefined}
        folder={folder}
        resourceType={resourceType}
        accept={accept}
        maxSizeMB={maxSizeMB}
        transformPreset={transformPreset}
        deliveryType={deliveryType}
        maxWidth={maxWidth}
        maxHeight={maxHeight}
        onChange={(_, nextPublicId) => setPublicId(nextPublicId ?? "")}
      />
      <input type="hidden" name={name} value={publicId} />
    </div>
  );
}
