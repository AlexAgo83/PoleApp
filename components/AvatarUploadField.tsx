"use client";

import { useState } from "react";

import { CloudinaryUpload } from "./CloudinaryUpload";

type Props = {
  label?: string;
  folder: string;
  currentUrl?: string | null;
  currentPublicId?: string | null;
  maxSizeMB?: number;
  onChange?: (url: string | null, publicId: string | null) => void;
};

export function AvatarUploadField({
  label = "Photo",
  folder,
  currentUrl,
  currentPublicId,
  maxSizeMB = 4,
  onChange,
}: Props) {
  const [url, setUrl] = useState<string | null>(currentUrl ?? null);
  const [publicId, setPublicId] = useState<string | null>(currentPublicId ?? null);

  return (
    <div className="space-y-2">
      <CloudinaryUpload
        label={label}
        currentUrl={url ?? undefined}
        currentPublicId={publicId ?? undefined}
        folder={folder}
        maxSizeMB={maxSizeMB}
        maxWidth={2160}
        maxHeight={2160}
        deliveryType="authenticated"
        transformPreset="avatar"
        onChange={(newUrl, newPublicId) => {
          setUrl(newUrl);
          setPublicId(newPublicId ?? null);
          onChange?.(newUrl, newPublicId ?? null);
        }}
      />
      <input type="hidden" name="avatarUrl" value={url ?? ""} />
      <input type="hidden" name="avatarPublicId" value={publicId ?? ""} />
    </div>
  );
}
