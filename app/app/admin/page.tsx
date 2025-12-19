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

  const [users, positionsCount, coursesCount, activeInjuries] = await Promise.all([
    prisma.user.findMany({
      where: { schoolId: session.user.schoolId },
      select: { role: true, isPremium: true },
    }),
    prisma.position.count(),
    prisma.course.count({ where: { schoolId: session.user.schoolId } }),
    prisma.studentInjury.count({
      where: { isActive: true, student: { schoolId: session.user.schoolId } },
    }),
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

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-10">
      <header className="panel p-6">
        <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Admin</p>
        <h1 className="text-3xl font-semibold text-white">Dashboard école</h1>
        <p className="text-sm text-slate-300">
          Vue synthétique de l’école et accès rapide aux actions admin.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link
            href="/app/admin/users"
            className="rounded-full bg-cyan-500 px-4 py-2 font-semibold text-slate-900 transition hover:bg-cyan-400"
          >
            Gérer les utilisateurs
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
          <h2 className="text-xl font-semibold text-white">École</h2>
          <div className="grid grid-cols-2 gap-3 text-sm text-slate-200">
            <Stat label="Utilisateurs" value={counts.total} />
            <Stat label="Étudiants" value={counts.STUDENT} />
            <Stat label="Professeurs" value={counts.TEACHER} />
            <Stat label="Admins" value={counts.SCHOOL_ADMIN} />
            <Stat label="Premium" value={counts.premium} />
          </div>
        </div>

        <div className="panel space-y-3 p-6">
          <h2 className="text-xl font-semibold text-white">Activité</h2>
          <div className="grid grid-cols-2 gap-3 text-sm text-slate-200">
            <Stat label="Cours" value={coursesCount} />
            <Stat label="Positions" value={positionsCount} />
            <Stat label="Blessures actives" value={activeInjuries} />
          </div>
          <p className="text-xs text-slate-400">
            Cours et blessures filtrés sur l’école de l’admin.
          </p>
        </div>
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
