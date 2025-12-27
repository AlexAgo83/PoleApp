import { getServerSession } from "next-auth";
import Link from "next/link";

import { SignOutButton } from "@/components/auth/SignOutButton";
import { CircularRedFox } from "@/components/FoxVignette";
import { authOptions } from "@/lib/auth";
import { defaultHomeForRole } from "@/lib/rbac";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-2 py-6 md:px-8 md:py-10">
      <header className="panel relative overflow-visible p-6 text-sm text-slate-200">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-transparent to-cyan-400/10" />
        <div className="absolute left-4 top-1/2 z-10 -translate-y-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2">
          <CircularRedFox sizeClass="h-20 w-20 md:h-28 md:w-28" href="/" />
        </div>
        <div className="relative flex flex-col gap-3 pl-24 md:flex-row md:items-center md:justify-between md:pl-0 md:pt-6">
          <div>
            <h1 className="text-2xl font-semibold text-white">
              {session?.user?.role === "SCHOOL_ADMIN"
                ? "Dashboard admin"
                : session?.user?.role === "TEACHER"
                ? "Espace prof"
                : "Espace élève"}
            </h1>
            <p className="text-sm text-slate-300">
              {session?.user?.role === "SCHOOL_ADMIN" &&
                "Stats école, gestion utilisateurs et accès cours/positions."}
              {session?.user?.role === "TEACHER" &&
                "Accès élèves de l’école, cours et progression."}
              {session?.user?.role === "STUDENT" &&
                "Progression, blessures, cours et mini-jeu."}
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 text-sm text-slate-200 md:items-end md:text-right">
            <div className="flex w-full flex-wrap items-center gap-2 md:justify-end">
              {session?.user ? (
                <>
                  <Link
                    href={defaultHomeForRole(session?.user?.role)}
                    role="button"
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
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
                  className="rounded-full bg-cyan-500 px-4 py-2 font-semibold text-white transition hover:bg-cyan-400"
                >
                  Se connecter
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>
      {children}
    </main>
  );
}
