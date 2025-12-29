"use client";

import { useEffect, useState } from "react";

type Props = {
  id: string;
  eyebrow?: string;
  heading: string;
  description?: string;
  actions?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

export function ProfileCollapsible({
  id,
  eyebrow,
  heading,
  description,
  actions,
  defaultOpen = false,
  children,
}: Props) {
  const storageKey = `profile:panel:${id}`;
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === "1") setOpen(true);
      if (stored === "0") setOpen(false);
    } catch {
      // ignore storage errors
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, open ? "1" : "0");
    } catch {
      // ignore storage errors
    }
  }, [open, storageKey]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          {eyebrow ? (
            <p className="text-sm uppercase tracking-[0.14em] text-cyan-200">{eyebrow}</p>
          ) : null}
          <h2 className="text-xl font-semibold text-white">{heading}</h2>
          {description ? <p className="text-sm text-slate-300">{description}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
            aria-expanded={open}
            aria-controls={`panel-${id}`}
          >
            {open ? "Réduire" : "Déployer"}
            <span className={`transition ${open ? "rotate-180" : ""}`}>▼</span>
          </button>
        </div>
      </div>
      {open ? (
        <div id={`panel-${id}`} className="space-y-4">
          {children}
        </div>
      ) : null}
    </div>
  );
}
