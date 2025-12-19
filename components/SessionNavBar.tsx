import Link from "next/link";
import { getServerSession, type Session } from "next-auth";

import { authOptions } from "@/lib/auth";
import { defaultHomeForRole } from "@/lib/rbac";
import { SignOutButton } from "./auth/SignOutButton";

type Props = {
  session?: Session | null;
  className?: string;
};

export async function SessionNavBar({ session, className }: Props) {
  const currentSession = session ?? (await getServerSession(authOptions));
  const homeForRole = defaultHomeForRole(currentSession?.user?.role);

  return (
    <section
      className={`panel flex flex-col gap-3 p-4 text-sm text-slate-200 md:flex-row md:items-center md:justify-between ${className ?? ""}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        {currentSession?.user ? (
          <>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.14em] text-cyan-200">
              Session
              <span className="text-white text-[11px] normal-case tracking-normal">
                {currentSession.user.email}
              </span>
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.14em] text-cyan-200">
              Rôle : {currentSession.user.role}
            </span>
          </>
        ) : (
          <span className="text-xs uppercase tracking-[0.18em] text-cyan-200">
            Pole App — MVP v0.2.1
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        <Link
          href="/"
          role="button"
          className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
        >
          <span aria-hidden="true" className="mr-1">
            🏠
          </span>
          Accueil
        </Link>
        {currentSession?.user ? (
          <>
            <Link
              href={homeForRole}
              role="button"
              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
            >
              Mon espace
            </Link>
            <SignOutButton />
          </>
        ) : (
          <Link
            href="/login"
            role="button"
            className="rounded-full bg-cyan-500 px-4 py-2 font-semibold text-slate-900 transition hover:bg-cyan-400"
          >
            Se connecter
          </Link>
        )}
      </div>
    </section>
  );
}
