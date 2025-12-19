"use client";

import { useEffect, useState } from "react";

type Status = "loading" | "up" | "down";

export function HealthBadge() {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("/health", { cache: "no-store" });
        if (!cancelled) {
          setStatus(res.ok ? "up" : "down");
        }
      } catch {
        if (!cancelled) {
          setStatus("down");
        }
      }
    }

    check();
    const id = setInterval(check, 30000); // toutes les 30s pour éviter de spammer

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const color =
    status === "up" ? "bg-emerald-400" : status === "down" ? "bg-rose-500" : "bg-amber-300";
  const label =
    status === "up" ? "Health: OK" : status === "down" ? "Health: DOWN" : "Health: ...";

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm font-semibold text-white">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </div>
  );
}
