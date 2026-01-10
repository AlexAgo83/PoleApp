import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { InvoiceStatus } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { appSignature } from "@/lib/appMeta";

type StatPillProps = { label: string; value: string | number };
type Shortcut = { label: string; href: string; backgroundUrl?: string | null };
type Panel = {
  id: string;
  title: string;
  description: string;
  stats: StatPillProps[];
  shortcuts: Shortcut[];
};

type RoleCounts = {
  total: number;
  premium: number;
  STUDENT: number;
  TEACHER: number;
  SCHOOL_ADMIN: number;
  SUPER_ADMIN: number;
};

export const dynamic = "force-dynamic";

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

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SCHOOL_ADMIN") {
    redirect("/access-denied");
  }

  if (!session.user.schoolId) {
    return (
      <main className="flex min-h-screen w-full flex-col gap-4">
        <section className="panel p-4 md:p-6">
          <h1 className="text-3xl font-semibold text-white">Admin école</h1>
          <p className="text-slate-300">Aucune école associée à ce compte.</p>
        </section>
        <div className="pb-4 text-center text-xs text-slate-300/80">{appSignature}</div>
      </main>
    );
  }

  let schoolWebsite: string | null = null;
  try {
    const withWebsite = await prisma.school.findUnique({
      where: { id: session.user.schoolId },
      select: { website: true },
    });
    schoolWebsite = withWebsite?.website ?? null;
  } catch {
    // Column may not exist yet in the DB; ignore.
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const endOfWeek = new Date(startOfToday);
  endOfWeek.setDate(endOfWeek.getDate() + 7);
  endOfWeek.setHours(23, 59, 59, 999);
  const startOfLast7Days = new Date(startOfToday);
  startOfLast7Days.setDate(startOfLast7Days.getDate() - 7);
  const startOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);

  const [
    users,
    positionsCount,
    coursesTodayCount,
    coursesWeekCount,
    activeInjuries,
    studiosCount,
    partnersCount,
    disciplinesCount,
    combosCount,
    newStudentsWeek,
    newStudentsMonth,
    paidInvoicesCount,
    pendingInvoicesCount,
    paidInvoicesTotalCents,
  ] = await Promise.all([
    prisma.user.findMany({
      where: { schoolId: session.user.schoolId },
      select: { role: true, isPremium: true, createdAt: true },
    }),
    prisma.position.count(),
    prisma.course.count({
      where: {
        schoolId: session.user.schoolId,
        date: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
    }),
    prisma.course.count({
      where: {
        schoolId: session.user.schoolId,
        date: {
          gte: startOfLast7Days,
          lte: endOfToday,
        },
      },
    }),
    prisma.studentInjury.count({
      where: { isActive: true, student: { schoolId: session.user.schoolId } },
    }),
    prisma.studio.count({ where: { schoolId: session.user.schoolId } }),
    prisma.partner.count({ where: { schoolId: session.user.schoolId } }),
    prisma.discipline.count(),
    prisma.preset.count({ where: { schoolId: session.user.schoolId } }),
    prisma.user.count({
      where: {
        schoolId: session.user.schoolId,
        role: "STUDENT",
        createdAt: { gte: startOfLast7Days, lte: endOfToday },
      },
    }),
    prisma.user.count({
      where: {
        schoolId: session.user.schoolId,
        role: "STUDENT",
        createdAt: { gte: startOfMonth },
      },
    }),
    prisma.invoice.count({
      where: {
        course: { schoolId: session.user.schoolId },
        status: InvoiceStatus.PAID,
      },
    }),
    prisma.invoice.count({
      where: {
        course: { schoolId: session.user.schoolId },
        status: { in: [InvoiceStatus.GENERATED, InvoiceStatus.SENT, InvoiceStatus.LATE] },
      },
    }),
    prisma.invoice.aggregate({
      where: {
        course: { schoolId: session.user.schoolId },
        status: InvoiceStatus.PAID,
      },
      _sum: { amountCents: true },
    }),
  ]);

  const counts = users.reduce(
    (acc, user) => {
      acc.total += 1;
      acc[user.role] += 1;
      if (user.isPremium) acc.premium += 1;
      return acc;
    },
    { total: 0, STUDENT: 0, TEACHER: 0, SCHOOL_ADMIN: 0, SUPER_ADMIN: 0, premium: 0 } as RoleCounts
  ) satisfies RoleCounts;

  const premiumRate = counts.total ? `${Math.round((counts.premium / counts.total) * 100)}%` : "0%";
  const paidInvoicesTotalEuros = `${(
    (paidInvoicesTotalCents?._sum.amountCents ?? 0) /
    100
  ).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;

  const panels: Panel[] = [
    {
      id: "pilotage",
      title: "Pilotage école",
      description: "Identité, rôles et comptes de ton école.",
      stats: [
        { label: "Utilisateurs", value: counts.total },
        { label: "Premium", value: counts.premium },
        { label: "Profs", value: counts.TEACHER },
        { label: "Admins", value: counts.SCHOOL_ADMIN },
        { label: "Élèves", value: counts.STUDENT },
      ],
      shortcuts: [
        { label: "Fiche école", href: "/admin/school" },
        { label: "Profs", href: "/admin/teachers" },
        { label: "Utilisateurs", href: "/admin/users" },
      ],
    },
    {
      id: "catalogue",
      title: "Catalogue & studios",
      description: "Positions, combos, disciplines et lieux.",
      stats: [
        { label: "Positions", value: positionsCount },
        { label: "Combos", value: combosCount },
        { label: "Disciplines", value: disciplinesCount },
        { label: "Studios", value: studiosCount },
        { label: "Partenaires", value: partnersCount },
      ],
      shortcuts: [
        { label: "Positions", href: "/positions" },
        { label: "Presets / combos", href: "/presets" },
        { label: "Studios", href: "/admin/studios" },
        { label: "Partenaires", href: "/admin/partners" },
      ],
    },
    {
      id: "activite",
      title: "Activité & élèves",
      description: "Cours, inscriptions et santé des élèves.",
      stats: [
        { label: "Cours (auj.)", value: coursesTodayCount },
        { label: "Cours (7j)", value: coursesWeekCount },
        { label: "Inscrits (7j)", value: newStudentsWeek },
        { label: "Inscrits (mois)", value: newStudentsMonth },
        { label: "Blessures", value: activeInjuries },
      ],
      shortcuts: [
        { label: "Planning cours", href: "/teacher/courses/agenda?view=month" },
        { label: "Élèves", href: "/teacher/students" },
        { label: "Jeux révision", href: "/student/game" },
      ],
    },
    {
      id: "finance",
      title: "Finance & contrôle",
      description: "Facturation, achats et journal de contrôle.",
      stats: [
        { label: "Premium %", value: premiumRate },
        { label: "Admins", value: counts.SCHOOL_ADMIN },
        { label: "Payées", value: paidInvoicesCount },
        { label: "En attente", value: pendingInvoicesCount },
        { label: "Payé", value: paidInvoicesTotalEuros },
      ],
      shortcuts: [
        { label: "Facturation", href: "/admin/billing" },
        { label: "Achats (packs/abos)", href: "/admin/purchases" },
        { label: "Journal d’audit", href: "/admin/audit" },
      ],
    },
  ];

  return (
    <main className="flex min-h-screen w-full flex-col gap-4">
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
      </section>

      <div className="pb-4 text-center text-xs text-slate-300/80">{appSignature}</div>
    </main>
  );
}
