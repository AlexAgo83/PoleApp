"use client";

import { useEffect, useMemo, useState } from "react";

type DisciplineMultiSelectProps = {
  options: string[];
  selected: string[];
  inputName: string;
  storageKey: string;
  initialVisible?: number;
};

/**
 * Chips multi-sélection avec persistance de l'état "voir plus" en localStorage.
 * Le formulaire reste natif (checkboxes nommées), la sélection se voit immédiatement.
 */
export function DisciplineMultiSelect({
  options,
  selected,
  inputName,
  storageKey,
  initialVisible = 8,
}: DisciplineMultiSelectProps) {
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}:showAll`);
      if (saved === "true") setShowAll(true);
    } catch {
      // ignore
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(`${storageKey}:showAll`, showAll ? "true" : "false");
    } catch {
      // ignore
    }
  }, [showAll, storageKey]);

  const displayOptions = useMemo(() => (showAll ? options : options.slice(0, initialVisible)), [options, showAll, initialVisible]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {displayOptions.map((value) => {
          const checked = selected.includes(value);
          return (
            <label
              key={value}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-white/5 px-1.5 py-1 text-xs font-semibold text-slate-200"
            >
              <input type="checkbox" name={inputName} value={value} defaultChecked={checked} className="peer sr-only" />
              <span className="rounded-full px-2.5 py-0.5 transition peer-checked:border peer-checked:border-cyan-300/70 peer-checked:bg-cyan-500/20 peer-checked:text-white">
                {value}
              </span>
            </label>
          );
        })}
      </div>
      {options.length > initialVisible && (
        <button
          type="button"
          onClick={() => setShowAll((s) => !s)}
          className="text-xs font-semibold text-cyan-200 transition hover:text-white"
        >
          {showAll ? "Voir moins" : `Voir plus (${options.length - initialVisible})`}
        </button>
      )}
    </div>
  );
}
