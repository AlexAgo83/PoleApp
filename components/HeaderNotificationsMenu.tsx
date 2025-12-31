"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

export function HeaderNotificationsMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:border-cyan-300/70 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Notifications"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-5-5.917V4a1 1 0 10-2 0v1.083A6 6 0 006 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5" />
          <path d="M13 19a2 2 0 11-4 0" />
        </svg>
      </button>
      <div
        className={clsx(
          "absolute right-0 mt-2 w-56 rounded-xl border border-white/10 bg-slate-900/90 p-3 shadow-xl shadow-black/30 backdrop-blur",
          open ? "block" : "hidden"
        )}
      >
        <p className="text-sm font-semibold text-white">Notifications</p>
        <p className="mt-2 text-xs text-slate-300">Aucune notification pour le moment.</p>
      </div>
    </div>
  );
}
