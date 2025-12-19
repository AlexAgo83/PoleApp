import { getServerSession } from "next-auth";
import Link from "next/link";

import { SignOutButton } from "@/components/auth/SignOutButton";
import { authOptions } from "@/lib/auth";
import { defaultHomeForRole } from "@/lib/rbac";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="panel flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
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
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-200">
          {session?.user && (
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2">
              {session.user.email} · {session.user.role}
            </div>
          )}
          <Link
            href={defaultHomeForRole(session?.user?.role)}
            role="button"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            Mon espace
          </Link>
          <Link
            href="/"
            role="button"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            Accueil
          </Link>
          <SignOutButton />
        </div>
      </header>
      {children}
    </main>
  );
}
