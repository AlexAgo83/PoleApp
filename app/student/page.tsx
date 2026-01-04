import type { ReactNode } from "react";
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


function PanelIllustration({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-slate-900/50 via-slate-900/80 to-slate-950 p-4 shadow-inner shadow-cyan-900/30 min-h-[240px]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.25),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(236,72,153,0.18),transparent_40%)]" />
      <div className="pointer-events-none absolute -left-10 top-4 h-24 w-24 rounded-full border border-cyan-400/15" />
      <div className="pointer-events-none absolute -right-12 bottom-2 h-20 w-20 rounded-full border border-fuchsia-400/10" />
      <div className="relative flex h-full w-full items-center justify-center text-cyan-50/80">{children}</div>
    </div>
  );
}

function OrbitPlaceholder() {
  return (
    <svg viewBox="0 0 240 180" role="img" aria-label="Illustration cours" className="h-48 w-full text-cyan-200/70">
      <defs>
        <linearGradient id="orbit" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop stopColor="currentColor" stopOpacity="0.85" offset="0%" />
          <stop stopColor="currentColor" stopOpacity="0.15" offset="100%" />
        </linearGradient>
      </defs>
      <circle cx="120" cy="90" r="65" fill="none" stroke="url(#orbit)" strokeWidth="2" />
      <circle cx="120" cy="90" r="90" fill="none" stroke="currentColor" strokeDasharray="6 10" strokeOpacity="0.4" />
      <circle cx="120" cy="90" r="42" fill="none" stroke="currentColor" strokeOpacity="0.35" />
      <circle cx="74" cy="68" r="6" fill="currentColor" opacity="0.9" />
      <circle cx="176" cy="88" r="8" fill="currentColor" opacity="0.7" />
      <circle cx="118" cy="132" r="5" fill="currentColor" opacity="0.8" />
      <rect x="96" y="70" width="48" height="12" rx="6" fill="currentColor" opacity="0.75" />
      <rect x="86" y="90" width="68" height="12" rx="6" fill="currentColor" opacity="0.5" />
      <rect x="104" y="112" width="44" height="10" rx="5" fill="currentColor" opacity="0.35" />
    </svg>
  );
}

function GridPlaceholder() {
  return (
    <svg viewBox="0 0 240 180" role="img" aria-label="Illustration progression" className="h-48 w-full text-fuchsia-200/80">
      <rect x="26" y="20" width="188" height="140" rx="14" fill="currentColor" opacity="0.08" />
      <rect x="40" y="36" width="72" height="24" rx="8" fill="currentColor" opacity="0.8" />
      <rect x="132" y="36" width="68" height="24" rx="8" fill="currentColor" opacity="0.5" />
      <rect x="40" y="80" width="60" height="16" rx="6" fill="currentColor" opacity="0.7" />
      <rect x="108" y="80" width="48" height="16" rx="6" fill="currentColor" opacity="0.45" />
      <rect x="166" y="80" width="24" height="16" rx="6" fill="currentColor" opacity="0.3" />
      <rect x="40" y="110" width="58" height="16" rx="6" fill="currentColor" opacity="0.7" />
      <rect x="104" y="110" width="90" height="16" rx="6" fill="currentColor" opacity="0.5" />
      <rect x="40" y="140" width="120" height="12" rx="6" fill="currentColor" opacity="0.35" />
      <circle cx="178" cy="118" r="10" fill="currentColor" opacity="0.8" />
      <circle cx="192" cy="54" r="6" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

function WavePlaceholder() {
  return (
    <svg viewBox="0 0 240 180" role="img" aria-label="Illustration communauté" className="h-48 w-full text-emerald-200/80">
      <path d="M20 120c22 16 50 22 82-6 42-35 60-16 94-4 17 6 28 6 44-2v48H20z" fill="currentColor" opacity="0.25" />
      <path d="M14 92c20 22 58 30 92-2 42-38 66-14 102-4 12 4 22 6 32 4v90H14z" fill="currentColor" opacity="0.18" />
      <circle cx="64" cy="94" r="10" fill="currentColor" opacity="0.8" />
      <circle cx="118" cy="82" r="8" fill="currentColor" opacity="0.65" />
      <circle cx="168" cy="90" r="12" fill="currentColor" opacity="0.75" />
      <circle cx="198" cy="74" r="6" fill="currentColor" opacity="0.8" />
      <rect x="44" y="46" width="64" height="12" rx="6" fill="currentColor" opacity="0.45" />
      <rect x="128" y="46" width="52" height="12" rx="6" fill="currentColor" opacity="0.35" />
      <rect x="94" y="64" width="42" height="12" rx="6" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

function PremiumPlaceholder() {
  return (
    <svg viewBox="0 0 320 200" role="img" aria-label="Illustration premium" className="h-52 w-full text-fuchsia-200/80">
      <defs>
        <linearGradient id="premiumGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.8" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <rect x="12" y="12" width="296" height="176" rx="20" fill="url(#premiumGrad)" opacity="0.12" />
      <circle cx="160" cy="100" r="68" fill="none" stroke="currentColor" strokeOpacity="0.6" strokeWidth="2" />
      <circle cx="160" cy="100" r="46" fill="none" stroke="currentColor" strokeOpacity="0.4" strokeWidth="2" strokeDasharray="6 10" />
      <circle cx="160" cy="100" r="28" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="2" />
      <path d="M130 100c12 10 26 10 40 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.65" fill="none" />
      <path d="M146 84c6 4 12 4 18 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.5" fill="none" />
      <path d="M146 116c6 4 12 4 18 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.5" fill="none" />
      <circle cx="118" cy="104" r="6" fill="currentColor" opacity="0.8" />
      <circle cx="202" cy="96" r="8" fill="currentColor" opacity="0.7" />
      <circle cx="160" cy="136" r="5" fill="currentColor" opacity="0.75" />
      <rect x="134" y="70" width="52" height="12" rx="6" fill="currentColor" opacity="0.55" />
      <rect x="122" y="128" width="76" height="12" rx="6" fill="currentColor" opacity="0.35" />
    </svg>
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

  const panels = [
    {
      id: "agenda",
      title: "Cours & agenda",
      description: "Réserve, attends et retrouve tes cours en un coup d’œil.",
      stats: [
        { label: "Semaine", value: weekCoursesCount },
        { label: "Confirmés", value: confirmedUpcoming },
        { label: "Liste d'attente", value: waitlistUpcoming },
        ...(nextCourseLabel ? [{ label: "Prochain", value: nextCourseLabel }] : []),
      ],
      shortcuts: [
        { label: "Agenda mensuel", href: "/student/courses/agenda?view=month" },
        { label: "Tous mes cours", href: "/student/courses" },
        { label: "Studios & école", href: "/student/school" },
        nextCourse
          ? { label: "Détails du prochain cours", href: `/student/courses/${nextCourse.id}?from=/student` }
          : null,
      ].filter(Boolean) as { label: string; href: string }[],
      illustration: (
        <div className="relative h-full w-full">
          <OrbitPlaceholder />
        </div>
      ),
    },
    {
      id: "progression",
      title: "Progression & figures",
      description: "Suis tes positions, tes favoris et tes combos clés.",
      stats: [
        { label: "Positions suivies", value: progressTotal },
        { label: "En cours", value: inProgressCount },
        { label: "Validées", value: passedCount },
        { label: "Mastered", value: masteredCount },
        { label: "Favoris", value: favoritesCount },
      ],
      shortcuts: [
        { label: "Mon suivi", href: "/student/progress" },
        { label: "Catalogue positions", href: "/positions" },
        { label: "Combos (presets)", href: "/presets" },
        { label: "Mini-jeux révision", href: "/student/game" },
      ],
      illustration: <GridPlaceholder />,
    },
    {
      id: "communaute",
      title: "Communauté & avantages",
      description: "Reste connecté aux profs, partenaires et à ta santé.",
      stats: [
        { label: "Profs", value: teachersCount },
        { label: "Partenaires", value: partnersCount },
        { label: "Blessures actives", value: injuriesCount },
      ],
      shortcuts: [
        { label: "Mes professeurs", href: "/student/teachers" },
        { label: "Partenaires & offres", href: "/student/partners" },
        { label: "Historique achats", href: "/student/purchases" },
      ] as Shortcut[],
      illustration: <WavePlaceholder />,
    },
    {
      id: "compte",
      title: "Compte & avantages premium",
      description: "Crédits, profil et upgrade premium quand tu veux.",
      stats: [
        { label: "Crédits", value: credits },
        { label: "Statut", value: isPremium ? "Premium" : "Freemium" },
        { label: "Achats", value: purchasesCount },
      ],
      shortcuts: [
        { label: "Fiche élève", href: "/profile" },
        { label: "Déclarer une blessure", href: "/student/injuries" },
        { label: "Gérer mes crédits", kind: "credits" },
        { label: "Passer premium", kind: "upgrade" },
      ] as Shortcut[],
      illustration: (
        <PremiumPlaceholder />
      ),
    },
  ];

  return (
    <main className="flex min-h-screen w-full flex-col gap-5">
      <section className="grid gap-4 xl:grid-cols-2">
        {panels.map((panel) => (
          <article key={panel.id} className="panel border border-white/5">
            <div className="panel-body grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-200">
                    {panel.title}
                  </span>
                </div>
                <p className="text-base font-semibold text-white">{panel.description}</p>
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
              <PanelIllustration>
                {panel.illustration}
              </PanelIllustration>
            </div>
          </article>
        ))}
      </section>

      <div className="pb-4 text-center text-xs text-slate-300/80">{appSignature}</div>
    </main>
  );
}
