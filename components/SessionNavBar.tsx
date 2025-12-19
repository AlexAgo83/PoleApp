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
      style={{
        borderColor: "rgba(124,58,237,0.3)",
        boxShadow: "0 16px 40px rgba(124,58,237,0.15), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      <div className="flex flex-wrap items-center gap-2" />
      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        {currentSession?.user ? (
            <>
              <Link
                href={homeForRole}
                role="button"
                className="inline-flex items-center gap-2 rounded-full border border-indigo-400/60 bg-indigo-500/20 px-3 py-2 text-white transition hover:border-indigo-300 hover:bg-indigo-500/30"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/house.svg" alt="" className="h-4 w-4" />
                Mon espace
              </Link>
              <SignOutButton />
            </>
        ) : (
          <Link
            href="/login"
            role="button"
            className="rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 px-4 py-2 font-semibold text-slate-900 shadow-lg transition hover:brightness-110"
          >
            Se connecter
          </Link>
        )}
      </div>
    </section>
  );
}
