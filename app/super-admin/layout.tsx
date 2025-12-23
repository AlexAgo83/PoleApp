import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/auth/SignOutButton";
import { authOptions } from "@/lib/auth";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/access-denied");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 px-2 py-6 md:px-8 md:py-10">
      <header className="panel flex flex-col gap-4 border-cyan-300/30 p-6 shadow-cyan-900/40 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.16em] text-cyan-200">Super Admin</p>
          <h1 className="text-3xl font-semibold text-white">Backoffice global</h1>
          <p className="text-sm text-slate-300">
            Gestion des écoles, admins, offres globaux (abonnements/packs) et paramètres TVA/devise.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
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
