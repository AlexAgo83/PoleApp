"use client";

import { signIn, getSession, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

import { defaultHomeForRole } from "@/lib/rbac";
import { Role } from "@prisma/client";

type PresetUser = {
  label: string;
  email: string;
};

const presets: PresetUser[] = [
  { label: "Student", email: "student1@poleapp.test" },
  { label: "Student premium", email: "student2@poleapp.test" },
  { label: "Teacher", email: "teacher@poleapp.test" },
  { label: "Admin (École)", email: "admin@poleapp.test" },
  { label: "Super Admin (App)", email: "superadmin@poleapp.test" },
];

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/app";
  const signupSuccess = searchParams.get("signup") === "success";
  const { data: session, status } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const resolveTarget = useCallback(
    (role?: Role | null) => {
      if (callbackUrl) {
        try {
          if (callbackUrl.startsWith("/")) return callbackUrl;
          const url = new URL(callbackUrl);
          if (url.origin === window.location.origin) {
            return `${url.pathname}${url.search}${url.hash}`;
          }
        } catch {
          // ignore malformed callbackUrl
        }
      }
      return defaultHomeForRole(role);
    },
    [callbackUrl]
  );

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role) {
      router.replace(resolveTarget(session.user.role));
    }
  }, [status, session, router, callbackUrl, resolveTarget]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    if (result?.error) {
      setError("Email ou mot de passe incorrect.");
      setLoading(false);
      return;
    }

    const updatedSession = await getSession();
    const role = updatedSession?.user?.role;
    router.replace(resolveTarget(role));
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 py-12">
      <section className="panel w-full max-w-xl max-h-[90vh] overflow-auto border-indigo-400/25 p-8 shadow-indigo-900/30 md:p-10">
        <p className="text-sm uppercase tracking-[0.14em] text-indigo-100">
          Pole App
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-white">
          Connexion
        </h1>
        <p className="mt-2 text-slate-300">
          Utilisez les comptes seed pour tester les rôles et l’accès protégé.
        </p>
        <div className="mt-4 space-y-2 text-sm text-slate-200">
          <div className="flex flex-wrap gap-2">
            {presets.slice(0, 3).map((preset) => (
              <button
                key={preset.email}
                onClick={() => setEmail(preset.email)}
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1 transition hover:border-cyan-400/70 hover:bg-white/10"
                type="button"
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {presets.slice(3).map((preset) => (
              <button
                key={preset.email}
                onClick={() => setEmail(preset.email)}
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1 transition hover:border-cyan-400/70 hover:bg-white/10"
                type="button"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="text-sm text-slate-200" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-indigo-400"
          />
          </div>
          <div>
            <label className="text-sm text-slate-200" htmlFor="password">
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-indigo-400"
          />
          </div>
          {error && (
            <p className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
              {error}
            </p>
          )}
          {resetMessage && (
            <p className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
              {resetMessage}
            </p>
          )}
          {signupSuccess && (
            <p className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
              Compte créé. Tu peux te connecter avec tes identifiants.
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
          <button
            type="button"
            onClick={async () => {
              setResetMessage(null);
              setError(null);
              try {
                await fetch("/api/auth/reset", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email }),
                });
                setResetMessage(
                  "Si un compte existe pour cet email, un mot de passe temporaire vient d'être envoyé."
                );
              } catch {
                setResetMessage("Si un compte existe pour cet email, un mot de passe temporaire vient d'être envoyé.");
              }
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            Mot de passe oublié ? Envoyer un mot de passe temporaire
          </button>
          <Link
            href="/"
            role="button"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            ← Retour accueil
          </Link>
        </form>

        <details className="mt-6 space-y-3 rounded-xl border border-indigo-400/25 bg-white/5 p-4 text-sm text-slate-200">
          <summary className="flex cursor-pointer items-center justify-between text-base font-semibold text-white">
            Pas encore de compte ?
            <span className="text-sm text-slate-300">▼</span>
          </summary>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-full border border-cyan-400/60 bg-cyan-500/20 px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-500/30"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/80 text-[10px] font-bold text-slate-950">
                E
              </span>
              Créer un compte Élève
            </Link>
            {[
              { label: "Professeur", code: "P" },
              { label: "Admin école", code: "A" },
            ].map(({ label, code }) => (
              <button
                key={label}
                type="button"
                aria-disabled
                className="inline-flex items-center gap-2 cursor-not-allowed rounded-full border border-dashed border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-white/25"
                title="Création réservée à l’école (bientôt ouverte)"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white/80">
                  {code}
                </span>
                Créer un compte {label}
              </button>
            ))}
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-200">
            <div className="flex items-center justify-between font-semibold text-white">
              <span>Freemium vs Premium</span>
              <span className="text-[11px] text-slate-300">▲</span>
            </div>
            <div className="mt-2 space-y-2">
              <p>
                Freemium : accès de base (positions vues, modules ouverts).
                Premium : base complète des positions + explications et mini-jeu renforcé.
              </p>
              <p>
                Aujourd’hui, la création en self-serve est ouverte pour les élèves. Les comptes
                Prof/Admin sont encore provisionnés par l’école.
              </p>
            </div>
          </div>
        </details>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-6 py-16">
          <div className="panel w-full max-w-md p-6 text-center text-slate-200">
            Chargement du formulaire…
          </div>
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
