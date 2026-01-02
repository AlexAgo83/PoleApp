"use client";

import { useState, useTransition } from "react";

import { AvatarUploadField } from "@/components/AvatarUploadField";
import { updateAvatarAction } from "./actions";

type Props = {
  folder: string;
  initialUrl?: string | null;
  initialPublicId?: string | null;
};

export function AvatarManager({ folder, initialUrl, initialPublicId }: Props) {
  const [url, setUrl] = useState<string | null>(initialUrl ?? null);
  const [publicId, setPublicId] = useState<string | null>(initialPublicId ?? null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const handleSave = (newUrl: string | null, newPublicId: string | null) => {
    setUrl(newUrl);
    setPublicId(newPublicId);
    setMessage(null);
    startTransition(async () => {
      try {
        await updateAvatarAction({
          avatarPublicId: newPublicId,
        });
        setMessage(newUrl ? "Photo mise à jour" : "Photo supprimée");
      } catch (error) {
        console.error("[avatar-manager] update failed", error);
        setMessage("Échec de la mise à jour");
      }
    });
  };

  return (
    <div className="space-y-2">
      <AvatarUploadField
        label="Photo de profil"
        folder={folder}
        currentUrl={url ?? undefined}
        currentPublicId={publicId ?? undefined}
        maxSizeMB={4}
        onChange={handleSave}
      />
      <div className="flex items-center gap-2 text-xs text-slate-300">
        {pending ? <span className="text-cyan-200">Mise à jour…</span> : null}
        {message ? <span>{message}</span> : null}
      </div>
    </div>
  );
}
