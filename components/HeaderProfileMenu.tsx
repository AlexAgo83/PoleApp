"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

import { SignOutModalButton } from "@/components/auth/SignOutModalButton";

type Props = {
  avatarSrc: string | null;
  name: string;
  roleLabel: string;
  profileHref: string;
};

export function HeaderProfileMenu({ avatarSrc, name, roleLabel, profileHref }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1 transition hover:border-cyan-300/70 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarSrc ?? ""}
          alt="Profil"
          className="h-10 w-10 rounded-full border border-white/20 object-cover"
        />
        <div className="leading-tight text-left">
          <p className="text-sm font-semibold text-white">{name}</p>
          <p className="text-xs text-slate-200">{roleLabel}</p>
        </div>
      </button>

      <div
        className={clsx(
          "absolute right-0 mt-2 w-48 rounded-xl border border-white/10 bg-slate-900/90 p-2 shadow-xl shadow-black/30 backdrop-blur",
          open ? "block" : "hidden"
        )}
      >
        <Link
          href={profileHref}
          className="flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          onClick={() => setOpen(false)}
        >
          Mon Profil
        </Link>
        <SignOutModalButton
          className="mt-1 flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          ariaLabel="Se déconnecter"
          onOpenChange={() => setOpen(false)}
        >
          Déconnexion
        </SignOutModalButton>
      </div>
    </div>
  );
}
