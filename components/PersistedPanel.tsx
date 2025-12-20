"use client";

import { useEffect, useState } from "react";

type PersistedPanelProps = {
  storageKey: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  defaultOpen?: boolean;
};

/**
 * Collapsible panel with persisted open/closed state in localStorage.
 * Useful for non-filtre sections (ex: creation forms) while keeping the same UX as FilterPanel.
 */
export function PersistedPanel({
  storageKey,
  title,
  subtitle,
  children,
  className,
  contentClassName,
  defaultOpen = false,
}: PersistedPanelProps) {
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return defaultOpen;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === "true" || saved === "false") {
        return saved === "true";
      }
    } catch {
      // ignore storage errors
    }
    return defaultOpen;
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === "true" || saved === "false") {
        setOpen(saved === "true");
      }
    } catch {
      // ignore
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, open ? "true" : "false");
    } catch {
      // ignore
    }
  }, [storageKey, open]);

  return (
    <details
      className={className ? `group ${className}` : "group"}
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-white">
        <div className="flex flex-col">
          <span>{title}</span>
          {subtitle && <span className="text-xs font-normal text-slate-300">{subtitle}</span>}
        </div>
        <span className="text-xs text-slate-300 transition-transform group-open:rotate-180">▼</span>
      </summary>
      <div className={contentClassName}>{children}</div>
    </details>
  );
}
