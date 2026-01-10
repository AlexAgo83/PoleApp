import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { PersistedPanel } from "@/components/PersistedPanel";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type StatPillProps = { label: string; value: string | number };
type Shortcut = { label: string; href: string; backgroundUrl?: string | null };
type Panel = {
  id: string;
  title: string;
  description: string;
  stats: StatPillProps[];
  shortcuts: Shortcut[];
};

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

function StatPill({ label, value }: StatPillProps) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-200">
      <span className="uppercase tracking-[0.14em] text-cyan-200">{label}</span>
      <span className="rounded-md bg-white/10 px-1.5 py-[2px] text-[10px] font-semibold text-white">{value}</span>
    </div>
  );
}

function PanelHero({ title, description }: { title: string; description: string }) {
  const heroBg =
    "linear-gradient(135deg, rgba(22,36,66,0.68), rgba(16,26,52,0.62)), radial-gradient(circle at 12% 20%, rgba(56,189,248,0.25), transparent 42%), radial-gradient(circle at 82% -8%, rgba(236,72,153,0.22), transparent 38%)";
  return (
    <div
      className="relative -mx-[var(--panel-px)] -mt-[var(--panel-py)] overflow-hidden rounded-t-2xl border-b border-white/10 bg-[#0f1a32] px-4 py-5 shadow-inner shadow-black/20 sm:px-6"
      style={{ backgroundImage: heroBg, backgroundSize: "cover", backgroundPosition: "center" }}
    >
      <div className="relative flex flex-col gap-2">
        <h2 className="text-xl font-semibold text-white sm:text-2xl">{title}</h2>
        <p className="text-sm text-slate-200/90">{description}</p>
      </div>
    </div>
  );
}

export default async function SuperAdminPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/access-denied");
  }
  const resolvedParams = (await (searchParams ?? Promise.resolve({}))) as Record<
    string,
    string | string[] | undefined
  >;
  const getValue = (value?: string | string[]) =>
    Array.isArray(value) ? value[0] : value;
  const flash = getValue(resolvedParams.flash);
  const flashError = getValue(resolvedParams.error);
  const flashForceOk = flash === "force-ok";
  const flashForceInvalid = flash === "force-invalid";

  const [
    schoolsCount,
    usersCount,
    premiumCount,
    teachersCount,
    studentsCount,
    creditPacksActiveCount,
    subscriptionOffersActiveCount,
    positionsCount,
    presetsCount,
    studiosCount,
    partnersCount,
    audits,
  ] = await Promise.all([
    prisma.school.count(),
    prisma.user.count(),
    prisma.user.count({ where: { isPremium: true } }),
    prisma.user.count({ where: { role: "TEACHER" } }),
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.creditPackOffer.count({ where: { isActive: true, isOpen: true } }),
    prisma.subscriptionOffer.count({ where: { isActive: true, isOpen: true } }),
    prisma.position.count(),
    prisma.preset.count(),
    prisma.studio.count(),
    prisma.partner.count(),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { actor: { select: { email: true } } },
    }),
  ]);

  const premiumRate = usersCount ? `${Math.round((premiumCount / usersCount) * 100)}%` : "0%";

  const panels: Panel[] = [
    {
      id: "pilotage",
      title: "Pilotage global",
      description: "Rôles, écoles et utilisateurs.",
      stats: [
        { label: "Écoles", value: schoolsCount },
        { label: "Utilisateurs", value: usersCount },
        { label: "Premium", value: premiumCount },
        { label: "Profs", value: teachersCount },
        { label: "Élèves", value: studentsCount },
      ],
      shortcuts: [
        { label: "Écoles", href: "/super-admin/schools" },
        { label: "Utilisateurs", href: "/super-admin/users" },
        { label: "Préférences (TVA/devise)", href: "/super-admin/preferences" },
      ],
    },
    {
      id: "offres",
      title: "Offres & revenus",
      description: "Packs crédits, abonnements et presets.",
      stats: [
        { label: "Packs actifs", value: creditPacksActiveCount },
        { label: "Abos actifs", value: subscriptionOffersActiveCount },
        { label: "Presets", value: presetsCount },
        { label: "Premium %", value: premiumRate },
      ],
      shortcuts: [
        { label: "Packs crédits", href: "/super-admin/packs" },
        { label: "Abonnements", href: "/super-admin/subscriptions" },
      ],
    },
    {
      id: "catalogue",
      title: "Catalogue & conformité",
      description: "Positions, studios et contrôle médias.",
      stats: [
        { label: "Positions", value: positionsCount },
        { label: "Studios", value: studiosCount },
        { label: "Partenaires", value: partnersCount },
      ],
      shortcuts: [
        { label: "Audit médias", href: "/super-admin/media-audit" },
        { label: "Docs internes", href: "/logics" },
      ],
    },
  ];

  return (
    <main className="flex min-h-screen w-full flex-col gap-4">
      <div className="grid gap-3 md:gap-4">
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
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        {panels.map((panel) => (
          <article key={panel.id} className="panel border border-white/5">
            <div className="panel-body gap-4">
              <PanelHero title={panel.title} description={panel.description} />
              <div className="flex flex-wrap gap-2">
                {panel.stats.map((stat) => (
                  <StatPill key={`${panel.id}-${stat.label}`} label={stat.label} value={stat.value} />
                ))}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {panel.shortcuts.map((shortcut) => (
                  <Link
                    key={`${panel.id}-${shortcut.label}`}
                    href={shortcut.href}
                    className="group flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
                    style={
                      shortcut.backgroundUrl
                        ? {
                            backgroundImage: `linear-gradient(135deg, rgba(26,35,69,0.55), rgba(88,28,135,0.4)), url(${shortcut.backgroundUrl})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }
                        : undefined
                    }
                  >
                    <span
                      className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]"
                      style={
                        shortcut.backgroundUrl
                          ? { textShadow: "0 0 6px rgba(0,0,0,0.65), 0 1px 2px rgba(0,0,0,0.55)" }
                          : undefined
                      }
                    >
                      {shortcut.label}
                    </span>
                    <span
                      className="text-cyan-100 drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)] transition-transform group-hover:translate-x-1"
                      style={
                        shortcut.backgroundUrl
                          ? { textShadow: "0 0 6px rgba(0,0,0,0.65), 0 1px 2px rgba(0,0,0,0.55)" }
                          : undefined
                      }
                    >
                      →
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </article>
        ))}
        <article className="panel border border-white/5">
          <PersistedPanel
            storageKey="superadmin:audit-log"
            title="Audit"
            subtitle="10 dernières actions"
            defaultOpen={false}
            className="panel-body lg-gap"
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
        </article>
      </section>
    </main>
  );
}
