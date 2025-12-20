import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Filters = {
  from?: string;
  to?: string;
  teacher?: string;
  discipline?: string;
  studio?: string;
  subscription?: string;
};

export const dynamic = "force-dynamic";

export default async function AdminPlanningPage({
  searchParams,
}: {
  searchParams?: Promise<Filters>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SCHOOL_ADMIN") {
    redirect("/access-denied");
  }
  if (!session.user.schoolId) {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-10">
        <section className="panel p-6">
          <h1 className="text-3xl font-semibold text-white">Planning & réservation</h1>
          <p className="text-slate-300">Aucune école associée à ce compte.</p>
        </section>
      </main>
    );
  }

  const resolved = (await searchParams) ?? {};
  const from = resolved.from ? new Date(resolved.from) : undefined;
  const to = resolved.to ? new Date(resolved.to) : undefined;
  const disciplineFilter = resolved.discipline?.trim().toLowerCase();
  const teacherFilter = resolved.teacher;

  const teachers = await prisma.user.findMany({
    where: { schoolId: session.user.schoolId, role: "TEACHER" },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  const courses = await prisma.course.findMany({
    where: {
      schoolId: session.user.schoolId,
      ...(teacherFilter ? { teacherId: teacherFilter } : {}),
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
      ...(disciplineFilter
        ? {
            title: {
              contains: disciplineFilter,
              mode: "insensitive",
            },
          }
        : {}),
    },
    include: {
      teacher: true,
    },
    orderBy: { date: "asc" },
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="panel p-6">
        <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Admin</p>
        <h1 className="text-3xl font-semibold text-white">Planning & réservation</h1>
        <p className="text-sm text-slate-300">
          Vue planning filtrable (école, date, prof, discipline). Studio/abonnement à
          ajouter lors de l’enrichissement du modèle. Réservation : contrôle de crédits à
          brancher.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <Link
            href="/app/admin"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            ↩ Dashboard admin
          </Link>
        </div>
      </header>

      <section className="panel space-y-4 p-6">
        <details className="group" open>
          <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-white">
            <span className="inline-flex items-center gap-2">
              <span>Filtres</span>
            </span>
            <span className="text-xs text-slate-300 transition-transform group-open:rotate-180">
              ▼
            </span>
          </summary>
          <form method="get" className="mt-4 grid w-full gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-indigo-900/20 md:grid-cols-3 md:items-end">
            <label className="text-sm text-slate-200">
              Date de
              <input
                type="date"
                name="from"
                defaultValue={resolved.from ?? ""}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              />
            </label>
            <label className="text-sm text-slate-200">
              Date à
              <input
                type="date"
                name="to"
                defaultValue={resolved.to ?? ""}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              />
            </label>
            <label className="text-sm text-slate-200">
              Professeur
              <select
                name="teacher"
                defaultValue={teacherFilter ?? ""}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              >
                <option value="">Tous les professeurs</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name ?? t.email}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-200 md:col-span-2">
              Discipline (titre du cours)
              <input
                type="text"
                name="discipline"
                defaultValue={resolved.discipline ?? ""}
                placeholder="Pole, Floorwork..."
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              />
            </label>
            <label className="text-sm text-slate-400">
              Studio (à brancher)
              <input
                type="text"
                name="studio"
                defaultValue={resolved.studio ?? ""}
                placeholder="Studio A"
                disabled
                className="mt-1 w-full cursor-not-allowed rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-white/50"
              />
            </label>
            <label className="text-sm text-slate-400">
              Abonnement (à brancher)
              <select
                name="subscription"
                defaultValue={resolved.subscription ?? ""}
                disabled
                className="mt-1 w-full cursor-not-allowed rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-white/50"
              >
                <option value="">Tous</option>
              </select>
            </label>
            <div className="md:col-span-3 flex flex-wrap items-center justify-end gap-2">
              <button
                type="submit"
                className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-400"
              >
                Filtrer
              </button>
              <Link
                href="/app/admin/planning"
                className="rounded-full border border-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
              >
                Réinitialiser
              </Link>
            </div>
          </form>
        </details>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
          <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Fiche école</p>
          <p className="text-base font-semibold text-white">
            {session.user.schoolId ? "Planning de l’école (filtres ci-dessus)" : "École inconnue"}
          </p>
          <p className="text-sm text-slate-300">
            Studios, adresses et liens fiches prof à enrichir quand les données seront disponibles.
          </p>
        </div>

        <div className="space-y-3">
          {courses.length === 0 && (
            <p className="text-slate-200">Aucun cours trouvé avec ces filtres.</p>
          )}
          {courses.map((course) => (
            <article
              key={course.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-base font-semibold text-white">
                    {course.title ?? "Cours sans titre"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(course.date).toLocaleString()} · Prof :{" "}
                    {course.teacher?.name ?? course.teacher?.email ?? "Inconnu"} · Discipline :{" "}
                    {disciplineFilter ? "Filtrée" : "Non renseignée"} · Studio : à renseigner
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-slate-100">
                    École
                  </span>
                  <span className="rounded-full border border-amber-400/40 bg-amber-500/15 px-2 py-1 text-[11px] font-semibold text-amber-50">
                    Réservation : crédit à vérifier
                  </span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
                  aria-disabled
                  title="Contrôle de crédits à implémenter"
                >
                  Réserver (bientôt)
                </button>
                <Link
                  href="/app/admin"
                  className="rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 px-3 py-2 text-xs font-semibold text-slate-900 shadow transition hover:brightness-110"
                >
                  Acheter des crédits
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
