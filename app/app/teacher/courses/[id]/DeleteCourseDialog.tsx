"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { deleteCourseAction } from "./actions";

type Props = {
  courseId: string;
  virtualOccurrencesCount: number;
};

export function DeleteCourseDialog({ courseId, virtualOccurrencesCount }: Props) {
  const [open, setOpen] = useState(false);
  const [alsoDeleteVirtual, setAlsoDeleteVirtual] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const close = () => {
    setOpen(false);
    setAlsoDeleteVirtual(false);
  };

  const modal = open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-auto rounded-2xl border border-white/10 bg-slate-900 px-5 py-6 text-white shadow-2xl shadow-black/50">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-rose-200/80">Suppression</p>
            <h3 className="text-2xl font-semibold text-white">Confirmer la suppression</h3>
            <p className="mt-2 text-sm text-slate-200">
              Action irréversible. Les présences, positions, notes et factures liées seront supprimées.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded-full border border-white/10 px-3 py-1.5 text-sm font-semibold text-slate-200 transition hover:border-white/30 hover:text-white"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        {virtualOccurrencesCount > 0 && (
          <label className="mt-5 flex items-start gap-2 text-sm text-slate-100">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-white/30 bg-white/5"
              checked={alsoDeleteVirtual}
              onChange={(e) => setAlsoDeleteVirtual(e.target.checked)}
            />
            <span>
              Supprimer aussi les {virtualOccurrencesCount} occurrence(s) programmée(s) associée(s) à ce cours.
            </span>
          </label>
        )}

        <div className="mt-auto flex flex-col gap-3 pt-8">
          <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-100">
            <span className="font-semibold text-white">Résumé</span>
            <span>• Cours supprimé définitivement</span>
            <span>• Présences, notes, positions et factures associées supprimées</span>
            {virtualOccurrencesCount > 0 && (
              <span>
                • Occurrences programmées{" "}
                {alsoDeleteVirtual ? "seront aussi supprimées." : "seront conservées si case non cochée."}
              </span>
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={close}
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/30 hover:text-white"
            >
              Annuler
            </button>
            <form action={deleteCourseAction}>
              <input type="hidden" name="courseId" value={courseId} />
              <input
                type="hidden"
                name="deleteVirtualOccurrences"
                value={alsoDeleteVirtual && virtualOccurrencesCount > 0 ? "true" : "false"}
              />
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400"
              >
                Supprimer définitivement
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400"
      >
        Supprimer
      </button>

      {mounted && modal ? createPortal(modal, document.body) : null}
    </div>
  );
}
