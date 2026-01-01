"use client";

import { useState } from "react";

type Props = {
  src: string;
  alt: string;
  className?: string;
};

export function ImageLightbox({ src, alt, className }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`group relative block overflow-hidden rounded-xl border border-white/10 bg-white/5 ${className ?? ""}`}
        aria-label="Voir l'image en plein écran"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover transition duration-200 group-hover:brightness-105"
        />
        <span className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-transparent opacity-0 transition duration-200 group-hover:opacity-100" />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-semibold uppercase tracking-[0.14em] text-white opacity-0 transition duration-200 group-hover:opacity-100">
          Cliquer pour agrandir
        </span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/70 p-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="presentation"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} className="h-full w-full object-contain" />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 inline-flex items-center justify-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/25"
            >
              Fermer
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-slate-100">
              {alt}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
