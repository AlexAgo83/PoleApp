"use client";

import { useRouter } from "next/navigation";
import { useMemo, useTransition } from "react";

type Props = {
  basePath?: string;
  baseParams?: string;
  prev: string;
  current: string;
  next: string;
  className?: string;
  onSelect?: (value: string) => void;
  loading?: boolean;
};

export function MonthNav({ basePath, baseParams, prev, current, next, className, onSelect, loading }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const paramsObj = useMemo(() => new URLSearchParams(baseParams ?? ""), [baseParams]);

  const goTo = (monthValue: string) => {
    if (onSelect) {
      onSelect(monthValue);
      return;
    }
    if (!basePath) return;
    const params = new URLSearchParams(paramsObj.toString());
    params.set("month", monthValue);
    const search = params.toString();
    startTransition(() => {
      router.push(`${basePath}${search ? `?${search}` : ""}`);
    });
  };

  const disabled = loading || isPending;

  return (
    <div className={`flex flex-wrap items-center justify-center gap-2 text-sm text-white ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => goTo(prev)}
        className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-semibold transition hover:border-cyan-400/70 hover:bg-white/10 disabled:opacity-60"
        disabled={disabled}
      >
        ←
      </button>
      <button
        type="button"
        onClick={() => goTo(current)}
        className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-semibold transition hover:border-cyan-400/70 hover:bg-white/10 disabled:opacity-60"
        disabled={disabled}
      >
        Actuelle
      </button>
      <button
        type="button"
        onClick={() => goTo(next)}
        className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-semibold transition hover:border-cyan-400/70 hover:bg-white/10 disabled:opacity-60"
        disabled={disabled}
      >
        →
      </button>
    </div>
  );
}
