"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";

type Props = {
  id: string;
  summary: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  summaryClassName?: string;
  className?: string;
};

export function CollapsibleSection({
  id,
  summary,
  children,
  defaultOpen = false,
  summaryClassName,
  className,
}: Props) {
  const storageKey = `admin-school:${id}:open`;
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = window.localStorage.getItem(storageKey);
        if (stored === "true" || stored === "false") {
          return stored === "true";
        }
      } catch {
        // ignore read errors
      }
    }
    return defaultOpen;
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, open ? "true" : "false");
    } catch {
      // ignore write errors (e.g., SSR)
    }
  }, [open, storageKey]);

  return (
    <details
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className={clsx("group space-y-4", className)}
    >
      <summary
        className={clsx(
          "flex w-full cursor-pointer items-center justify-between text-xl font-semibold text-white outline-none transition hover:text-cyan-100",
          summaryClassName,
        )}
      >
        {summary}
      </summary>
      {children}
    </details>
  );
}
