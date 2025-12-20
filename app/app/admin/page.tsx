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
};

export const dynamic = "force-dynamic";

function formatDuration(minutes: number) {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0) {
    return `${hrs}h${mins.toString().padStart(2, "0")}`;
  }
  return `${mins} min`;
}

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SCHOOL_ADMIN") {
    redirect("/access-denied");
  }

  if (!session.user.schoolId) {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-10">
        <section className="panel p-6">
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
    { total: 0, STUDENT: 0, TEACHER: 0, SCHOOL_ADMIN: 0, premium: 0 } as RoleCounts
  ) satisfies RoleCounts;

  const today = new Date();
  const startWeek = new Date(today);
  const dayOffset = startWeek.getDay() === 0 ? 6 : startWeek.getDay() - 1; // Monday=0
  startWeek.setDate(startWeek.getDate() - dayOffset);
  const endWeek = new Date(startWeek);
  endWeek.setDate(endWeek.getDate() + 6);
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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="panel p-6">
        <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Admin</p>
        <h1 className="text-3xl font-semibold text-white">
          Dashboard {baseSchool?.name ?? "école"},
        </h1>
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
        <div className="mt-2 flex flex-wrap gap-2 text-sm">
          <Link
            href="/app/admin/school"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
            aria-label="Éditer la fiche école"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/gear.svg" alt="" className="h-4 w-4" />
            Éditer l&apos;école
          </Link>
        </div>
        <p className="text-sm text-slate-300">
          Vue synthétique de l’école et accès rapide aux actions admin.
        </p>
        <div className="mt-4 flex flex-wrap justify-end gap-3 text-sm">
          <Link
            href="/app/admin/users"
            className="rounded-full bg-cyan-500 px-4 py-2 font-semibold text-slate-900 transition hover:bg-cyan-400"
          >
            Gérer les utilisateurs
          </Link>
          <Link
            href="/app/admin/studios"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            Studios
          </Link>
          <Link
            href="/app/admin/partners"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            Partenaires
          </Link>
          <Link
            href="/app/admin/teachers"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
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
            href="/app/teacher/courses"
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
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
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
          <p className="text-xs text-slate-400">
            Cours et blessures filtrés sur l’école de l’admin.
          </p>
        </div>
      </section>

      <section className="panel p-6">
        <details className="group" open={false}>
          <summary className="flex cursor-pointer items-center justify-between text-lg font-semibold text-white">
            <span className="inline-flex items-center gap-2">
              <span>Vue semaine</span>
              <span className="text-xs font-normal text-slate-300">(cette semaine)</span>
            </span>
            <span className="text-xs text-slate-300 transition-transform group-open:rotate-180">▼</span>
          </summary>
        <div className="mt-3 grid gap-2 md:grid-cols-7 md:gap-3">
          {weekDays.map((day, idx) => {
            const dayCourses = coursesByDay[idx];
            return (
              <div key={day.toISOString()} className="rounded-xl border border-white/10 bg-white/5 p-2 text-sm text-slate-200">
                <div className="mb-2 flex items-center justify-between text-xs font-semibold text-white">
                  <span className="flex items-center gap-1">
                    <span>{day.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })}</span>
                  </span>
                  <span className="text-[11px] text-cyan-100">{dayCourses.length} cours</span>
                </div>
                <div className="flex flex-col gap-1.5 md:gap-2">
                  {dayCourses.length === 0 && <span className="text-slate-400">—</span>}
                  {dayCourses.map((course) => {
                    const past = isPastCourse(course.date, course.durationMinutes);
                    return (
                      <Link
                        key={course.id}
                        href={`/app/teacher/courses/${course.id}?from=/app/admin`}
                        className={`inline-flex w-full flex-col rounded-md border px-2 py-1 text-[11px] transition hover:border-cyan-300/70 hover:bg-white/15 md:rounded-lg md:px-2.5 md:py-1.5 ${
                          past
                            ? "border-white/15 bg-slate-800/60 text-slate-300 opacity-70 line-through"
                            : "border-white/10 bg-white/10 text-white"
                        }`}
                        title={`Durée : ${formatDuration(course.durationMinutes ?? 60)}`}
                      >
                        <span>
                          {new Date(course.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", hour12: false })}
                        </span>
                        <span className="truncate">{course.title ?? "Cours"}</span>
                        <span className="text-[10px] text-cyan-100 hidden md:inline">
                          {formatDuration(course.durationMinutes ?? 60)}
                        </span>
                        {course.studio?.name ? (
                          <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-1.5 py-0.5 text-[10px] text-cyan-100">
                            {course.studio.name}
                          </span>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        </details>
      </section>

      <section className="panel p-6">
        <h2 className="text-lg font-semibold text-white">Actions rapides</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <ActionCard
            title="Inviter ou créer des comptes"
            description="Ajoute profs/élèves, bascule premium ou change un rôle."
            href="/app/admin/users"
            cta="Gérer les utilisateurs"
          />
          <ActionCard
            title="Suivre les cours"
            description="Consulte les cours saisis et l’impact progression."
            href="/app/teacher/courses"
            cta="Voir les cours"
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
}: {
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/60 hover:bg-white/10"
    >
      <p className="text-sm uppercase tracking-[0.14em] text-cyan-200">Action</p>
      <p className="text-lg font-semibold text-white">{title}</p>
      <p className="text-sm text-slate-300">{description}</p>
      <span className="text-sm font-semibold text-cyan-300 group-hover:translate-x-1">
        {cta} →
      </span>
    </Link>
  );
}
