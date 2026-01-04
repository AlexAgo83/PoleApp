"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type PositionFragment = {
  position: {
    name: string;
  };
};

type Combo = {
  id: string;
  title: string | null;
  discipline: string | null;
  priceCredits: number | null;
  premiumRequired: boolean | null;
  imagePublicId: string | null;
  positions: PositionFragment[];
};

type Props = {
  teacherId: string;
  combos: Combo[];
  fromPath?: string;
  cloudName?: string;
  initialPage?: number;
};

const COMBOS_PER_PAGE = 4;

const priceLabel = (priceCredits: number | null | undefined, premiumRequired: boolean | null | undefined) => {
  if (premiumRequired) return "Premium";
  if (priceCredits && priceCredits > 0) return `${priceCredits} crédits`;
  return "Gratuit";
};

const buildBackground = (publicId: string | null, cloudName?: string) => {
  if (!publicId || !cloudName) return undefined;
  return {
    backgroundImage: `linear-gradient(135deg, rgba(12,18,40,0.78), rgba(26,16,60,0.78)), url(https://res.cloudinary.com/${cloudName}/image/upload/c_fill,g_auto,f_auto,q_auto,w_800,h_480/${publicId})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  } as const;
};

export function TeacherCombosGrid({ teacherId, combos, fromPath, cloudName, initialPage }: Props) {
  const totalPages = Math.max(1, Math.ceil(combos.length / COMBOS_PER_PAGE));
  const [page, setPage] = useState(Math.min(totalPages, Math.max(1, initialPage ?? 1)));

  const pagedCombos = useMemo(
    () => combos.slice((page - 1) * COMBOS_PER_PAGE, page * COMBOS_PER_PAGE),
    [combos, page],
  );

  const safeFrom = fromPath ?? `/teachers/${teacherId}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-white">Combos</h2>
        {totalPages > 1 ? (
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={`rounded-full border px-2 py-1 transition ${page > 1 ? "border-white/15 bg-white/5 hover:border-cyan-300/60 hover:bg-white/10" : "border-white/5 bg-white/5 text-slate-500"}`}
              disabled={page <= 1}
              aria-disabled={page <= 1}
            >
              ←
            </button>
            <span>
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className={`rounded-full border px-2 py-1 transition ${page < totalPages ? "border-white/15 bg-white/5 hover:border-cyan-300/60 hover:bg-white/10" : "border-white/5 bg-white/5 text-slate-500"}`}
              disabled={page >= totalPages}
              aria-disabled={page >= totalPages}
            >
              →
            </button>
          </div>
        ) : null}
      </div>

      {combos.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {pagedCombos.map((preset) => (
            <Link
              key={preset.id}
              href={`/presets/${preset.id}?from=${encodeURIComponent(safeFrom)}`}
              className="relative block overflow-hidden rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white transition hover:border-cyan-300/70 hover:bg-white/10"
              style={buildBackground(preset.imagePublicId, cloudName)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.12em] text-indigo-100">{preset.discipline ?? "—"}</p>
                  <p className="text-base font-semibold">{preset.title}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[11px] text-slate-100">
                  {priceLabel(preset.priceCredits ?? null, preset.premiumRequired ?? false)}
                </span>
              </div>
              {preset.positions.length > 0 ? (
                <p className="mt-1 text-xs text-slate-200">
                  Positions : {preset.positions.map((pp) => pp.position.name).join(", ")}
                </p>
              ) : (
                <p className="mt-1 text-xs text-slate-400">Aucune position liée.</p>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-300">Aucun combo créé pour le moment.</p>
      )}
    </div>
  );
}
