import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  searchParams: _searchParams,
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

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const endOfWeek = new Date(startOfToday);
  endOfWeek.setDate(endOfWeek.getDate() + 7);
  endOfWeek.setHours(23, 59, 59, 999);
  const startOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);

  const [
    users,
    positionsCount,
    coursesCount,
    coursesTodayCount,
    coursesWeekCount,
    activeInjuries,
    studiosCount,
    partnersCount,
    disciplinesCount,
    combosCount,
    newStudentsWeek,
    newStudentsMonth,
  ] = await Promise.all([
    prisma.user.findMany({
      where: { schoolId: session.user.schoolId },
      select: { role: true, isPremium: true, createdAt: true },
    }),
    prisma.position.count(),
    prisma.course.count({ where: { schoolId: session.user.schoolId } }),
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
          gte: startOfToday,
          lte: endOfWeek,
        },
      },
    }),
    prisma.studentInjury.count({
      where: { isActive: true, student: { schoolId: session.user.schoolId } },
    }),
    prisma.studio.count({ where: { schoolId: session.user.schoolId } }),
    prisma.partner.count({ where: { schoolId: session.user.schoolId } }),
    prisma.discipline.count({ where: { schoolId: session.user.schoolId } }),
    prisma.preset.count({ where: { schoolId: session.user.schoolId } }),
    prisma.user.count({
      where: {
        schoolId: session.user.schoolId,
        role: "STUDENT",
        createdAt: { gte: startOfToday, lte: endOfWeek },
      },
    }),
    prisma.user.count({
      where: {
        schoolId: session.user.schoolId,
        role: "STUDENT",
        createdAt: { gte: startOfMonth },
      },
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

  return (
    <main className="flex min-h-screen w-full flex-col gap-4">
      <section className="grid gap-3 md:gap-4 md:grid-cols-2">
        <div className="panel space-y-2 p-3 md:p-4">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-lg font-semibold text-white leading-tight">{baseSchool?.name ?? "École"}</h2>
            {schoolWebsite && (
              <a
                href={schoolWebsite}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-cyan-200 underline decoration-dotted underline-offset-4 transition hover:text-cyan-100"
              >
                Site ↗
              </a>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1.5 md:gap-2 text-[11px] md:text-xs text-slate-200">
            <Stat label="Utilisateurs" value={counts.total} />
            <Stat label="Étudiants" value={counts.STUDENT} />
            <Stat label="Professeurs" value={counts.TEACHER} />
            <Stat label="Admins" value={counts.SCHOOL_ADMIN} />
            <Stat label="Premium" value={counts.premium} />
            <Stat label="Studios" value={studiosCount} />
            <Stat label="Partenaires" value={partnersCount} />
            <Stat label="Disciplines" value={disciplinesCount} />
          </div>
        </div>

        <div className="panel space-y-2 p-3 md:p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white leading-tight">Activité</h2>
          </div>
          <div className="grid grid-cols-2 gap-1.5 md:gap-2 text-[11px] md:text-xs text-slate-200">
            <Stat label="Cours (aujourd'hui)" value={coursesTodayCount} />
            <Stat label="Cours (7 jours)" value={coursesWeekCount} />
            <Stat label="Positions" value={positionsCount} />
            <Stat label="Combos" value={combosCount} />
            <Stat label="Élèves (7 jours)" value={newStudentsWeek} />
            <Stat label="Élèves (mois)" value={newStudentsMonth} />
            <Stat label="Blessures actives" value={activeInjuries} />
          </div>
        </div>
      </section>

      <section className="panel p-6">
        <div className="grid gap-3 md:grid-cols-2">
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
            cta="Planning"
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
    <div className="relative overflow-hidden rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 shadow-sm">
      <div className="absolute inset-0 opacity-20 blur-2xl" aria-hidden>
        <div className="h-full w-full bg-gradient-to-br from-cyan-500/40 via-white/30 to-transparent" />
      </div>
      <div className="relative flex items-center justify-between gap-2">
        <p className="text-[11px] uppercase tracking-[0.14em] text-slate-300">{label}</p>
        <span className="inline-flex h-5 min-w-[2.5rem] items-center justify-center rounded-full border border-white/10 bg-white/10 px-2 text-xs font-semibold text-white">
          {value}
        </span>
      </div>
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
  description?: string;
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
        </div>
      </div>
    </Link>
  );
}
