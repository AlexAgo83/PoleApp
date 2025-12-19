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
  { label: "Admin", email: "admin@poleapp.test" },
  { label: "Teacher", email: "teacher@poleapp.test" },
  { label: "Student", email: "student1@poleapp.test" },
  { label: "Student premium", email: "student2@poleapp.test" },
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
      <section className="panel w-full max-w-xl max-h-[90vh] overflow-auto p-8 md:p-10">
        <p className="text-sm uppercase tracking-[0.14em] text-cyan-200">
          Pole App
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-white">
          Connexion
        </h1>
        <p className="mt-2 text-slate-300">
          Utilisez les comptes seed pour tester les rôles et l’accès protégé.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-200">
          {presets.map((preset) => (
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
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
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
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
            />
          </div>
          {error && (
            <p className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
              {error}
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
            className="w-full rounded-xl bg-cyan-500 px-4 py-3 text-center text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
          <Link
            href="/"
            role="button"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            ← Retour accueil
          </Link>
        </form>

        <div className="mt-6 space-y-3 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-white">Pas encore de compte ?</p>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] uppercase tracking-[0.14em] text-cyan-200">
              Démo
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {["Élève", "Professeur", "Admin école"].map((label) => (
              <button
                key={label}
                type="button"
                aria-disabled
                className="cursor-not-allowed rounded-full border border-dashed border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200"
                title="Ouverture de compte à venir"
              >
                Créer un compte {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-300">
            Freemium : accès de base (positions vues, modules ouverts). Premium : base complète
            des positions + explications et mini-jeu renforcé. Les CTA de création seront activés
            quand l&apos;onboarding sera branché.
          </p>
        </div>
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
