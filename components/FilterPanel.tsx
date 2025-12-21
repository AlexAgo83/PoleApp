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
  const [open, setOpen] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(fullKey);
      if (saved === "true" || saved === "false") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setOpen(saved === "true");
        return;
      }
    } catch {
      // ignore
    }
    setOpen(false);
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
