"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { MasteryLevel } from "@prisma/client";

const ORDER: MasteryLevel[] = [
  MasteryLevel.NOVELTY,
  MasteryLevel.INITIATED,
  MasteryLevel.PASSED,
  MasteryLevel.FLUID_CHOREO,
];

const LABELS: Record<MasteryLevel, string> = {
  [MasteryLevel.NOVELTY]: "Nouveau",
  [MasteryLevel.INITIATED]: "Initié",
  [MasteryLevel.PASSED]: "Passé",
  [MasteryLevel.FLUID_CHOREO]: "Fluide",
};

type Props = {
  name?: string;
  defaultValue?: MasteryLevel | null;
  hideLabel?: boolean;
  hideValue?: boolean;
  tone?: "default" | "neutral";
  includeHidden?: boolean;
  onChange?: (value: MasteryLevel) => void;
};

export function MasterySlider({
  name,
  defaultValue = MasteryLevel.INITIATED,
  hideLabel,
  hideValue,
  tone = "default",
  includeHidden = true,
  onChange,
}: Props) {
  const defaultIndex = useMemo(
    () => Math.max(0, ORDER.indexOf(defaultValue)),
    [defaultValue],
  );
  const [index, setIndex] = useState<number>(defaultIndex);
  const current = ORDER[index] ?? MasteryLevel.NOVELTY;

  return (
    <div className="space-y-2">
      {!hideLabel || !hideValue ? (
        <div className="flex items-center justify-between text-[11px] text-slate-200">
          {!hideLabel ? <span>Sélectionne le niveau</span> : <span />}
          {!hideValue ? (
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-white">
              {LABELS[current]}
            </span>
          ) : (
            <span />
          )}
        </div>
      ) : null}
      <input
        type="range"
        min={0}
        max={ORDER.length - 1}
        step={1}
        value={index}
        onChange={(e) => {
          const next = Number(e.target.value);
          setIndex(next);
          const nextStatus = ORDER[next] ?? MasteryLevel.NOVELTY;
          onChange?.(nextStatus);
        }}
        className={clsx(
          "w-full appearance-none rounded-full",
          tone === "neutral"
            ? "bg-white/20"
            : "bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400",
          "h-2 cursor-pointer outline-none",
        )}
        aria-label="Niveau atteint"
      />
      <div className="flex justify-between text-[10px] uppercase tracking-[0.08em] text-slate-400">
        {ORDER.map((status, i) => (
          <span key={status} className={clsx(i === index ? "text-white" : "text-slate-400")}>
            {LABELS[status]}
          </span>
        ))}
      </div>
      {name && includeHidden ? <input type="hidden" name={name} value={current} /> : null}
    </div>
  );
}
