"use client";

import { ButtonHTMLAttributes, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";

type Props = {
  cost: number;
  label: string;
  disabled?: boolean;
  className?: string;
  title?: string;
  ariaLabel?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "onClick" | "children">;

export function ConfirmEnrollButton({ cost, label, disabled, className, title, ariaLabel, ...rest }: Props) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [formEl, setFormEl] = useState<HTMLFormElement | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const openModal = () => {
    if (disabled) return;
    const form = btnRef.current?.closest("form") as HTMLFormElement | null;
    setFormEl(form);
    setOpen(true);
  };

  const close = () => setOpen(false);

  const confirm = () => {
    setOpen(false);
    if (formEl) {
      formEl.requestSubmit();
    }
  };

  const modal = (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" aria-hidden="true" onClick={close} />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-950/95 p-6 shadow-2xl shadow-indigo-900/40">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-indigo-100">Confirmation</p>
            <h3 className="text-xl font-semibold text-white">S&apos;inscrire au cours</h3>
            <p className="mt-1 text-sm text-slate-300">
              Vous allez dépenser <span className="font-semibold text-white">{cost} crédits</span> pour rejoindre ce cours.
              Confirmez pour continuer.
            </p>
          </div>
          <button
            type="button"
            className="text-slate-400 transition hover:text-white"
            onClick={close}
            aria-label="Fermer la confirmation d'inscription"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            className="rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-300/70 hover:bg-white/10"
            onClick={close}
          >
            Annuler
          </button>
          <button
            type="button"
            className="rounded-lg border border-cyan-300/60 bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-cyan-50 shadow shadow-cyan-900/30 transition hover:border-cyan-200 hover:bg-cyan-500/30"
            onClick={confirm}
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={openModal}
        disabled={disabled}
        className={clsx(className)}
        title={title}
        aria-label={ariaLabel ?? title}
        {...rest}
      >
        {label}
      </button>
      {mounted && open ? createPortal(modal, document.body) : null}
    </>
  );
}
