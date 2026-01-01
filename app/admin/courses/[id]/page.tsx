import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateCourseSuggestions } from "@/lib/courseGenerator";
import { LocalDateTime } from "@/components/LocalDateTime";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { id: string } | Promise<{ id?: string }>;
  searchParams?: Promise<{ from?: string }>;
};

export default async function AdminCourseDetailPage({ params, searchParams }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const id = resolvedParams?.id;
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SCHOOL_ADMIN" || !session.user.schoolId) {
    redirect("/access-denied");
  }
  if (!id) {
    return notFound();
  }

  const course = await prisma.course.findFirst({
    where: { id, schoolId: session.user.schoolId },
    select: {
      id: true,
      title: true,
      date: true,
      durationMinutes: true,
      maxSeats: true,
      costCredits: true,
      waitlistQuota: true,
      discipline: true,
      photoUrl: true,
      isVirtual: true,
      teacher: { select: { id: true, name: true, email: true } },
      studio: { select: { name: true, address: true } },
      attendances: {
        include: { student: { select: { id: true, name: true, email: true } } },
      },
      positions: { include: { position: true } },
      notes: {
        include: {
          student: { select: { id: true, name: true, email: true } },
          position: true,
        },
      },
      _count: { select: { attendances: true } },
    },
  });

  if (!course) {
    return notFound();
  }

  const studentIds = course.attendances.map((a) => a.studentId).filter(Boolean);
  const suggestions =
    studentIds.length > 0
      ? await generateCourseSuggestions({
          courseId: course.id,
          schoolId: session.user.schoolId,
          studentIds,
          existingPositionIds: course.positions.map((p) => p.position.id),
        })
      : [];
  const storedRecommendations =
    (await prisma.courseRecommendation
      .findMany({
        where: { courseId: course.id },
      })
      .catch((error: unknown) => {
        const message = (error as Error)?.message ?? "";
        if (message.includes("CourseRecommendation") || message.includes("does not exist")) {
          return [];
        }
        throw error;
      })) ?? [];
  const recommendationByPosition = new Map(storedRecommendations.map((r) => [r.positionId, r]));
  const appliedCount = storedRecommendations.filter((r) => r.appliedAt).length;
  const forcedCount = storedRecommendations.filter((r) => r.forced).length;
  const excludedCount = storedRecommendations.filter((r) => r.excludedForInjury && !r.forced).length;

  const resolvedSearch = (await searchParams) ?? {};
  const rawFrom = resolvedSearch.from;
  const safeFrom = rawFrom && rawFrom.startsWith("/") && !rawFrom.startsWith("//") ? rawFrom : undefined;
  const backHref = safeFrom ?? "/admin";
  const formattedDate = new Date(course.date).toLocaleString("fr-FR", {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const teacherName = course.teacher?.name ?? course.teacher?.email ?? "Professeur";
  const cost = course.costCredits ?? 100;
  return (
    <main className="flex min-h-screen w-full flex-col gap-4">
      <header className="panel space-y-3 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Admin école</p>
            <h1 className="text-3xl font-semibold text-white">
              {course.title ?? "Cours"} ·{" "}
              <LocalDateTime
                iso={course.date.toISOString()}
                fallback={formattedDate}
                options={{
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                }}
              />
            </h1>
            <p className="text-sm text-slate-300">
              {teacherName} · {course.studio?.name ?? "Studio non renseigné"} · {course._count.attendances} élève(s) · {cost} crédits
            </p>
            {course.isVirtual && (
              <p className="mt-1 inline-flex items-center gap-2 rounded-full border border-amber-300/60 bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-100">
                Occurrence programmée : positions à définir (inscription élève bloquée)
              </p>
            )}
          </div>
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            ← Retour admin
          </Link>
        </div>
      </header>

      <section className="panel border-indigo-400/15 p-6">
        <h2 className="text-lg font-semibold text-white">Participants</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-200">
          {course.attendances.map((attendance) => (
            <li key={attendance.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <span className="font-semibold text-white">
                {attendance.student?.name ?? attendance.student?.email ?? "Élève"}
              </span>
              {attendance.student?.id && (
                <Link
                  href={`/teacher/students/${attendance.student.id}?from=/admin/courses/${course.id}`}
                  className="text-xs text-cyan-100 underline underline-offset-2"
                >
                  Fiche élève
                </Link>
              )}
            </li>
          ))}
          {course.attendances.length === 0 && <li className="text-slate-300">Aucun élève rattaché.</li>}
        </ul>
      </section>

      <section className="panel border-indigo-400/15 p-6">
        <h2 className="text-lg font-semibold text-white">Suggestions (générateur)</h2>
        <p className="text-sm text-slate-300">
          Basées sur la progression des élèves présents, en excluant les positions déjà planifiées ou trop récentes.
        </p>
        {storedRecommendations.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-white">
            <span className="rounded-full border border-emerald-300/60 bg-emerald-500/15 px-2 py-0.5">
              {appliedCount} appliquée{appliedCount > 1 ? "s" : ""}
            </span>
            <span className="rounded-full border border-amber-300/60 bg-amber-500/15 px-2 py-0.5">
              {forcedCount} forcée{forcedCount > 1 ? "s" : ""}
            </span>
            <span className="rounded-full border border-red-300/60 bg-red-500/15 px-2 py-0.5">
              {excludedCount} exclue{excludedCount > 1 ? "s" : ""} blessure
            </span>
          </div>
        )}
        {suggestions.length === 0 ? (
          <p className="mt-2 text-slate-300">Aucune suggestion disponible.</p>
        ) : (
          <ul className="mt-3 grid gap-2 md:grid-cols-2">
            {suggestions.map((s) => (
              <li
                key={s.positionId}
                className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-white"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{s.name}</span>
                  {s.type ? (
                    <span className="text-[11px] uppercase tracking-[0.12em] text-emerald-100">{s.type}</span>
                  ) : null}
                  {recommendationByPosition.get(s.positionId)?.appliedAt && (
                    <span className="rounded-full border border-emerald-300/60 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-50">
                      Appliqué
                    </span>
                  )}
                  {recommendationByPosition.get(s.positionId)?.forced && (
                    <span className="rounded-full border border-amber-300/60 bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-50">
                      Forcé
                    </span>
                  )}
                  {s.favoriteCount && s.favoriteCount > 0 ? (
                    <span className="rounded-full border border-pink-300/60 bg-pink-500/15 px-2 py-0.5 text-[11px] font-semibold text-pink-50">
                      {s.favoriteCount} cœur{s.favoriteCount > 1 ? "s" : ""}
                    </span>
                  ) : null}
                  {!s.excludedForInjury && s.attenuatedForInjury ? (
                    <span className="rounded-full border border-amber-300/60 bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-50">
                      Atténué (blessure)
                    </span>
                  ) : null}
                  {s.fallbackCategory ? (
                    <span className="rounded-full border border-slate-300/40 bg-slate-500/20 px-2 py-0.5 text-[11px] font-semibold text-slate-50">
                      Catégorie fallback
                    </span>
                  ) : null}
                  {s.unsoftenedChaining ? (
                    <span className="rounded-full border border-amber-300/60 bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-50">
                      Enchaînement non adouci
                    </span>
                  ) : null}
                  {recommendationByPosition.get(s.positionId)?.excludedForInjury && !recommendationByPosition.get(s.positionId)?.forced ? (
                    <span className="rounded-full border border-red-400/60 bg-red-600/15 px-2 py-0.5 text-[11px] font-semibold text-red-50">
                      Exclu blessure
                    </span>
                  ) : s.excludedForInjury ? (
                    <span className="rounded-full border border-red-400/60 bg-red-600/15 px-2 py-0.5 text-[11px] font-semibold text-red-50">
                      Exclu blessure
                    </span>
                  ) : null}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      s.tag === "DISCOVERY"
                        ? "border border-amber-300/60 bg-amber-500/15 text-amber-50"
                        : s.tag === "REVISION"
                          ? "border border-indigo-300/60 bg-indigo-500/15 text-indigo-50"
                          : "border border-emerald-300/60 bg-emerald-500/15 text-emerald-50"
                    }`}
                  >
                    {s.tag === "DISCOVERY" ? "Découverte" : s.tag === "REVISION" ? "Révision" : "Safe"}
                  </span>
                </div>
                <div className="text-xs text-emerald-50/80 space-y-1">
                  <p className="font-semibold text-indigo-100">Pourquoi ?</p>
                  <p>{s.reason}</p>
                  {!s.excludedForInjury && s.attenuatedForInjury && (
                    <p className="text-amber-100">Compatibilité blessure réduite (priorité moindre).</p>
                  )}
                  {(s.fallbackCategory || s.unsoftenedChaining) && (
                    <p className="text-slate-200">
                      {s.fallbackCategory ? "Placé en fallback de catégorie. " : ""}
                      {s.unsoftenedChaining ? "Pas de transition disponible entre les mouvements précédents." : ""}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel border-indigo-400/15 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-white">Notes (admin)</h2>
            <p className="text-sm text-slate-300">Consultation rapide. Édition via l’écran d’édition du cours.</p>
          </div>
          <Link
            href={`/teacher/courses/${course.id}/edit?from=/admin/courses/${course.id}`}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-emerald-300/70 hover:bg-white/10"
          >
            Éditer les notes
          </Link>
        </div>
        {course.notes.length === 0 ? (
          <p className="mt-2 text-slate-300">Aucune note pour ce cours.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm text-slate-200">
            {course.notes.map((note) => (
              <li key={note.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-white">
                      {note.student?.name ?? note.student?.email ?? "Élève"}
                    </p>
                    <p className="text-xs text-slate-300">{note.position.name}</p>
                  </div>
                  <span className="text-xs uppercase tracking-[0.12em] text-emerald-200">
                    {note.learningStatus ?? "(non renseigné)"}
                  </span>
                </div>
                {note.comment && <p className="mt-1 text-slate-300">{note.comment}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
