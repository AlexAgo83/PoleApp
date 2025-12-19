import Link from "next/link";

export default function AccessDeniedPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-16">
      <div className="panel p-8">
        <h1 className="text-3xl font-semibold text-white">Accès refusé</h1>
        <p className="mt-3 text-slate-300">
          Vous n’avez pas les droits suffisants pour cette section.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            Retourner à l’accueil
          </Link>
          <Link
            href="/login"
            className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-400"
          >
            Revenir au login
          </Link>
        </div>
      </div>
    </main>
  );
}
