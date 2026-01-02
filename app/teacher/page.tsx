import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveAvatarUrl } from "@/lib/avatar";
import { AVATAR_PLACEHOLDER } from "@/lib/placeholders";
import { appSignature } from "@/lib/appMeta";

function Stat({ label, value }: { label: string; value: number | string }) {
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
  const teacherUser = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, avatarPublicId: true, name: true, email: true },
      })
    : null;
  const nameParts =
    (teacherUser?.name ?? session?.user?.name)
      ?.trim()
      .split(/\s+/)
      .filter(Boolean) ?? [];
  const firstName = nameParts[0];
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : undefined;
  const displayName = firstName ?? lastName ?? teacherUser?.email ?? session?.user?.email ?? "professeur";
  const avatarUrl = resolveAvatarUrl({
    avatarPublicId: teacherUser?.avatarPublicId,
    avatarUrl: session?.user?.image ?? null,
    placeholder: AVATAR_PLACEHOLDER,
  }) || null;
  const avatarInitial = (displayName?.[0] ?? "P").toUpperCase();
  const teacherProfileHref = session?.user?.id ? `/teachers/${session.user.id}` : "/profile";
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const startOfLast7Days = new Date(startOfToday);
  startOfLast7Days.setDate(startOfLast7Days.getDate() - 7);
  const startOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);

  const [
    coursesTodayCount,
    coursesWeekCount,
    positionsCount,
    combosCount,
    activeInjuries,
    studiosCount,
    partnersCount,
    studentsCount,
    disciplinesCount,
    newStudentsWeek,
    newStudentsMonth,
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
    prisma.studio.count({ where: { schoolId: session.user.schoolId } }),
    prisma.partner.count({ where: { schoolId: session.user.schoolId } }),
    prisma.user.count({
      where: { schoolId: session.user.schoolId, role: "STUDENT" },
    }),
    prisma.discipline.count(),
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
  ]);
  return (
    <main className="flex min-h-screen w-full flex-col gap-4">
      <section className="grid gap-3 md:gap-4 md:grid-cols-2">
        <div className="panel space-y-2 p-3 md:p-4 md:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white leading-tight">Stats</h2>
          </div>
          <div className="grid grid-cols-2 gap-1.5 md:gap-2 text-[11px] md:text-xs text-slate-200">
            <Stat label="Positions" value={positionsCount} />
            <Stat label="Combos" value={combosCount} />
            <Stat label="Studios" value={studiosCount} />
            <Stat label="Partenaires" value={partnersCount} />
            <Stat label="Étudiants" value={studentsCount} />
            <Stat label="Disciplines" value={disciplinesCount} />
          </div>
        </div>
        <div className="panel space-y-2 p-3 md:p-4 md:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white leading-tight">Activité</h2>
          </div>
          <div className="grid grid-cols-2 gap-1.5 md:gap-2 text-[11px] md:text-xs text-slate-200">
            <Stat label="Cours (aujourd'hui)" value={coursesTodayCount} />
            <Stat label="Cours (7 jours)" value={coursesWeekCount} />
            <Stat label="Inscriptions (7 jours)" value={newStudentsWeek} />
            <Stat label="Inscriptions (mois)" value={newStudentsMonth} />
            <Stat label="Blessures actives" value={activeInjuries} />
          </div>
        </div>
      </section>

      <section className="panel p-6">
        <div className="grid gap-3 md:grid-cols-2">
          <Link
            href="/teacher/students"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-white/10 bg-white/5">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="8" r="3" />
                  <circle cx="17" cy="9" r="3" />
                  <path d="M4 19v-1a4 4 0 014-4h2a4 4 0 014 4v1" />
                  <path d="M15 19v-1a3.5 3.5 0 013.5-3.5H20" />
                </svg>
              </span>
              <div className="space-y-1">
                <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
                  Élèves
                </p>
                <p className="text-base font-semibold text-white">
                  Liste et fiches élèves
                </p>
              </div>
            </div>
          </Link>
          <Link
            href="/teacher/courses/agenda?view=month"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-white/10 bg-white/5">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="5" width="16" height="15" rx="2" />
                  <path d="M16 3v4" />
                  <path d="M8 3v4" />
                  <path d="M4 11h16" />
                  <path d="M9 15h2" />
                  <path d="M13 15h2" />
                </svg>
              </span>
              <div className="space-y-1">
                <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
                  Planning
                </p>
                <p className="text-base font-semibold text-white">
                  Créer et suivre les cours
                </p>
              </div>
            </div>
          </Link>
          <Link
            href={teacherProfileHref}
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-white/10 bg-white/5">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="6" width="16" height="12" rx="2" />
                  <path d="M8 10h5" />
                  <path d="M8 13h3" />
                  <circle cx="16.5" cy="12" r="1.8" />
                </svg>
              </span>
              <div className="space-y-1">
                <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
                  Fiche professeur
                </p>
                <p className="text-base font-semibold text-white">
                  Photo, diplômes, positions coup de cœur
                </p>
              </div>
            </div>
          </Link>
          <Link
            href="/teacher/school"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-white/10 bg-white/5">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 4l8 4-8 4-8-4 8-4z" />
                  <path d="M4 12v5.5a1.5 1.5 0 001.5 1.5H9v-5.5" />
                  <path d="M20 12v5.5a1.5 1.5 0 01-1.5 1.5H15v-5.5" />
                </svg>
              </span>
              <div className="space-y-1">
                <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
                  École
                </p>
                <p className="text-base font-semibold text-white">
                  Fiche école et studios
                </p>
              </div>
            </div>
          </Link>
          <Link
            href="/positions"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-white/10 bg-white/5">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5c-2 0-3.5 1.5-3.5 3.5S10 12 12 12s3.5 1.5 3.5 3.5S14 19 12 19" />
                  <path d="M12 5V3" />
                  <path d="M12 21v-2" />
                  <path d="M5 12h2" />
                  <path d="M17 12h2" />
                  <path d="M7 7l1.5 1.5" />
                  <path d="M15.5 15.5 17 17" />
                  <path d="M7 17l1.5-1.5" />
                  <path d="M15.5 8.5 17 7" />
                </svg>
              </span>
              <div className="space-y-1">
                <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
                  Positions
                </p>
                <p className="text-base font-semibold text-white">Gérer les positions</p>
              </div>
            </div>
          </Link>
          <Link
            href="/presets"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-white/10 bg-white/5">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="5" width="16" height="14" rx="2" />
                  <path d="M4 9h16" />
                  <path d="M8 5v14" />
                  <path d="M16 5v14" />
                </svg>
              </span>
              <div className="space-y-1">
                <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">Combos</p>
                <p className="text-base font-semibold text-white">Créer et gérer les combos</p>
              </div>
            </div>
          </Link>
          <Link
            href="/teacher/purchases"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-white/10 bg-white/5">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="6" width="18" height="12" rx="2" />
                  <path d="M3 10h18" />
                  <path d="M7 15h2" />
                </svg>
              </span>
              <div className="space-y-1">
                <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">Achats élèves</p>
                <p className="text-base font-semibold text-white">Packs / Abos / Combos</p>
              </div>
            </div>
          </Link>
          <Link
            href="/teacher/billing"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-white/10 bg-white/5">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 4h10a2 2 0 012 2v12l-3-2-3 2-3-2-3 2V6a2 2 0 012-2z" />
                  <path d="M9 8h6" />
                  <path d="M9 12h6" />
                </svg>
              </span>
              <div className="space-y-1">
                <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
                  Facturation
                </p>
                <p className="text-base font-semibold text-white">
                  Suivre tes factures
                </p>
              </div>
            </div>
          </Link>
          <Link
            href="/student/game"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-white/10 bg-white/5">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="7" />
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 5V3" />
                  <path d="M12 21v-2" />
                  <path d="M5 12H3" />
                  <path d="M21 12h-2" />
                </svg>
              </span>
              <div className="space-y-1">
                <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
                  Jeux
                </p>
                <p className="text-base font-semibold text-white">
                  6 mini-jeux de révision
                </p>
              </div>
            </div>
          </Link>
          <Link
            href="/teacher/partners"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-white/10 bg-white/5">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8a6 6 0 00-9.33-5" />
                  <path d="M5 22a7 7 0 0010-6.71" />
                  <path d="M16 8a6 6 0 00-9.33-5" />
                  <path d="M2 22a7 7 0 0010-6.71" />
                  <path d="M7 10h10" />
                  <path d="M7 14h10" />
                </svg>
              </span>
              <div className="space-y-1">
                <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
                  Partenaires
                </p>
                <p className="text-base font-semibold text-white">
                  Voir partenaires/links sponsorisés
                </p>
              </div>
            </div>
          </Link>
        </div>
      </section>

      <div className="pb-4 text-center text-xs text-slate-300/80">{appSignature}</div>
    </main>
  );
}
