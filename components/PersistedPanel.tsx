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
  userKey?: string;
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
  userKey = "anon",
}: PersistedPanelProps) {
  const fullKey = `${userKey}:${storageKey}`;
  const [open, setOpen] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(fullKey);
      if (saved === "true" || saved === "false") {
        setOpen(saved === "true");
        return;
      }
    } catch {
      // ignore
    }
    setOpen(defaultOpen);
  }, [fullKey]);

  useEffect(() => {
    if (open === null) return;
    try {
      localStorage.setItem(fullKey, open ? "true" : "false");
    } catch {
      // ignore
    }
  }, [fullKey, open]);

  const resolvedOpen = open ?? undefined;

  return (
    <details
      className={className ? `group ${className}` : "group"}
      open={resolvedOpen}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary className="flex cursor-pointer items-center justify-between text-xl font-semibold text-white">
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
