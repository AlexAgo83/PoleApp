"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/", redirect: true })}
      className="rounded-full border border-white/15 bg-purple-500/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-purple-300/70 hover:bg-purple-500/30"
    >
      Se déconnecter
    </button>
  );
}
