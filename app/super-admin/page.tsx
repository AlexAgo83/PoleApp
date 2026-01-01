import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { backfillDisciplinesAction, forceDisciplinePoleAction, updateSettingsAction } from "./actions";
import { PersistedPanel } from "@/components/PersistedPanel";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SuperAdminPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
} = {}) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/access-denied");
  }
  const resolvedParams = (await searchParams) ?? {};
  const getValue = (value?: string | string[]) =>
    Array.isArray(value) ? value[0] : value;
  const flash = getValue(resolvedParams.flash);
  const flashError = getValue(resolvedParams.error);
  const flashForceOk = flash === "force-ok";
  const flashForceInvalid = flash === "force-invalid";

  const [settings, schools, audits] = await Promise.all([
    prisma.globalSetting.upsert({
      where: { id: "global" },
      update: {},
      create: {
        id: "global",
        defaultVatPercent: 20,
        currency: "EUR",
        timezone: process.env.GLOBAL_TIMEZONE || "Europe/Paris",
        icsDefaultAlarmMinutes: 30,
      },
    }),
    prisma.school.findMany({
      orderBy: { name: "asc" },
      include: {
        users: {
          where: { role: "SCHOOL_ADMIN" },
          select: { id: true, name: true, email: true },
        },
      },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { actor: { select: { email: true } } },
    }),
  ]);

  const activeSchools = schools.filter((s) => !s.archivedAt).length;

  const modules = [
    {
      title: "Abonnements",
      href: "/super-admin/subscriptions",
      cta: "Gérer les abonnements",
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M4 7h16M4 12h16M4 17h10" />
          <circle cx="8" cy="7" r="1" />
          <circle cx="8" cy="12" r="1" />
          <circle cx="14" cy="17" r="1" />
        </svg>
      ),
    },
    {
      title: "Packs crédits",
      href: "/super-admin/packs",
      cta: "Gérer les packs",
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="4" y="6" width="16" height="12" rx="2" />
          <path d="M4 10h16M9 14h6" />
        </svg>
      ),
    },
    {
      title: "Utilisateurs",
      href: "/super-admin/users",
      cta: "Promotions / resets",
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="8" r="3" />
          <path d="M5 20v-1.5A4.5 4.5 0 019.5 14H12" />
          <path d="M17 11h3m-1.5-1.5v3" />
        </svg>
      ),
    },
    {
      title: "Écoles",
      href: "/super-admin/schools",
      cta: "Gestion écoles",
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M12 3l9 5-9 5-9-5 9-5z" />
          <path d="M4 10v7a1 1 0 001 1h14a1 1 0 001-1v-7" />
          <path d="M12 18v-5" />
        </svg>
      ),
    },
    {
      title: "Préférences",
      href: "/super-admin/preferences",
      cta: "TVA & devise",
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 01-.33 1.82l-.05.05a2 2 0 00-.25 2.45l.02.03a1.65 1.65 0 01-1.51 2.5 1.65 1.65 0 01-1.51-1l-.02-.05a2 2 0 00-2.3-1.23h-.12a2 2 0 00-2.3 1.23l-.02.05a1.65 1.65 0 01-1.51 1 1.65 1.65 0 01-1.51-2.5l.02-.03a2 2 0 00-.25-2.45l-.05-.05A1.65 1.65 0 014.6 15a1.65 1.65 0 011-1.51l.05-.02a2 2 0 001.23-2.3v-.12a2 2 0 00-1.23-2.3l-.05-.02A1.65 1.65 0 014.6 5a1.65 1.65 0 012.5-1.51l.03.02a2 2 0 002.45-.25l.05-.05a1.65 1.65 0 011.82-.33h.02a1.65 1.65 0 011.01 1.51l-.02.05a2 2 0 001.23 2.3h.12a2 2 0 002.3-1.23l.02-.05A1.65 1.65 0 0120.9 5a1.65 1.65 0 01-1 1.51l-.05.02a2 2 0 00-1.23 2.3v.12a2 2 0 001.23 2.3l.05.02a1.65 1.65 0 011 1.5z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid gap-4 md:gap-6">
      {flash?.startsWith("invalid-") && (
        <div className="rounded-xl border border-amber-300/60 bg-amber-500/15 px-4 py-3 text-sm font-semibold text-amber-50 shadow-lg shadow-amber-900/30">
          {flash === "invalid-offer"
            ? "Offre abonnement invalide : vérifie le nom et les montants."
            : "Pack de crédits invalide : vérifie le nom et les montants."}
          {flashError && (
            <span className="ml-2 font-normal text-amber-100/80">({flashError})</span>
          )}
        </div>
      )}
      {flashForceOk && (
        <div className="rounded-xl border border-emerald-300/60 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-50 shadow-lg shadow-emerald-900/30">
          Discipline forcée appliquée.
        </div>
      )}
      {flashForceInvalid && (
        <div className="rounded-xl border border-amber-300/60 bg-amber-500/15 px-4 py-3 text-sm text-amber-50 shadow-lg shadow-amber-900/30">
          Confirmation manquante ou école invalide.
        </div>
      )}
      <PersistedPanel
        storageKey="superadmin:audit-log"
        title="Audit"
        subtitle="10 dernières actions"
        defaultOpen={false}
        className="panel space-y-3 p-5"
        contentClassName="space-y-2"
      >
        <div id="audit-log" className="space-y-2">
          {audits.length === 0 && <p className="text-sm text-slate-400">Aucune action super-admin enregistrée.</p>}
          {audits.map((log) => (
            <div
              key={log.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200"
            >
              <div>
                <p className="font-semibold text-white">{log.action}</p>
                <p className="text-xs text-slate-400">
                  {log.target ? `Cible: ${log.target} — ` : ""}
                  {log.actor?.email || "N/A"}
                </p>
              </div>
              <p className="text-xs text-slate-400">
                {new Date(log.createdAt).toLocaleString("fr-FR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </p>
            </div>
          ))}
        </div>
      </PersistedPanel>

      <section className="panel space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Modules</h2>
          <p className="text-xs text-slate-300">Accès rapide aux espaces super-admin.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {modules.map((mod) => (
            <ActionCard key={mod.href} title={mod.title} href={mod.href} cta={mod.cta} icon={mod.icon} />
          ))}
        </div>
      </section>
    </div>
  );
}

function ActionCard({
  title,
  href,
  cta,
  icon,
}: {
  title: string;
  href: string;
  cta: string;
  icon?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/60 hover:bg-white/10"
    >
      <div className="flex items-center gap-3">
        {icon ? (
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-white/10 bg-white/5">
            {icon}
          </span>
        ) : null}
        <div className="flex-1">
          <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">{cta}</p>
          <p className="text-lg font-semibold text-white">{title}</p>
        </div>
      </div>
    </Link>
  );
}
