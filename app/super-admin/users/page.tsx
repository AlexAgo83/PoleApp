import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { promoteSuperAdminAction, resetUserPasswordAction } from "../actions";
import { ResetCopyButton } from "../ResetCopyButton";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function SuperAdminUsersPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/access-denied");
  }

  const resolvedParams = (await (searchParams ?? Promise.resolve({}))) ?? {};
  const getValue = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value);
  const flash = getValue(resolvedParams.flash);
  const flashTemp = getValue(resolvedParams.temp);
  const flashEmail = getValue(resolvedParams.email);

  return (
    <main className="grid gap-4 md:gap-6">
      {flash === "reset-ok" && (
        <div className="rounded-xl border border-emerald-300/60 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-50 shadow-lg shadow-emerald-900/30">
          <p className="flex flex-wrap items-center gap-2">
            <span>Mot de passe réinitialisé pour {flashEmail ?? "l&apos;utilisateur"}.</span>
            <span className="rounded-lg bg-white/10 px-2 py-1 font-mono text-xs font-semibold text-white">
              {flashTemp}
            </span>
            <ResetCopyButton value={flashTemp ?? ""} />
            <a
              href={
                flashEmail
                  ? `mailto:${flashEmail}?subject=Mot de passe temporaire&body=Voici ton mot de passe temporaire : ${flashTemp}%0AChange-le dès ta connexion.`
                  : undefined
              }
              className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2 py-1 text-[11px] font-semibold text-white transition hover:border-cyan-300/70 hover:bg-cyan-500/20"
            >
              Envoyer par mail
            </a>
          </p>
          <p className="mt-1 text-xs text-emerald-100/80">Partage en privé. Audit log enregistré.</p>
        </div>
      )}
      {flash === "reset-not-found" && (
        <div className="rounded-xl border border-amber-300/60 bg-amber-500/15 px-4 py-3 text-sm text-amber-50 shadow-lg shadow-amber-900/30">
          Utilisateur introuvable pour cette adresse.
        </div>
      )}
      {flash === "reset-invalid" && (
        <div className="rounded-xl border border-amber-300/60 bg-amber-500/15 px-4 py-3 text-sm text-amber-50 shadow-lg shadow-amber-900/30">
          Formulaire de réinitialisation invalide.
        </div>
      )}

      <section className="panel space-y-4 border-red-300/20 p-5 shadow-red-900/30">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-indigo-200">Super Admin</p>
          <h3 className="text-lg font-semibold text-white">Promotion / Dégradation</h3>
        </div>
        <p className="text-sm text-slate-300">
          Promouvoir ou retirer le rôle SUPER_ADMIN via email (sécurité recovery). Audit log automatique.
        </p>
        <form action={promoteSuperAdminAction} className="grid gap-2 md:grid-cols-[2fr_1fr_1fr]">
          <input type="hidden" name="redirectTo" value="/super-admin/users" />
          <label className="space-y-1">
            <span className="text-xs text-slate-300">Email</span>
            <input
              name="email"
              type="email"
              placeholder="user@poleapp.test"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-white"
              required
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-slate-300">Action</span>
            <select
              name="action"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-white"
              defaultValue="promote"
            >
              <option value="promote">Promouvoir en SUPER_ADMIN</option>
              <option value="demote">Retirer (SCHOOL_ADMIN ou STUDENT)</option>
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-red-400/60 bg-red-500/20 px-3 py-2 text-sm font-semibold text-white transition hover:border-red-300/70 hover:bg-red-500/30"
            >
              Valider
            </button>
          </div>
        </form>
      </section>

      <section className="panel space-y-4 border-indigo-300/25 p-5 shadow-indigo-900/30">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-indigo-200">Sécurité</p>
          <h3 className="text-lg font-semibold text-white">Réinitialiser un mot de passe</h3>
        </div>
        <p className="text-sm text-slate-300">
          Génère un mot de passe temporaire et l’applique à l’utilisateur. Partage-le en privé. Audit log automatique.
        </p>
        <form action={resetUserPasswordAction} className="grid gap-2 md:grid-cols-[2fr_1fr]">
          <input type="hidden" name="redirectTo" value="/super-admin/users" />
          <label className="space-y-1">
            <span className="text-xs text-slate-300">Email</span>
            <input
              name="email"
              type="email"
              placeholder="user@poleapp.test"
              required
              className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-white"
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-indigo-400/60 bg-indigo-500/20 px-3 py-2 text-sm font-semibold text-white transition hover:border-indigo-300/70 hover:bg-indigo-500/30"
            >
              Réinitialiser
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
