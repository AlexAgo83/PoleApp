"use client";

import { useState } from "react";

type Props = {
  path: string; // ex: /app/student/courses/123
  label?: string;
  className?: string;
};

export function ShareLinkButton({ path, label = "Partager", className }: Props) {
  const [copied, setCopied] = useState(false);
  const handleShare = async () => {
    const url = `${window.location.origin}${path}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "PoleApp - Cours", url });
        return;
      }
    } catch {
      // ignore and fallback to copy
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-300/70 hover:bg-white/10 ${className ?? ""}`}
    >
      <span aria-hidden>🔗</span>
      {copied ? "Lien copié" : label}
    </button>
  );
}
