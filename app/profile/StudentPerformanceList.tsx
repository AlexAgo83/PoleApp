"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { LearningStatus } from "@prisma/client";

const statusLabels: Record<LearningStatus, string> = {
  NOT_STARTED: "Nouveauté",
  IN_PROGRESS: "Initié",
  PASSED: "Passé",
  MASTERED: "Fluide",
};

const statusProgress: Record<LearningStatus, number> = {
  NOT_STARTED: 10,
  IN_PROGRESS: 40,
  PASSED: 70,
  MASTERED: 100,
};

type PerformanceEntry = {
  positionId: string;
  positionName: string;
  learningStatus: LearningStatus;
  updatedAt: Date | null;
  hasComment?: boolean;
};

const PAGE_SIZE = 5;

export function StudentPerformanceList({
  items,
  hideLabel = false,
  label = "Positions suivies",
  labelClassName,
}: {
  items: PerformanceEntry[];
  hideLabel?: boolean;
  label?: string;
  labelClassName?: string;
}) {
  const [page, setPage] = useState(1);

  const { pageItems } = useMemo(() => {
    const total = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    const current = Math.min(Math.max(1, page), total);
    const slice = items.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
    return { pageItems: slice };
  }, [items, page]);

  const canPrev = page > 1;
  const canNext = page < Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const hasPagination = items.length > PAGE_SIZE;
  const showHeader = !hideLabel || hasPagination;
  const headerLabelClass =
    labelClassName ?? "text-xs uppercase tracking-[0.14em] text-slate-400";

  return (
    <div className="space-y-2 text-sm text-slate-200">
      {showHeader && (
        <div className={`flex items-center ${hideLabel ? "justify-end" : "justify-between"}`}>
          {!hideLabel && (
            <p className={headerLabelClass}>{label}</p>
          )}
          {hasPagination && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <button
              type="button"
              disabled={!canPrev}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={`rounded-full border px-2 py-1 font-semibold ${
                !canPrev ? "border-white/10 text-slate-600" : "border-white/20 text-white hover:border-cyan-300 hover:text-cyan-100"
              }`}
            >
              ←
            </button>
            <button
              type="button"
              disabled={!canNext}
              onClick={() => setPage((p) => Math.min(Math.max(1, Math.ceil(items.length / PAGE_SIZE)), p + 1))}
              className={`rounded-full border px-2 py-1 font-semibold ${
                !canNext ? "border-white/10 text-slate-600" : "border-white/20 text-white hover:border-cyan-300 hover:text-cyan-100"
              }`}
            >
              →
            </button>
          </div>
        )}
        </div>
      )}

      <div className="space-y-2">
        {pageItems.map((p) => (
          <Link
            key={p.positionId}
            href={`/positions/${p.positionId}`}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <span className="flex items-center gap-2">
              <span className="relative inline-flex items-center overflow-hidden rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-cyan-100">
                <span
                  className="absolute left-0 top-0 h-full bg-cyan-400/25"
                  style={{ width: `${statusProgress[p.learningStatus]}%` }}
                />
                <span className="relative z-10">
                  {statusLabels[p.learningStatus]}
                </span>
              </span>
              <span className="truncate text-white">{p.positionName || "Position"}</span>
            </span>
            <span className="flex items-center gap-2 text-xs text-slate-300">
              {p.hasComment ? (
                <span title="Note du professeur" aria-label="Note du professeur" className="text-[12px] text-cyan-200">
                  📝
                </span>
              ) : null}
              <span>{p.updatedAt ? new Date(p.updatedAt).toLocaleDateString("fr-FR") : "—"}</span>
            </span>
          </Link>
        ))}
      </div>

      {items.length > PAGE_SIZE && (
        <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
          <span>
            Page {page} / {Math.max(1, Math.ceil(items.length / PAGE_SIZE))} ({items.length} positions)
          </span>
        </div>
      )}
    </div>
  );
}
