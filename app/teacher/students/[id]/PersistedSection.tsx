"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";

type Props = {
  id: string;
  summary: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  summaryClassName?: string;
};

export function PersistedSection({
  id,
  summary,
  children,
  defaultOpen = false,
  className,
  summaryClassName,
}: Props) {
  const storageKey = `teacher-student:${id}:open`;
  const [open, setOpen] = useState<boolean>(defaultOpen);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      setHydrated(true);
      const stored = window.localStorage.getItem(storageKey);
      if (stored === "true" || stored === "false") {
        setOpen(stored === "true");
      }
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(storageKey, open ? "true" : "false");
    } catch {
      /* ignore */
    }
  }, [open, storageKey, hydrated]);

  return (
    <details
      open={hydrated ? open : defaultOpen}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className={clsx("group", className)}
    >
      <summary
        className={clsx(
          "flex cursor-pointer items-center justify-between text-lg font-semibold text-white outline-none transition hover:text-cyan-100",
          summaryClassName,
        )}
      >
        {summary}
      </summary>
      <div>{children}</div>
    </details>
  );
}
