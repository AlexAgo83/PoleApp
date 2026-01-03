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
  const [hydrated, setHydrated] = useState(false);
  const [open, setOpen] = useState<boolean>(defaultOpen);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored === "true" || stored === "false") {
        setOpen(stored === "true");
      }
    } catch {
      // ignore read errors
    } finally {
      setHydrated(true);
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, open ? "true" : "false");
    } catch {
      // ignore write errors (e.g., SSR)
    }
  }, [open, storageKey]);

  return (
    <details
      open={hydrated ? open : undefined}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className={clsx("group", className)}
    >
      <summary
        className={clsx(
          "flex w-full cursor-pointer items-center justify-between text-xl font-semibold text-white outline-none transition hover:text-cyan-100",
          summaryClassName,
        )}
      >
        {summary}
      </summary>
      <div>{children}</div>
    </details>
  );
}
