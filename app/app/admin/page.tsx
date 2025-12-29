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
  startWeek.setHours(0, 0, 0, 0);
  const endWeek = new Date(startWeek);
  endWeek.setDate(endWeek.getDate() + 6);
  endWeek.setHours(23, 59, 59, 999);
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
        isVirtual: course.isVirtual,
        positionsCount: (course as any)?._count?.positions ?? 0,
      })),
    };
  });

  return (
    <main className="flex min-h-screen w-full flex-col gap-4">
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
            title="Studios"
            description="Créer, éditer et organiser les studios de l’école."
            href="/app/admin/studios"
            cta="Gérer les studios"
            icon={
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 4l8 4-8 4-8-4 8-4z" />
                <path d="M4 12v5.5A1.5 1.5 0 005.5 19H9v-5.5" />
                <path d="M20 12v5.5A1.5 1.5 0 0118.5 19H15v-5.5" />
              </svg>
            }
          />
          <ActionCard
            title="Partenaires"
            description="Gérer les partenaires et liens sponsorisés de l’école."
            href="/app/admin/partners"
            cta="Voir partenaires"
            icon={
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8a6 6 0 00-9.33-5" />
                <path d="M5 22a7 7 0 0010-6.71" />
                <path d="M16 8a6 6 0 00-9.33-5" />
                <path d="M2 22a7 7 0 0010-6.71" />
                <path d="M7 10h10" />
                <path d="M7 14h10" />
              </svg>
            }
          />
          <ActionCard
            title="Professeurs"
            description="Liste des profs de l’école et accès fiches."
            href="/app/admin/teachers"
            cta="Voir professeurs"
            icon={
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="7" r="3" />
                <path d="M6.5 20v-1.5A3.5 3.5 0 0110 15h4a3.5 3.5 0 013.5 3.5V20" />
                <path d="M4 20h16" />
              </svg>
            }
          />
          <ActionCard
            title="Étudiants"
            description="Consulte les élèves (inscriptions, blessures, progression)."
            href="/app/teacher/students"
            cta="Voir élèves"
            icon={
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="8" r="3" />
                <circle cx="17" cy="9" r="3" />
                <path d="M17 14c-1.1 0-2.1.3-3 .8A6 6 0 009 13a6 6 0 00-5.9 5" />
                <path d="M16 16a3 3 0 013 3" />
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
            title="Positions"
            description="Catalogue positions, création/édition, médias."
            href="/positions"
            cta="Gérer les positions"
            icon={
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5c-2 0-3.5 1.5-3.5 3.5S10 12 12 12s3.5 1.5 3.5 3.5S14 19 12 19" />
                <path d="M12 5V3" />
                <path d="M12 21v-2" />
                <path d="M5 12h2" />
                <path d="M17 12h2" />
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
            title="Fiche école"
            description="Photo, adresse, site web et infos générales de l’école."
            href="/app/admin/school"
            cta="Voir la fiche"
            icon={
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l8 5-8 5-8-5z" />
                <path d="M4 10v7a1 1 0 001 1h14a1 1 0 001-1v-7" />
                <path d="M12 18v-5" />
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
          <ActionCard
            title="Jeux"
            description="Mini-jeu de révision positions (accès élève)."
            href="/app/student/game"
            cta="Ouvrir le jeu"
            icon={
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="7" />
                <circle cx="12" cy="12" r="3" />
                <path d="M12 5V3" />
                <path d="M12 21v-2" />
                <path d="M5 12H3" />
                <path d="M21 12h-2" />
              </svg>
            }
          />
          <ActionCard
            title="Facturation"
            description="Factures cours, exports CSV, statuts et montants."
            href="/app/admin/billing"
            cta="Gérer la facturation"
            icon={
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 4h10a2 2 0 012 2v12l-3-2-3 2-3-2-3 2V6a2 2 0 012-2z" />
                <path d="M9 8h6" />
                <path d="M9 12h6" />
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
          <p className="text-sm uppercase tracking-[0.14em] text-cyan-200">{cta}</p>
          <p className="text-lg font-semibold text-white">{title}</p>
          <p className="text-sm text-slate-300">{description}</p>
        </div>
      </div>
    </Link>
  );
}
