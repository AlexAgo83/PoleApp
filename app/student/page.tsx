import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { appSignature } from "@/lib/appMeta";
import { prisma } from "@/lib/prisma";
import { BuyCreditsButton } from "./BuyCreditsButton";

type StatPillProps = { label: string; value: string | number };

function StatPill({ label, value }: StatPillProps) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[12px] text-slate-100">
      <span className="uppercase tracking-[0.14em] text-cyan-200">{label}</span>
      <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs font-semibold text-white">{value}</span>
    </div>
  );
}

type Shortcut = { label: string; href?: string; kind?: "credits" | "upgrade" };
type Panel = {
  id: string;
  title: string;
  description: string;
  stats: { label: string; value: string | number }[];
  shortcuts: Shortcut[];
};

function ShortcutLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
    >
      <span>{label}</span>
      <span className="text-cyan-200 transition-transform group-hover:translate-x-1">→</span>
    </Link>
  );
}

function PanelHero({ title, description }: { title: string; description: string }) {
  const heroBg =
    "linear-gradient(135deg, rgba(14,24,45,0.95), rgba(10,18,36,0.92)), radial-gradient(circle at 12% 20%, rgba(56,189,248,0.22), transparent 38%), radial-gradient(circle at 82% -8%, rgba(236,72,153,0.18), transparent 35%)";
  return (
    <div
      className="relative -mx-[var(--panel-px)] -mt-[var(--panel-py)] overflow-hidden rounded-t-2xl border-b border-white/10 bg-[#0b142a] px-4 py-5 shadow-inner shadow-black/30 sm:px-6"
      style={{ backgroundImage: heroBg, backgroundSize: "cover", backgroundPosition: "center" }}
    >
      <div className="relative flex flex-col gap-2">
        <h2 className="text-xl font-semibold text-white sm:text-2xl">{title}</h2>
        <p className="text-sm text-slate-200/90">{description}</p>
      </div>
    </div>
  );
}

export default async function StudentDashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, isPremium: true, credits: true, schoolId: true },
  });
  if (!user) {
    return null;
  }

  const isPremium = Boolean(user.isPremium);
  const credits = user.credits ?? 0;
  const displayName = user.name?.trim() || user.email;

  const now = new Date();
  const startOfWeek = new Date(now);
  const currentDay = startOfWeek.getDay();
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(startOfWeek.getDate() + diffToMonday);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const [packs, subs, confirmedUpcoming, waitlistUpcoming, weekCoursesCount, inProgressCount, passedCount, masteredCount, favoritesCount, injuriesCount, teachersCount, partnersCount, purchasesCount, nextCourseAttendance] =
    await Promise.all([
      prisma.creditPackOffer.findMany({
        where: { isActive: true, isOpen: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.subscriptionOffer.findMany({
        where: { isActive: true, isOpen: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.courseAttendance.count({
        where: { studentId: session.user.id, status: "CONFIRMED", course: { date: { gte: now } } },
      }),
      prisma.courseAttendance.count({
        where: { studentId: session.user.id, status: "WAITLIST", course: { date: { gte: now } } },
      }),
      prisma.courseAttendance.count({
        where: {
          studentId: session.user.id,
          status: { in: ["CONFIRMED", "WAITLIST"] },
          course: { date: { gte: startOfWeek, lte: endOfWeek } },
        },
      }),
      prisma.studentPositionProgress.count({
        where: { studentId: session.user.id, learningStatus: "IN_PROGRESS" },
      }),
      prisma.studentPositionProgress.count({
        where: { studentId: session.user.id, learningStatus: "PASSED" },
      }),
      prisma.studentPositionProgress.count({
        where: { studentId: session.user.id, learningStatus: "MASTERED" },
      }),
      prisma.studentFavoritePosition.count({ where: { studentId: session.user.id } }),
      prisma.studentInjury.count({ where: { studentId: session.user.id, isActive: true } }),
      user.schoolId
        ? prisma.user.count({ where: { schoolId: user.schoolId, role: "TEACHER" } })
        : Promise.resolve(0),
      user.schoolId ? prisma.partner.count({ where: { schoolId: user.schoolId } }) : Promise.resolve(0),
      prisma.purchase.count({ where: { userId: session.user.id } }),
      prisma.courseAttendance.findFirst({
        where: {
          studentId: session.user.id,
          status: { in: ["CONFIRMED", "WAITLIST"] },
          course: { date: { gte: now } },
        },
        select: {
          status: true,
          course: {
            select: {
              id: true,
              title: true,
              date: true,
              studio: { select: { name: true } },
              teacher: { select: { name: true } },
              disciplineRef: { select: { name: true, color: true } },
            },
          },
        },
        orderBy: { course: { date: "asc" } },
      }),
    ]);

  const progressTotal = inProgressCount + passedCount + masteredCount;
  const nextCourse = nextCourseAttendance?.course;
  const nextCourseLabel = nextCourse
    ? new Intl.DateTimeFormat("fr-FR", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(nextCourse.date))
    : null;

  const agendaShortcuts: Shortcut[] = [
    { label: "Agenda mensuel", href: "/student/courses/agenda?view=month" },
    { label: "Tous mes cours", href: "/student/courses" },
    { label: "Studios & école", href: "/student/school" },
  ];
  if (nextCourse) {
    agendaShortcuts.push({ label: "Détails du prochain cours", href: `/student/courses/${nextCourse.id}?from=/student` });
  }

  const progressionShortcuts: Shortcut[] = [
    { label: "Mon suivi", href: "/student/progress" },
    { label: "Catalogue positions", href: "/positions" },
    { label: "Combos (presets)", href: "/presets" },
    { label: "Mini-jeux révision", href: "/student/game" },
  ];

  const communauteShortcuts: Shortcut[] = [
    { label: "Mes professeurs", href: "/student/teachers" },
    { label: "Partenaires & offres", href: "/student/partners" },
    { label: "Déclarer une blessure", href: "/student/injuries" },
  ];

  const compteShortcuts: Shortcut[] = [
    { label: "Fiche élève", href: "/profile" },
    { label: "Historique achats", href: "/student/purchases" },
    { label: "Gérer mes crédits", kind: "credits" },
    { label: "Passer premium", kind: "upgrade" },
  ];

  const panels: Panel[] = [
    {
      id: "agenda",
      title: "Cours & agenda",
      description: "Réserve, attends et retrouve tes cours en un coup d’œil.",
      stats: [
        { label: "Confirmés", value: confirmedUpcoming },
        { label: "Liste d'attente", value: waitlistUpcoming },
        ...(nextCourseLabel ? [{ label: "Prochain", value: nextCourseLabel }] : []),
      ],
      shortcuts: agendaShortcuts,
    },
    {
      id: "progression",
      title: "Progression & figures",
      description: "Suis tes positions, tes favoris et tes combos clés.",
      stats: [
        { label: "Suivies", value: progressTotal },
        { label: "Validées", value: passedCount },
        { label: "Mastered", value: masteredCount },
        { label: "Favoris", value: favoritesCount },
      ],
      shortcuts: progressionShortcuts,
    },
    {
      id: "communaute",
      title: "Communauté",
      description: "Reste connecté aux profs, partenaires et à ta santé.",
      stats: [
        { label: "Profs", value: teachersCount },
        { label: "Partenaires", value: partnersCount },
        { label: "Blessures", value: injuriesCount },
      ],
      shortcuts: communauteShortcuts,
    },
    {
      id: "compte",
      title: "Compte",
      description: "Crédits, profil et upgrade premium quand tu veux.",
      stats: [
        { label: "Crédits", value: credits },
        { label: "Statut", value: isPremium ? "Premium" : "Freemium" },
        { label: "Achats", value: purchasesCount },
      ],
      shortcuts: compteShortcuts,
    },
  ];

  return (
    <main className="flex min-h-screen w-full flex-col gap-5">
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
                {panel.shortcuts.map((shortcut) => {
                  if (shortcut.kind === "credits") {
                    return (
                      <BuyCreditsButton
                        key="shortcut-credits"
                        currentCredits={credits}
                        packs={packs}
                        subscriptions={subs}
                        showUpgrade={false}
                        buttonLabel={shortcut.label}
                        buttonClassName="group flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10 after:content-['→'] after:text-cyan-200 after:transition-transform after:group-hover:translate-x-1"
                      />
                    );
                  }
                  if (shortcut.kind === "upgrade") {
                    if (isPremium) {
                      return null;
                    }
                    return (
                      <BuyCreditsButton
                        key="shortcut-upgrade"
                        mode="upgrade"
                        currentCredits={credits}
                        packs={packs}
                        subscriptions={subs}
                        showUpgrade={false}
                        buttonLabel={`${shortcut.label}`}
                        buttonClassName="group flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10 after:content-['→'] after:text-cyan-200 after:transition-transform after:group-hover:translate-x-1"
                      />
                    );
                  }
                  return <ShortcutLink key={shortcut.href} href={shortcut.href ?? "#"} label={shortcut.label} />;
                })}
              </div>
            </div>
          </article>
        ))}
      </section>

      <div className="pb-4 text-center text-xs text-slate-300/80">{appSignature}</div>
    </main>
  );
}
