"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";

const STATUS_ORDER = ["NOT_STARTED", "IN_PROGRESS", "PASSED", "MASTERED"] as const;
const STATUS_LABELS: Record<(typeof STATUS_ORDER)[number], string> = {
  NOT_STARTED: "Nouveau",
  IN_PROGRESS: "Initié",
  PASSED: "Passé",
  MASTERED: "Fluide",
};

type Props = {
  name?: string;
  defaultValue?: (typeof STATUS_ORDER)[number];
  hideLabel?: boolean;
  hideValue?: boolean;
  readOnly?: boolean;
  tone?: "default" | "cyan" | "neutral";
  includeHidden?: boolean;
  onChange?: (value: (typeof STATUS_ORDER)[number]) => void;
};

export function ProgressSlider({
  name,
  defaultValue = "NOT_STARTED",
  hideLabel,
  hideValue,
  readOnly,
  tone = "default",
  includeHidden = true,
  onChange,
}: Props) {
  const defaultIndex = useMemo(
    () => Math.max(0, STATUS_ORDER.indexOf(defaultValue as any)),
    [defaultValue],
  );
  const [index, setIndex] = useState<number>(defaultIndex);
  const current = STATUS_ORDER[index] ?? "NOT_STARTED";

  return (
    <div className="space-y-2">
      {!hideLabel || !hideValue ? (
        <div className="flex items-center justify-between text-xs text-slate-200">
          {!hideLabel ? <span>Sélectionne le nouveau statut</span> : <span />}
          {!hideValue ? (
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-white">
              {STATUS_LABELS[current]}
            </span>
          ) : (
            <span />
          )}
        </div>
      ) : null}
      <input
        type="range"
        min={0}
        max={STATUS_ORDER.length - 1}
        step={1}
        value={index}
        onChange={(e) => {
          const next = Number(e.target.value);
          setIndex(next);
          const status = STATUS_ORDER[next] ?? "NOT_STARTED";
          onChange?.(status);
        }}
        disabled={readOnly}
        className={clsx(
          "w-full appearance-none rounded-full",
          tone === "cyan"
            ? "bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-500"
            : tone === "neutral"
            ? "bg-white/20"
            : "bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400",
          readOnly ? "cursor-not-allowed opacity-60" : "cursor-pointer",
          "h-2 outline-none",
        )}
        aria-label="Statut de progression"
      />
      <div className="flex justify-between text-[11px] uppercase tracking-[0.08em] text-slate-400">
        {STATUS_ORDER.map((status, i) => (
          <span key={status} className={clsx(i === index ? "text-white" : "text-slate-400")}>
            {STATUS_LABELS[status]}
          </span>
        ))}
      </div>
      {name && includeHidden ? <input type="hidden" name={name} value={current} /> : null}
    </div>
  );
}
