"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { signOut } from "next-auth/react";
import clsx from "clsx";

type Props = {
  label?: string;
  className?: string;
  children?: React.ReactNode;
  ariaLabel?: string;
  onOpenChange?: (open: boolean) => void;
  forceOpen?: boolean;
};

export function SignOutModalButton({
  label = "Déconnexion",
  className,
  children,
  ariaLabel,
  onOpenChange,
  forceOpen = false,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const isForced = forceOpen;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (forceOpen) {
      setOpen(true);
      onOpenChange?.(true);
    }
  }, [forceOpen, onOpenChange]);

  const close = (opts?: { bypassLock?: boolean }) => {
    if (isForced && !opts?.bypassLock) return;
    setOpen(false);
    onOpenChange?.(false);
  };

  const title = isForced ? "Session expirée" : "Se déconnecter";
  const description = isForced
    ? "Ta session à expirée.\nTu vas être redirigé vers la page d’accueil après confirmation."
    : "Tu vas être redirigé vers la page d’accueil après confirmation.";

  const modal = (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        aria-hidden="true"
        onClick={isForced ? undefined : () => close()}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-950/95 p-6 shadow-2xl shadow-indigo-900/40">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-indigo-100">Sécurité</p>
            <h3 className="text-xl font-semibold text-white">{title}</h3>
            <p className="mt-1 whitespace-pre-line text-sm text-slate-300">{description}</p>
          </div>
          {!isForced && (
            <button
              type="button"
              className="text-slate-400 transition hover:text-white"
              onClick={() => close()}
              aria-label="Fermer la confirmation de déconnexion"
            >
              ✕
            </button>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          {!isForced && (
            <button
              type="button"
              className="rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-300/70 hover:bg-white/10"
              onClick={() => close()}
            >
              Annuler
            </button>
          )}
          <button
            type="button"
            className="rounded-lg border border-red-300/60 bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-50 shadow shadow-red-900/30 transition hover:border-red-200 hover:bg-red-500/30"
            onClick={() => {
              close({ bypassLock: true });
              signOut({ callbackUrl: "/", redirect: true });
            }}
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
        type="button"
        onClick={() => {
          setOpen(true);
          onOpenChange?.(true);
        }}
        className={clsx(
          children
            ? "inline-flex items-center justify-center p-0 border-none bg-transparent hover:border-none hover:bg-transparent"
            : "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10",
          className,
        )}
        aria-label={ariaLabel ?? label}
      >
        {children ?? label}
      </button>
      {mounted && open ? createPortal(modal, document.body) : null}
    </>
  );
}
