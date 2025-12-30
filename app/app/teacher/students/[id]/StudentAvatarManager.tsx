"use client";

import { useState, useTransition } from "react";

import { AvatarUploadField } from "@/components/AvatarUploadField";
import { updateStudentAvatarAction } from "./actions";

type Props = {
  studentId: string;
  folder: string;
  initialUrl?: string | null;
  initialPublicId?: string | null;
  returnTo?: string | null;
};

export function StudentAvatarManager({
  studentId,
  folder,
  initialUrl,
  initialPublicId,
  returnTo,
}: Props) {
  const [url, setUrl] = useState<string | null>(initialUrl ?? null);
  const [publicId, setPublicId] = useState<string | null>(initialPublicId ?? null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const handleChange = (newUrl: string | null, newPublicId: string | null) => {
    setUrl(newUrl);
    setPublicId(newPublicId);
    setMessage(null);
    startTransition(async () => {
      try {
        await updateStudentAvatarAction({
          studentId,
          avatarUrl: newUrl,
          avatarPublicId: newPublicId,
          returnTo: returnTo ?? undefined,
        });
        setMessage(newUrl ? "Photo enregistrée" : "Photo supprimée");
      } catch (error) {
        console.error("[student-avatar] save failed", error);
        setMessage("Échec de l’enregistrement");
      }
    });
  };

  return (
    <div className="space-y-2">
      <AvatarUploadField
        folder={folder}
        currentUrl={url ?? undefined}
        currentPublicId={publicId ?? undefined}
        maxSizeMB={4}
        label="Mettre à jour la photo"
        onChange={handleChange}
      />
      <div className="text-xs text-slate-300">
        {pending ? <span className="text-cyan-200">Enregistrement…</span> : message ? <span>{message}</span> : null}
      </div>
    </div>
  );
}
