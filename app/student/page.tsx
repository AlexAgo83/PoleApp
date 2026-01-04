import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { appSignature } from "@/lib/appMeta";
import { prisma } from "@/lib/prisma";
import { BuyCreditsButton } from "./BuyCreditsButton";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? process.env.CLOUDINARY_CLOUD_NAME;

type StatPillProps = { label: string; value: string | number };

function StatPill({ label, value }: StatPillProps) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-100">
      <span className="uppercase tracking-[0.14em] text-cyan-200">{label}</span>
      <span className="rounded-md bg-white/10 px-1.5 py-[2px] text-[10px] font-semibold text-white">{value}</span>
    </div>
  );
}

type Shortcut = { label: string; href?: string; kind?: "credits" | "upgrade"; backgroundUrl?: string | null };
type Panel = {
  id: string;
  title: string;
  description: string;
  stats: { label: string; value: string | number }[];
  shortcuts: Shortcut[];
};

function ShortcutLink({ href, label, backgroundUrl }: { href: string; label: string; backgroundUrl?: string | null }) {
  const backgroundStyle = backgroundUrl
    ? {
        backgroundImage: `linear-gradient(135deg, rgba(26,35,69,0.55), rgba(88,28,135,0.4)), url(${backgroundUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : undefined;
  const textShadowStyle = backgroundUrl
    ? { textShadow: "0 0 6px rgba(0,0,0,0.65), 0 1px 2px rgba(0,0,0,0.55)" }
    : undefined;
  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
      style={backgroundStyle}
    >
      <span className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]" style={textShadowStyle}>
        {label}
      </span>
      <span
        className="text-cyan-100 drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)] transition-transform group-hover:translate-x-1"
        style={textShadowStyle}
      >
        →
      </span>
    </Link>
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

  const [
    packs,
    subs,
    confirmedUpcoming,
    waitlistUpcoming,
    weekCoursesCount,
    inProgressCount,
    passedCount,
    masteredCount,
    favoritesCount,
    injuriesCount,
    teachersCount,
    partnersCount,
    purchasesCount,
    nextCourseAttendance,
    progressPositionRows,
    attendanceWithPositions,
    presetPurchases,
    totalPositionsCount,
    lastPastCourseAttendance,
    lastAnyCourseAttendance,
  ] = await Promise.all([
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
    user.schoolId ? prisma.user.count({ where: { schoolId: user.schoolId, role: "TEACHER" } }) : Promise.resolve(0),
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
              photoPublicId: true,
              studio: { select: { name: true } },
              teacher: { select: { name: true } },
              disciplineRef: { select: { name: true, color: true } },
            },
          },
        },
        orderBy: { course: { date: "asc" } },
    }),
    prisma.studentPositionProgress.findMany({
      where: { studentId: session.user.id },
      select: { positionId: true },
    }),
    prisma.courseAttendance.findMany({
      where: { studentId: session.user.id, status: "CONFIRMED" },
      select: {
        course: { select: { positions: { select: { positionId: true } } } },
      },
    }),
    prisma.purchase.findMany({
      where: { userId: session.user.id, kind: "PRESET", status: "PAID" },
      select: { offerId: true },
    }),
    prisma.position.count(),
    prisma.courseAttendance.findFirst({
      where: { studentId: session.user.id, status: { in: ["CONFIRMED", "WAITLIST"] }, course: { date: { lt: now } } },
      select: { courseId: true, course: { select: { id: true, photoPublicId: true, title: true } } },
      orderBy: { course: { date: "desc" } },
    }),
    prisma.courseAttendance.findFirst({
      where: { studentId: session.user.id, status: { in: ["CONFIRMED", "WAITLIST"] } },
      select: { courseId: true, course: { select: { id: true, photoPublicId: true, title: true } } },
      orderBy: { course: { date: "desc" } },
    }),
  ]);

  const progressTotal = inProgressCount + passedCount + masteredCount;
  const presetIds = presetPurchases.map((p) => p.offerId).filter(Boolean);
  const presetPositions =
    presetIds.length > 0
      ? await prisma.presetPosition.findMany({
          where: { presetId: { in: presetIds } },
          select: { positionId: true },
        })
      : [];
  const unlockedIds = new Set<string>([
    ...progressPositionRows.map((p) => p.positionId),
    ...attendanceWithPositions.flatMap((att) => att.course.positions.map((cp) => cp.positionId)),
    ...presetPositions.map((p) => p.positionId),
  ]);
  const unlockedCount = user.isPremium ? totalPositionsCount : unlockedIds.size;
  const nextCourse = nextCourseAttendance?.course;
  const nextCoursePhoto = nextCourse?.photoPublicId
    ? `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,g_auto,f_auto,q_auto,w_800,h_400/${nextCourse.photoPublicId}`
    : null;
  const lastCourse = lastPastCourseAttendance?.course ?? lastAnyCourseAttendance?.course ?? null;
  const lastCourseId = lastCourse?.id ?? lastPastCourseAttendance?.courseId ?? null;
  const lastCoursePhoto = lastCourse?.photoPublicId
    ? `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,g_auto,f_auto,q_auto,w_800,h_400/${lastCourse.photoPublicId}`
    : null;
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
    { label: "Réserver un cours", href: "/student/school" },
    { label: "Tous mes cours", href: "/student/courses/agenda?mine=true" },
  ];
  if (lastCourseId) {
    agendaShortcuts.push({
      label: "Mon dernier cours",
      href: `/student/courses/${lastCourseId}?from=/student`,
      backgroundUrl: lastCoursePhoto,
    });
  }
  if (nextCourse) {
    agendaShortcuts.push({
      label: "Mon prochain cours",
      href: `/student/courses/${nextCourse.id}?from=/student`,
      backgroundUrl: nextCoursePhoto,
    });
  }

  const progressionShortcuts: Shortcut[] = [
    { label: "Mon suivi", href: "/student/progress" },
    { label: "Catalogue positions", href: "/positions" },
    { label: "Combos", href: "/presets" },
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
      description: "Réserve et retrouve tes cours en un coup d’œil.",
      stats: [
        { label: "À venir", value: confirmedUpcoming },
        { label: "En attente", value: waitlistUpcoming },
        ...(nextCourseLabel ? [{ label: "Prochain", value: nextCourseLabel }] : []),
      ],
      shortcuts: agendaShortcuts,
    },
    {
      id: "progression",
      title: "Progression & figures",
      description: "Suis tes positions, tes favoris et tes combos clés.",
      stats: [
        { label: "Débloquées", value: unlockedCount },
        { label: "Suivies", value: progressTotal },
        { label: "Favoris", value: favoritesCount },
      ],
      shortcuts: progressionShortcuts,
    },
    {
      id: "communaute",
      title: "Communauté",
      description: "Reste connecté aux profs, aux offres et à ta santé.",
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
      description: "Crédits, abonnement et achats",
      stats: [
        { label: "Statut", value: isPremium ? "Premium" : "Freemium" },
        { label: "Achats", value: purchasesCount },
        { label: "Crédits", value: credits },
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
                  return (
                    <ShortcutLink
                      key={shortcut.href}
                      href={shortcut.href ?? "#"}
                      label={shortcut.label}
                      backgroundUrl={shortcut.backgroundUrl ?? undefined}
                    />
                  );
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
