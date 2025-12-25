import Link from "next/link";
import { getServerSession } from "next-auth";
import { AttendanceStatus, Prisma } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { FilterPanel } from "@/components/FilterPanel";
import { AVATAR_PLACEHOLDER } from "@/lib/placeholders";
import { SafeImage } from "@/components/SafeImage";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 10;
const STUDENT_AVATAR_PLACEHOLDER = AVATAR_PLACEHOLDER;
const FALLBACK_DISCIPLINES = [
  { name: "Pole", color: "#0ea5e9" },
  { name: "Exotic", color: "#ec4899" },
  { name: "Souplesse", color: "#a855f7" },
  { name: "Pilates", color: "#10b981" },
  { name: "Danse", color: "#7c3aed" },
];

export default async function TeacherStudentsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    page?: string;
    premium?: string;
    injury?: string;
    q?: string;
    sort?: string;
    discipline?: string | string[];
  }>;
}) {
  const resolvedParams = (await searchParams) ?? {};
  const rawPage = Number(resolvedParams.page ?? "1");
  const premiumOnly = resolvedParams.premium === "true";
  const injuryFilter =
    resolvedParams.injury === "active"
      ? "active"
      : resolvedParams.injury === "none"
      ? "none"
      : undefined;
  const q = resolvedParams.q?.toString().trim() || "";
  const sort = resolvedParams.sort === "name_desc" ? "name_desc" : "name_asc";
  const disciplineFilters =
    typeof resolvedParams.discipline === "string"
      ? resolvedParams.discipline
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean)
      : Array.isArray(resolvedParams.discipline)
      ? resolvedParams.discipline.flatMap((v) => v.split(",")).map((v) => v.trim()).filter(Boolean)
      : [];
  const activeFilters = [
    premiumOnly ? "premium" : null,
    injuryFilter,
    disciplineFilters.length > 0 ? "discipline" : null,
    q && q.length > 0 ? "q" : null,
    sort === "name_desc" ? "sort" : null,
  ].filter(Boolean).length;
  const session = await getServerSession(authOptions);
  if (!session?.user?.schoolId) {
    return null;
  }
  const courseDistinctDisciplines = await prisma.course.findMany({
    where: { schoolId: session.user.schoolId },
    select: { discipline: true },
    distinct: ["discipline"],
  });
  const disciplineRows =
    (await prisma.discipline
      .findMany({
        where: { schoolId: session.user.schoolId },
        select: { id: true, name: true, color: true },
        orderBy: { name: "asc" },
      })
      .catch(() => [])) ?? [];
  const disciplines = (() => {
    const legacy = courseDistinctDisciplines
      .map((c) => c.discipline)
      .filter((d): d is string => Boolean(d && d.trim().length > 0))
      .map((d) => ({ name: d.trim(), color: undefined as string | undefined }));
    const merged: { id?: string; name: string; color?: string | null }[] = [...disciplineRows];
    legacy.forEach((d) => {
      if (!merged.some((m) => m.name.toLowerCase() === d.name.toLowerCase())) {
        merged.push(d);
      }
    });
    return merged.length > 0 ? merged : FALLBACK_DISCIPLINES;
  })();
  const userKey = session.user.id ?? "anon";

  const queryParams = new URLSearchParams();
  if (premiumOnly) queryParams.set("premium", "true");
  if (injuryFilter) queryParams.set("injury", injuryFilter);
  if (q) queryParams.set("q", q);
  if (sort === "name_desc") queryParams.set("sort", "name_desc");
  if (disciplineFilters.length > 0) queryParams.set("discipline", disciplineFilters.join(","));
  const qs = queryParams.toString();

  const courseFilter: Prisma.CourseWhereInput = {
    ...(disciplineFilters.length > 0
      ? { OR: disciplineFilters.map((d) => ({ discipline: { contains: d, mode: "insensitive" as const } })) }
      : {}),
  };
  if (session.user.role === "TEACHER") {
    courseFilter.teacherId = session.user.id;
  }

  const whereClause: Prisma.UserWhereInput = {
    role: "STUDENT" as const,
    schoolId: session.user.schoolId,
    ...(premiumOnly ? { isPremium: true } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as Prisma.QueryMode } },
            { email: { contains: q, mode: "insensitive" as Prisma.QueryMode } },
          ],
        }
      : {}),
    ...(injuryFilter === "active"
      ? { injuries: { some: { isActive: true } } }
      : injuryFilter === "none"
      ? { injuries: { none: { isActive: true } } }
      : {}),
    attendances: {
      some: {
        status: { in: [AttendanceStatus.CONFIRMED, AttendanceStatus.WAITLIST] },
        ...(Object.keys(courseFilter).length > 0 ? { course: courseFilter } : {}),
      },
    },
  };

  const totalCount = await prisma.user.count({
    where: whereClause,
  });
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, rawPage || 1), totalPages);
  const skip = (currentPage - 1) * PAGE_SIZE;

  const students = await prisma.user.findMany({
    where: whereClause,
    select: {
      id: true,
      email: true,
      name: true,
      age: true,
      avatarUrl: true,
      isPremium: true,
      injuries: {
        include: { injuryType: true },
      },
      progress: { select: { id: true } },
    },
    orderBy: sort === "name_desc" ? { name: "desc" } : { name: "asc" },
    skip,
    take: PAGE_SIZE,
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-3 px-0 py-6 md:gap-6 md:px-8 md:py-10">
      <header className="panel border-indigo-400/25 p-4 md:p-6 shadow-indigo-900/30">
        <p className="text-xs uppercase tracking-[0.14em] text-indigo-100">
          Professeur / Admin
        </p>
        <h1 className="text-3xl font-semibold text-white">Élèves</h1>
        <p className="text-sm text-slate-200">
          Aperçu des élèves de ton école et de leurs blessures déclarées.
        </p>
        {session.user.role === "SCHOOL_ADMIN" ? (
          <div className="mt-4 flex flex-wrap justify-end gap-3 text-sm">
            <Link
              href="/app/admin/users?role=STUDENT"
              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
            >
              Gérer via utilisateurs
            </Link>
            <Link
              href="/app/admin"
              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
            >
              ← Retour dashboard
            </Link>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap justify-end gap-3 text-sm">
            <Link
              href="/app/teacher"
              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
            >
              ← Retour accueil
            </Link>
          </div>
        )}
      </header>

      <section className="panel space-y-4 border-indigo-400/15 p-6">
        <FilterPanel
          storageKey="filters:teacher-students"
          title="Filtres"
          activeCount={activeFilters}
          userKey={userKey}
        >
          <form
            key={`filters-${q || "all"}-${injuryFilter || "all"}-${premiumOnly ? "premium" : "all"}-${sort}-${
              disciplineFilters.join("|") || "all"
            }`}
            method="get"
            className="mt-4 grid w-full gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-indigo-900/20 md:grid-cols-4 md:items-end"
          >
            <label className="text-sm text-slate-200">
              Recherche
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Nom, prénom ou email"
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              />
            </label>
            <label className="text-sm text-slate-200">
              Blessures
              <select
                name="injury"
                defaultValue={injuryFilter ?? ""}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              >
                <option value="">Toutes</option>
                <option value="active">Avec blessure active</option>
                <option value="none">Aucune blessure active</option>
              </select>
            </label>
            <label className="mt-1 inline-flex flex-wrap items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-200">
              <input
                type="checkbox"
                name="premium"
                value="true"
                defaultChecked={premiumOnly}
                key={premiumOnly ? "premium-only" : "all-students"}
                className="h-4 w-4 rounded border-white/20 bg-white/5"
              />
              Premium
            </label>
            <fieldset className="text-sm text-slate-200">
              <legend className="mb-1">Discipline</legend>
              <div className="flex flex-wrap gap-2">
                {disciplines.map((d: { name: string; color?: string }, idx: number) => (
                  <label
                    key={`${d.name}-${idx}`}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs text-slate-200"
                  >
                    <input
                      type="checkbox"
                      name="discipline"
                      value={d.name}
                      defaultChecked={disciplineFilters.includes(d.name)}
                      className="h-4 w-4 rounded border-white/20 bg-white/5"
                    />
                    <span
                      className="inline-flex h-3 w-3 rounded-full border border-white/20"
                      style={{ backgroundColor: d.color ?? undefined }}
                    />
                    {d.name}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="text-sm text-slate-200">
              Tri
              <select
                name="sort"
                defaultValue={sort}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              >
                <option value="name_asc">Nom (A→Z)</option>
                <option value="name_desc">Nom (Z→A)</option>
              </select>
            </label>
            <div className="md:col-span-4 flex flex-wrap items-center justify-end gap-2">
              <button
                type="submit"
                className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-400"
              >
                Filtrer
              </button>
              <Link
                href="/app/teacher/students"
                className="rounded-full border border-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
              >
                Réinitialiser
              </Link>
            </div>
          </form>
        </FilterPanel>
        <div className="flex flex-col divide-y divide-white/5">
          {students.map((student) => (
            <article
              key={student.id}
              className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between"
            >
              <div className="flex items-center gap-3">
                <SafeImage
                  src={student.avatarUrl?.trim() || STUDENT_AVATAR_PLACEHOLDER}
                  alt={`Avatar de ${student.name ?? student.email}`}
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-full border border-white/10 object-cover shadow"
                  fallbackSrc={STUDENT_AVATAR_PLACEHOLDER}
                />
                <div>
                  <p className="text-base font-semibold text-white">
                    {student.name ?? student.email}
                  </p>
                  <p className="text-sm text-slate-300">
                    {student.email} · {student.isPremium ? "Premium" : "Free"} · Âge :{" "}
                    {student.age ? `${student.age} ans` : "Non renseigné"}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-200">
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-semibold">
                      Vu : {student.progress.length}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-semibold">
                      Blessures actives : {student.injuries.filter((inj) => inj.isActive).length}
                    </span>
                    {student.isPremium && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/60 bg-amber-400/20 px-2.5 py-1 font-semibold text-amber-50">
                        Premium
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Link
                href={`/app/teacher/students/${student.id}?from=${encodeURIComponent(
                  `/app/teacher/students?page=${currentPage}`
                )}`}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
              >
                Voir la fiche
              </Link>
            </article>
          ))}
          {students.length === 0 && (
            <div className="mt-2 rounded-2xl border border-dashed border-white/15 bg-white/5 p-4 text-sm text-slate-200">
              Aucun élève trouvé pour cette école.
            </div>
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-200">
          <span>
            Page {currentPage} / {totalPages} · {totalCount} élèves
          </span>
          <div className="flex items-center gap-2">
            <Link
              href={`/app/teacher/students?page=${Math.max(1, currentPage - 1)}${
                qs ? `&${qs}` : ""
              }`}
              aria-disabled={currentPage === 1}
              className={`rounded-full border border-white/10 px-3 py-2 ${
                currentPage === 1
                  ? "cursor-not-allowed text-slate-500"
                  : "bg-white/5 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
              }`}
            >
              Précédent
            </Link>
            <Link
              href={`/app/teacher/students?page=${Math.min(totalPages, currentPage + 1)}${
                qs ? `&${qs}` : ""
              }`}
              aria-disabled={currentPage === totalPages}
              className={`rounded-full border border-white/10 px-3 py-2 ${
                currentPage === totalPages
                  ? "cursor-not-allowed text-slate-500"
                  : "bg-white/5 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
              }`}
            >
              Suivant
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
