import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { Prisma } from "@prisma/client";
import { FilterPanel } from "@/components/FilterPanel";
import { SafeImage } from "@/components/SafeImage";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { COURSE_PLACEHOLDER } from "@/lib/placeholders";

export const dynamic = "force-dynamic";

type PageProps =
  | { params: { id: string }; searchParams?: Promise<Record<string, string | string[] | undefined>> }
  | { params: Promise<{ id?: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function StudioPage({ params, searchParams }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const studioId = resolvedParams?.id;
  if (!studioId) redirect("/access-denied");

  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const userRole = session.user.role;

  const resolvedSearch = (await Promise.resolve(searchParams)) ?? {};
  const qRaw = resolvedSearch?.q;
  const pageRaw = resolvedSearch?.page;
  const q = typeof qRaw === "string" ? qRaw.trim() : "";
  const currentPage = Math.max(1, Number.isFinite(Number(pageRaw)) ? Number(pageRaw) : 1);
  const pageSize = 5;

  const where = {
    studioId,
    ...(q
      ? {
          title: { contains: q, mode: "insensitive" as Prisma.QueryMode },
        }
      : {}),
  };

  const totalCount = await prisma.course.count({ where });

  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    include: {
      school: { select: { id: true, name: true } },
      courses: {
        orderBy: { date: "asc" },
        skip: (currentPage - 1) * pageSize,
        take: pageSize,
        where,
        include: {
          teacher: { select: { id: true, name: true, email: true } },
          _count: { select: { attendances: true, positions: true, notes: true } },
        },
      },
    },
  });

  if (!studio || (session.user.schoolId && studio.school?.id && studio.school.id !== session.user.schoolId)) {
    redirect("/access-denied");
  }

  const isAdmin = userRole === "SCHOOL_ADMIN";
  const schoolName = studio.school?.name ?? "École";
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const returnHref =
    userRole === "SCHOOL_ADMIN"
      ? "/app/admin/studios"
      : userRole === "TEACHER"
        ? "/app/teacher/school"
        : "/app/student/school";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-3 px-0 py-6 md:gap-6 md:px-8 md:py-10">
      <header className="panel p-4 md:p-6">
        <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Studio</p>
        <h1 className="text-3xl font-semibold text-white">{studio.name}</h1>
        <p className="text-sm text-slate-300">École : {schoolName}</p>
        {studio.address && (
          <p className="text-sm text-slate-200">
            Adresse :{" "}
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(studio.address)}`}
              target="_blank"
              rel="noreferrer"
              className="text-cyan-200 underline underline-offset-2 transition hover:text-cyan-100"
            >
              {studio.address}
            </a>
          </p>
        )}
        <div className="mt-3 flex flex-wrap justify-end gap-2 text-sm">
          <Link
            href={returnHref}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            ← Retour
          </Link>
          {isAdmin && (
            <Link
              href="/app/admin/studios"
              className="rounded-full border border-amber-400/60 bg-white/5 px-3 py-1.5 font-semibold text-white transition hover:border-amber-300/80 hover:bg-white/10"
            >
              Éditer (admin)
            </Link>
          )}
        </div>
      </header>

      <section className="panel p-4 md:p-6">
        <h2 className="text-lg font-semibold text-white">Cours à venir</h2>
        <div className="mt-3">
          <FilterPanel
            storageKey={`filters:studio:${studioId}:courses`}
            title="Filtres"
            className="group w-full"
            contentClassName="mt-3"
          >
            <form method="get" className="space-y-3">
              <label className="block text-sm text-slate-200">
                Recherche (titre)
                <input
                  type="text"
                  name="q"
                  defaultValue={q}
                  placeholder="Titre du cours"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
                />
              </label>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="submit"
                  className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-400"
                >
                  Filtrer
                </button>
                <Link
                  href={`/app/school/${studioId}`}
                  className="rounded-full border border-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
                >
                  Réinitialiser
                </Link>
              </div>
            </form>
          </FilterPanel>
        </div>
        {studio.courses.length === 0 ? (
          <p className="mt-2 text-sm text-slate-300">Aucun cours associé pour le moment.</p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-white/5">
            {studio.courses.map((course) => {
              const courseDate = new Date(course.date);
              const seatsUsed = course._count?.attendances ?? 0;
              const remainingSeats = (course.maxSeats ?? 30) - seatsUsed;
              const formattedDate = courseDate.toLocaleString("fr-FR", {
                hour12: false,
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              });
              return (
                <li key={course.id} className="block py-4 first:pt-0 last:pb-0">
                  <article className="flex flex-col gap-3 px-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/20 bg-white/10 text-[9px] font-semibold text-slate-300">
                        ●
                      </span>
                      <h3 className="text-xl font-semibold text-white md:text-2xl">
                        {course.title ?? "Cours"}
                      </h3>
                    </div>
                    <div className="flex flex-wrap items-start gap-3 md:flex-nowrap">
                      <SafeImage
                        src={course.photoUrl?.trim() || COURSE_PLACEHOLDER}
                        alt={course.title ?? "Cours"}
                        width={96}
                        height={64}
                        className="h-16 w-24 rounded-lg border border-white/10 object-cover shadow"
                        fallbackSrc={COURSE_PLACEHOLDER}
                      />
                      <div className="min-w-[220px] flex-1 space-y-1">
                        <p className="flex flex-wrap items-center gap-2 text-sm text-slate-200">
                          {course.teacher?.name ?? course.teacher?.email ?? "Professeur"}
                          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-cyan-100">
                            Studio · {studio.name}
                          </span>
                        </p>
                        <div className="space-y-1 text-sm text-slate-300">
                          <p>
                            {formattedDate} · Durée : {course.durationMinutes ?? 60} min
                          </p>
                          <p>
                            {remainingSeats} place(s) restante(s) / {course.maxSeats ?? 30}
                            {typeof course.costCredits === "number" ? ` · ${course.costCredits} crédits` : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-sm font-semibold text-slate-200">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>{seatsUsed} élèves</span>
                        <span>· {course._count?.positions ?? 0} positions</span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[11px] font-semibold text-white">
                          Notes : {course._count?.notes ?? 0}
                        </span>
                      </div>
                      <Link
                        href={`${
                          userRole === "STUDENT"
                            ? "/app/student/courses"
                            : "/app/teacher/courses"
                        }/${course.id}?from=/app/school/${studio.id}`}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
                      >
                        Voir le cours →
                      </Link>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm text-slate-200">
            <Link
              href={`/app/school/${studioId}?page=${Math.max(1, currentPage - 1)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`rounded-full px-3 py-2 font-semibold ${
                currentPage === 1
                  ? "cursor-not-allowed border border-white/10 text-slate-500"
                  : "border border-white/10 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
              }`}
              aria-disabled={currentPage === 1}
            >
              Précédent
            </Link>
            <span>
              Page {currentPage} / {totalPages}
            </span>
            <Link
              href={`/app/school/${studioId}?page=${Math.min(totalPages, currentPage + 1)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`rounded-full px-3 py-2 font-semibold ${
                currentPage === totalPages
                  ? "cursor-not-allowed border border-white/10 text-slate-500"
                  : "border border-white/10 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
              }`}
              aria-disabled={currentPage === totalPages}
            >
              Suivant
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
