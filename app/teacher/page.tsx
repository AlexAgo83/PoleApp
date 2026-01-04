import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { InvoiceStatus } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { appSignature } from "@/lib/appMeta";

type StatPillProps = { label: string; value: string | number };
type Shortcut = { label: string; href?: string; backgroundUrl?: string | null };
type Panel = {
  id: string;
  title: string;
  description: string;
  stats: { label: string; value: string | number }[];
  shortcuts: Shortcut[];
};

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

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? process.env.CLOUDINARY_CLOUD_NAME;

export default async function TeacherDashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }
  if (!session.user.schoolId) {
    return (
      <main className="flex min-h-screen w-full flex-col gap-4">
        <section className="panel p-6">
          <h1 className="text-3xl font-semibold text-white">Espace professeur</h1>
          <p className="text-slate-300">Aucune école associée à ce compte.</p>
        </section>
        <div className="pb-4 text-center text-xs text-slate-300/80">{appSignature}</div>
      </main>
    );
  }

  const teacherProfileHref = session?.user?.id ? `/teachers/${session.user.id}` : "/profile";
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const startOfLast7Days = new Date(startOfToday);
  startOfLast7Days.setDate(startOfLast7Days.getDate() - 7);

  // Stats supprimées pour l'instant (API simplifiée)
  const newStudentsWeek = 0;

  const [
    coursesTodayCount,
    coursesWeekCount,
    positionsCount,
    combosCount,
    activeInjuries,
    studentsCount,
    nextCourseRow,
    lastCourseRow,
    paidInvoicesCount,
    pendingInvoicesCount,
    paidInvoicesTotalCents,
  ] = await Promise.all([
    prisma.course.count({
      where: {
        schoolId: session.user.schoolId,
        date: { gte: startOfToday, lte: endOfToday },
      },
    }),
    prisma.course.count({
      where: {
        schoolId: session.user.schoolId,
        date: { gte: startOfLast7Days, lte: endOfToday },
      },
    }),
    prisma.position.count(),
    prisma.preset.count({ where: { schoolId: session.user.schoolId } }),
    prisma.studentInjury.count({
      where: { isActive: true, student: { schoolId: session.user.schoolId } },
    }),
    prisma.user.count({
      where: { schoolId: session.user.schoolId, role: "STUDENT" },
    }),
    prisma.course.findFirst({
      where: { teacherId: session.user.id, date: { gte: new Date() } },
      select: { id: true, title: true, date: true, photoPublicId: true },
      orderBy: { date: "asc" },
    }),
    prisma.course.findFirst({
      where: { teacherId: session.user.id, date: { lt: new Date() } },
      select: { id: true, title: true, date: true, photoPublicId: true },
      orderBy: { date: "desc" },
    }),
    prisma.invoice.count({
      where: {
        course: { teacherId: session.user.id, schoolId: session.user.schoolId },
        status: InvoiceStatus.PAID,
      },
    }),
    prisma.invoice.count({
      where: {
        course: { teacherId: session.user.id, schoolId: session.user.schoolId },
        status: { in: [InvoiceStatus.GENERATED, InvoiceStatus.SENT] },
      },
    }),
    prisma.invoice.aggregate({
      where: {
        course: { teacherId: session.user.id, schoolId: session.user.schoolId },
        status: InvoiceStatus.PAID,
      },
      _sum: { amountCents: true },
    }),
  ]);

  const nextCoursePhoto =
    nextCourseRow?.photoPublicId && CLOUD_NAME
      ? `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,g_auto,f_auto,q_auto,w_800,h_400/${nextCourseRow.photoPublicId}`
      : null;
  const lastCoursePhoto =
    lastCourseRow?.photoPublicId && CLOUD_NAME
      ? `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,g_auto,f_auto,q_auto,w_800,h_400/${lastCourseRow.photoPublicId}`
      : null;
  const nextCourseLabel = nextCourseRow
    ? new Intl.DateTimeFormat("fr-FR", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(nextCourseRow.date))
    : null;

  const agendaShortcuts: Shortcut[] = [
    { label: "Mes cours", href: "/teacher/courses/agenda?view=month" },
    { label: "Créer un cours", href: "/teacher/courses/new" },
  ];
  if (lastCourseRow) {
    agendaShortcuts.push({
      label: "Mon dernier cours",
      href: `/teacher/courses/${lastCourseRow.id}?from=/teacher`,
      backgroundUrl: lastCoursePhoto,
    });
  }
  if (nextCourseRow) {
    agendaShortcuts.push({
      label: "Mon prochain cours",
      href: `/teacher/courses/${nextCourseRow.id}?from=/teacher`,
      backgroundUrl: nextCoursePhoto,
    });
  }

  const panels: Panel[] = [
    {
      id: "agenda",
      title: "Cours & agenda",
      description: "Planifie et pilote tes cours en un coup d’œil.",
      stats: [
        { label: "Aujourd'hui", value: coursesTodayCount },
        { label: "7 jours", value: coursesWeekCount },
        ...(nextCourseLabel ? [{ label: "Prochain", value: nextCourseLabel }] : []),
      ],
      shortcuts: agendaShortcuts,
    },
    {
      id: "positions",
      title: "Positions & combos",
      description: "Gère ton catalogue et tes créations clés.",
      stats: [
        { label: "Positions", value: positionsCount },
        { label: "Combos", value: combosCount },
      ],
      shortcuts: [
        { label: "Catalogue positions", href: "/positions" },
        { label: "Créer une position", href: "/teacher/positions/new" },
        { label: "Combos", href: "/teacher/presets" },
        { label: "Mini-jeux révision", href: "/student/game" },
      ],
    },
    {
      id: "communaute",
      title: "Communauté",
      description: "Studios, partenaires et santé de tes élèves.",
      stats: [
        { label: "Inscriptions (7j)", value: newStudentsWeek },
        { label: "Élèves", value: studentsCount },
        { label: "Blessures", value: activeInjuries },
      ],
      shortcuts: [
        { label: "Mes élèves", href: "/teacher/students" },
        { label: "École & studios", href: "/teacher/school" },
        { label: "Partenaires", href: "/teacher/partners" },
      ],
    },
    {
      id: "compte",
      title: "Compte",
      description: "Facturation, achats et profil professeur.",
      stats: [
        { label: "Payées", value: paidInvoicesCount },
        { label: "En attente", value: pendingInvoicesCount },
        { label: "Perçu", value: `${((paidInvoicesTotalCents._sum.amountCents ?? 0) / 100).toFixed(2)} €` },
      ],
      shortcuts: [
        { label: "Facturation", href: "/teacher/billing" },
        { label: "Achats élèves", href: "/teacher/purchases" },
        { label: "Profil professeur", href: teacherProfileHref },
      ],
    },
  ];

  return (
    <main className="flex min-h-screen w-full flex-col gap-4">
      <section className="grid gap-4 xl:grid-cols-2">
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
                    href={shortcut.href ?? "#"}
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
