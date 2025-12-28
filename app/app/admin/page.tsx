import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WeekCourses } from "./WeekCourses";

type RoleCounts = {
  total: number;
  premium: number;
  STUDENT: number;
  TEACHER: number;
  SCHOOL_ADMIN: number;
  SUPER_ADMIN: number;
};

export const dynamic = "force-dynamic";

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams?: Promise<{ week?: string }>;
}) {
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
      </main>
    );
  }

  const baseSchool = await prisma.school.findUnique({
    where: { id: session.user.schoolId },
    select: { id: true, name: true },
  });
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

  const [users, positionsCount, coursesCount, coursesTodayCount, activeInjuries, studiosCount, partnersCount] =
    await Promise.all([
      prisma.user.findMany({
        where: { schoolId: session.user.schoolId },
        select: { role: true, isPremium: true },
      }),
      prisma.position.count(),
      prisma.course.count({ where: { schoolId: session.user.schoolId } }),
      prisma.course.count({
        where: {
          schoolId: session.user.schoolId,
          date: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),
      prisma.studentInjury.count({
        where: { isActive: true, student: { schoolId: session.user.schoolId } },
      }),
      prisma.studio.count({ where: { schoolId: session.user.schoolId } }),
      prisma.partner.count({ where: { schoolId: session.user.schoolId } }),
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

  const resolved = (await searchParams) ?? {};
  const weekParam = resolved.week;
  const weekBase = weekParam ? new Date(`${weekParam}T00:00:00`) : new Date();
  const startWeek = new Date(weekBase);
  const dayOffset = startWeek.getDay() === 0 ? 6 : startWeek.getDay() - 1; // Monday=0
  startWeek.setDate(startWeek.getDate() - dayOffset);
  const endWeek = new Date(startWeek);
  endWeek.setDate(endWeek.getDate() + 6);
  const formatWeekKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const prevWeek = new Date(startWeek);
  prevWeek.setDate(startWeek.getDate() - 7);
  const nextWeek = new Date(startWeek);
  nextWeek.setDate(startWeek.getDate() + 7);
  const prevWeekValue = formatWeekKey(prevWeek);
  const nextWeekValue = formatWeekKey(nextWeek);
  const now = Date.now();
  const isPastCourse = (courseDate: Date, durationMinutes?: number | null) => {
    const end = new Date(courseDate).getTime() + (durationMinutes ?? 60) * 60_000;
    return end < now;
  };
  const weekCourses = await prisma.course.findMany({
    where: {
      schoolId: session.user.schoolId,
      date: { gte: startWeek, lte: endWeek },
    },
    include: {
      teacher: { select: { name: true, email: true } },
      studio: { select: { name: true } },
    },
    orderBy: { date: "asc" },
  });
  const weekDays = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date(startWeek);
    d.setDate(startWeek.getDate() + idx);
    return d;
  });
  const coursesByDay = weekDays.map((d) => {
    const dayStr = d.toDateString();
    return weekCourses.filter((c) => new Date(c.date).toDateString() === dayStr);
  });
  const initialWeekDays = weekDays.map((d, idx) => {
    const dayCourses = coursesByDay[idx];
    return {
      isoDate: d.toISOString(),
      label: d.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", ""),
      day: d.getDate(),
      isPast: d < new Date(new Date().setHours(0, 0, 0, 0)),
      courses: dayCourses.map((course) => ({
        id: course.id,
        title: course.title,
        date: course.date.toISOString(),
        durationMinutes: course.durationMinutes,
        teacherName: course.teacher?.name ?? course.teacher?.email ?? "Professeur",
        studioName: course.studio?.name ?? "Studio non renseigné",
        past: isPastCourse(course.date, course.durationMinutes),
      })),
    };
  });

  return (
    <main className="flex min-h-screen w-full flex-col gap-4">
      <header className="panel p-3 md:p-6">
        <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Admin</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold text-white">
            {baseSchool?.name ?? "École"},
          </h1>
          <Link
            href="/app/admin/school"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
            aria-label="Éditer la fiche école"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/gear.svg" alt="" className="h-4 w-4" />
            Éditer l&apos;école
          </Link>
        </div>
        {schoolWebsite ? (
          <a
            href={schoolWebsite}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-cyan-200 underline underline-offset-2"
          >
            Site web
          </a>
        ) : null}
        <p className="text-sm text-slate-300">
          Vue synthétique de l’école et accès rapide aux actions admin.
        </p>
        <div className="mt-1 flex flex-wrap justify-end gap-2 text-sm">
          <Link
            href="/app/admin/studios"
            className="rounded-full border border-amber-400/60 bg-white/5 px-3 py-2 text-white transition hover:border-amber-300/80 hover:bg-white/10"
          >
            Studios
          </Link>
          <Link
            href="/app/admin/partners"
            className="rounded-full border border-amber-400/60 bg-white/5 px-3 py-2 text-white transition hover:border-amber-300/80 hover:bg-white/10"
          >
            Partenaires
          </Link>
          <Link
            href="/app/admin/teachers"
            className="rounded-full border border-amber-400/60 bg-white/5 px-3 py-2 text-white transition hover:border-amber-300/80 hover:bg-white/10"
          >
            Professeurs
          </Link>
          <Link
            href="/app/teacher/students"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            Étudiants
          </Link>
          <Link
            href="/app/teacher/courses/agenda?view=month"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            Cours
          </Link>
          <Link
          href="/positions"
          className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
        >
          Positions
        </Link>
        <Link
          href="/app/admin/presets"
          className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
        >
          Combo / Presets
        </Link>
        <Link
          href="/app/student/game"
          className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
        >
          Jeux
          </Link>
          <Link
            href="/app/admin/billing"
            className="rounded-full border border-emerald-400/70 bg-emerald-500/15 px-3 py-2 text-white transition hover:border-emerald-300/80 hover:bg-emerald-500/25"
          >
            Facturation
          </Link>
          <Link
            href="/app/admin/users"
            className="rounded-full bg-cyan-500 px-4 py-2 font-semibold text-white transition hover:bg-cyan-400"
          >
            Gérer les utilisateurs
          </Link>
        </div>
      </header>

      <section className="grid gap-3 md:gap-4 md:grid-cols-2">
        <div className="panel space-y-3 p-6">
          <h2 className="text-xl font-semibold text-white">{baseSchool?.name ?? "École"}</h2>
          <div className="grid grid-cols-2 gap-3 text-sm text-slate-200">
            <Stat label="Utilisateurs" value={counts.total} />
            <Stat label="Étudiants" value={counts.STUDENT} />
            <Stat label="Professeurs" value={counts.TEACHER} />
            <Stat label="Admins" value={counts.SCHOOL_ADMIN} />
            <Stat label="Premium" value={counts.premium} />
            <Stat label="Studios" value={studiosCount} />
            <Stat label="Partenaires" value={partnersCount} />
          </div>
        </div>

        <div className="panel space-y-3 p-6">
          <h2 className="text-xl font-semibold text-white">Activité</h2>
          <div className="grid grid-cols-2 gap-3 text-sm text-slate-200">
            <Stat label="Cours" value={coursesCount} />
            <Stat label="Cours (aujourd'hui)" value={coursesTodayCount} />
            <Stat label="Positions" value={positionsCount} />
            <Stat label="Blessures actives" value={activeInjuries} />
          </div>
        </div>
      </section>

      <WeekCourses
        initialWeek={weekParam ?? null}
        initialPrev={prevWeekValue}
        initialNext={nextWeekValue}
        initialDays={initialWeekDays}
      />

      <section className="panel p-6">
        <h2 className="text-lg font-semibold text-white">Actions rapides</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <ActionCard
            title="Inviter ou créer des comptes"
            description="Ajoute profs/élèves, bascule premium ou change un rôle."
            href="/app/admin/users"
            cta="Gérer les utilisateurs"
            icon={
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="7" r="3" />
                <path d="M5 21v-2a5 5 0 0110 0v2" />
                <path d="M17 11h3" />
                <path d="M18.5 9.5v3" />
              </svg>
            }
          />
          <ActionCard
            title="Suivre les cours"
            description="Consulte les cours saisis et l’impact progression."
            href="/app/teacher/courses/agenda?view=month"
            cta="Voir les cours"
            icon={
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="5" width="16" height="15" rx="2" />
                <path d="M16 3v4" />
                <path d="M8 3v4" />
                <path d="M4 11h16" />
                <path d="M9 15h2" />
                <path d="M13 15h2" />
              </svg>
            }
          />
          <ActionCard
            title="Achats (packs / abos / presets)"
            description="Consulte les achats des élèves (packs crédits, abonnements, presets)."
            href="/app/admin/purchases"
            cta="Voir les achats"
            icon={
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="6" width="18" height="12" rx="2" />
                <path d="M3 10h18" />
                <path d="M7 15h2" />
                <path d="M15 15h2" />
              </svg>
            }
          />
          <ActionCard
            title="Presets / combos"
            description="Crée et gère les presets vidéo premium ou en crédits."
            href="/app/admin/presets"
            cta="Gérer les presets"
            icon={
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="5" width="16" height="14" rx="2" />
                <path d="M4 9h16" />
                <path d="M8 5v14" />
                <path d="M16 5v14" />
              </svg>
            }
          />
        </div>
      </section>

    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function ActionCard({
  title,
  description,
  href,
  cta,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  cta: string;
  icon?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/60 hover:bg-white/10"
    >
      <div className="flex items-start gap-3">
        {icon ? (
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-white/10 bg-white/5">
            {icon}
          </span>
        ) : null}
        <div className="flex-1">
          <p className="text-sm uppercase tracking-[0.14em] text-cyan-200">Action</p>
          <p className="text-lg font-semibold text-white">{title}</p>
          <p className="text-sm text-slate-300">{description}</p>
        </div>
      </div>
      <div className="flex items-center justify-end">
        <span className="text-sm font-semibold text-cyan-300 group-hover:translate-x-1">
          {cta} →
        </span>
      </div>
    </Link>
  );
}
