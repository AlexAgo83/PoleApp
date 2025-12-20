import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { SessionNavBar } from "@/components/SessionNavBar";
import { authOptions } from "@/lib/auth";

import { NewPositionForm } from "./NewPositionForm";

export default async function NewPositionPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!role || (role !== "TEACHER" && role !== "SCHOOL_ADMIN")) {
    redirect("/access-denied");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-6 py-12">
      <SessionNavBar session={session} />
      <header className="panel flex flex-wrap items-start justify-between gap-3 p-8">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">
            Professeur / Admin
          </p>
          <h1 className="text-3xl font-semibold text-white">Créer une position</h1>
          <p className="text-slate-300">
            Formulaire léger pour alimenter la base. Les médias supplémentaires et
            l’édition seront ajoutés plus tard.
          </p>
        </div>
        <div className="flex w-full justify-end">
          <Link
            href="/positions"
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            ← Retour positions
          </Link>
        </div>
      </header>

      <section className="panel p-8">
        <NewPositionForm />
      </section>
    </main>
  );
}
