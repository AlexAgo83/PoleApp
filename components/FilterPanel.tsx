"use client";

import { useEffect, useState } from "react";

type FilterPanelProps = {
  storageKey: string;
  title: string;
  activeCount?: number;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  userKey?: string;
  titleClassName?: string;
};

/**
 * Collapsible filter panel with persisted open/closed state in localStorage.
 * Defaults to collapsed; restores last state per storageKey.
 */
export function FilterPanel({
  storageKey,
  title,
  activeCount = 0,
  children,
  className,
  contentClassName,
  userKey = "anon",
  titleClassName,
}: FilterPanelProps) {
  const fullKey = `${userKey}:${storageKey}`;
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const saved = localStorage.getItem(fullKey);
      if (saved === "true" || saved === "false") {
        return saved === "true";
      }
    } catch {
      // ignore
    }
    return false;
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(fullKey);
      if (saved === "true" || saved === "false") {
        setOpen(saved === "true");
      }
    } catch {
      // ignore
    }
  }, [fullKey]);

  useEffect(() => {
    try {
      localStorage.setItem(fullKey, open ? "true" : "false");
    } catch {
      // ignore
    }
  }, [fullKey, open]);

  return (
    <details
      className={className ? `group ${className}` : "group"}
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary
        className={`flex cursor-pointer items-center justify-between text-sm font-semibold text-white ${
          titleClassName ?? ""
        }`}
      >
        <span className="inline-flex items-center gap-2">
          <span>{title}</span>
          {activeCount > 0 && (
            <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[11px] font-semibold text-cyan-100">
              {activeCount}
            </span>
          )}
        </span>
        <span className="text-xs text-slate-300 transition-transform group-open:rotate-180">
          ▼
        </span>
      </summary>
      <div className={contentClassName}>{children}</div>
    </details>
  );
}
