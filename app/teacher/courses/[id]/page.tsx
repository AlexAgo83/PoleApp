import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { COURSE_PLACEHOLDER } from "@/lib/placeholders";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateCourseSuggestions } from "@/lib/courseGenerator";
import { applySuggestedPositionsAction, updateCourseNotesOnlyAction } from "./actions";
import { LearningStatus } from "@prisma/client";
import { ShareLinkButton } from "@/components/ShareLinkButton";
import { LocalDateTime } from "@/components/LocalDateTime";
import { ProgressSlider } from "../../students/[id]/ProgressSlider";

const COURSE_PHOTO_PLACEHOLDER = COURSE_PLACEHOLDER;
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? process.env.CLOUDINARY_CLOUD_NAME;

function formatDuration(minutes: number) {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0) {
    return `${hrs}h${mins.toString().padStart(2, "0")}`;
  }
  return `${mins} min`;
}

type PageProps = {
  params: { id: string } | Promise<{ id?: string }>;
  searchParams?: Promise<{ from?: string; applied?: string; forceDiscovery?: string }>;
};

export const dynamic = "force-dynamic";

export default async function TeacherCourseDetailPage({
  params,
  searchParams,
}: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const id = resolvedParams?.id;
  const session = await getServerSession(authOptions);
  if (!session?.user?.schoolId) {
    return notFound();
  }

  if (!id) {
    return notFound();
  }

  const course = await prisma.course
    .findUnique({
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
        disciplineId: true,
        photoPublicId: true,
        isVirtual: true,
        teacher: { select: { name: true, email: true } },
        studio: { select: { name: true, address: true } },
        attendances: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                email: true,
                injuries: { where: { isActive: true }, select: { id: true } },
              },
            },
          },
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
    })
    .catch((error) => {
      const message = (error as Error)?.message ?? "";
      const missingColumns =
        message.includes("maxSeats") || message.includes("costCredits");
      if (missingColumns) {
        return prisma.course.findUnique({
          where: { id, ...(session.user.schoolId ? { schoolId: session.user.schoolId } : {}) },
          include: {
            teacher: { select: { name: true, email: true } },
            studio: { select: { name: true, address: true } },
            attendances: {
              include: {
                student: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    injuries: { where: { isActive: true }, select: { id: true } },
                  },
                },
              },
            },
            positions: { include: { position: true } },
            notes: {
              include: {
                student: { select: { name: true, email: true } },
                position: true,
              },
            },
            _count: { select: { attendances: true } },
          },
        });
      }
      throw error;
  });

  if (!course) {
    return notFound();
  }
  const disciplineName =
    course.disciplineId
      ? (
          await prisma.discipline.findFirst({
            where: { id: course.disciplineId },
            select: { name: true },
          })
        )?.name ?? course.discipline ?? null
      : course.discipline ?? null;

  const resolvedSearch = (await searchParams) ?? {};
  const forceDiscovery = resolvedSearch.forceDiscovery === "1";

  const studentIds = course.attendances.map((a) => a.studentId).filter(Boolean);
  const suggestions =
    studentIds.length > 0
      ? await generateCourseSuggestions({
          courseId: course.id,
          schoolId: session.user.schoolId,
          studentIds,
          existingPositionIds: course.positions.map((p) => p.position.id),
          forceDiscoverySlot: forceDiscovery,
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
  const appliedBadge = new Set(
    storedRecommendations.filter((r) => r.appliedAt).map((r) => r.positionId)
  );
  const recommendationByPosition = new Map(
    storedRecommendations.map((r) => [r.positionId, r])
  );
  const recommendationState = new Map(
    storedRecommendations.map((r) => [r.positionId, r])
  );
  const appliedCount = storedRecommendations.filter((r) => r.appliedAt).length;
  const forcedCount = storedRecommendations.filter((r) => r.forced).length;
  const excludedCount = storedRecommendations.filter((r) => r.excludedForInjury && !r.forced).length;
  const statusMap = new Map(
    course.notes.map((n) => [`${n.studentId}-${n.positionId}`, n.learningStatus ?? LearningStatus.NOT_STARTED]),
  );

  const teacherName =
    course.teacher?.name ?? course.teacher?.email ?? "Professeur";
  const rawFrom = resolvedSearch.from;
  const safeFrom =
    rawFrom && rawFrom.startsWith("/") && !rawFrom.startsWith("//")
      ? rawFrom
      : undefined;
  const baseHref = `/teacher/courses/${course.id}`;
  const successToast = resolvedSearch.applied === "1";
  const currentPath = `${baseHref}${
    safeFrom ? `?from=${encodeURIComponent(safeFrom)}` : ""
  }`;
  const seatsUsed = course._count?.attendances ?? 0;
  const remainingSeats = (course.maxSeats ?? 30) - seatsUsed;
  const cost = course.costCredits ?? 100;
  const coursePhoto =
    course.photoPublicId && CLOUD_NAME
      ? `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${course.photoPublicId}`
      : COURSE_PHOTO_PLACEHOLDER;
  const NOW_MS = Date.now();
  const formattedDate = new Date(course.date).toLocaleString("fr-FR", {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const icsHref = `/api/courses/${course.id}/ics`;
  const sharePath = `/teacher/courses/${course.id}`;
  const isPastCourse = new Date(course.date).getTime() + (course.durationMinutes ?? 60) * 60_000 < NOW_MS;
  const headerBgStyle = {
    backgroundImage: `linear-gradient(135deg, rgba(10,15,30,0.88), rgba(15,25,45,0.72)), url(${coursePhoto})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };

  return (
    <main className="flex min-h-screen w-full flex-col gap-4">
      <header
        className="panel relative space-y-4 overflow-hidden border-indigo-400/25 p-6 shadow-indigo-900/30"
        style={headerBgStyle}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-3 md:w-2/3">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-semibold text-white">
                  {course.title ?? "Cours sans titre"}
                </h1>
                <Link
                  href={`/teacher/courses/${course.id}/edit${
                    safeFrom ? `?from=${encodeURIComponent(safeFrom)}` : ""
                  }`}
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white transition hover:border-indigo-300/70 hover:bg-white/10"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/gear.svg" alt="" className="h-3.5 w-3.5" />
                  Éditer
                </Link>
                {course.notes.length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-1 text-xs font-semibold text-white">
                    Notes : {course.notes.length}
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-1 text-sm text-slate-200">
              <p className="text-base text-white flex flex-wrap items-center gap-2">
                <span>{teacherName}</span>
                {disciplineName && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-cyan-300/60 bg-cyan-500/15 px-3 py-1 text-xs font-semibold text-cyan-100">
                    {disciplineName}
                  </span>
                )}
              </p>
              <p className="flex flex-wrap items-center gap-1">
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
                <span className="mx-1">·</span>
                Durée : {formatDuration(course.durationMinutes ?? 60)}
              </p>
              <p>
                {remainingSeats} place(s) restante(s) / {course.maxSeats ?? 30} · {cost} crédits
              </p>
              {course.studio && (
                <p className="text-slate-300">
                  Studio : {course.studio.name}
                  {course.studio.address ? ` — ${course.studio.address}` : ""}
                </p>
              )}
            </div>
          </div>
          <div className="flex w-full flex-col items-end gap-2 md:w-auto md:self-end">
            {course.isVirtual && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/60 bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-100">
                Occurrence programmée
              </span>
            )}
            <div className="flex w-full flex-wrap items-center justify-end gap-3 md:flex-nowrap">
              <ShareLinkButton
                path={sharePath}
                className="shrink-0 whitespace-nowrap px-4 py-2.5 text-sm font-semibold"
              />
              <Link
                href={icsHref}
                prefetch={false}
                className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-cyan-300/40 bg-cyan-500/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200/70 hover:bg-cyan-500/20"
              >
                Ajouter à mon agenda
              </Link>
            </div>
          </div>
        </div>
      </header>

      <section className="panel border-indigo-400/15 p-6">
        <h2 className="text-lg font-semibold text-white">Positions</h2>
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          {course.positions.map((cp) => (
            <li
              key={cp.id}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-slate-200"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link
                  href={`/positions/${cp.position.id}`}
                  className="font-semibold text-white underline-offset-4 transition hover:text-cyan-200 hover:underline"
                >
                  {cp.position.name}
                </Link>
                <div className="flex flex-wrap items-center gap-2">
                  {cp.position.type ? (
                    <span className="text-xs uppercase tracking-[0.12em] text-cyan-200">
                      {cp.position.type}
                    </span>
                  ) : null}
                  {appliedBadge.has(cp.position.id) && (
                    <span className="rounded-full border border-emerald-300/60 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-50">
                      Appliqué
                    </span>
                  )}
                  {recommendationByPosition.get(cp.position.id)?.forced && (
                    <span className="rounded-full border border-amber-300/60 bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-50">
                      Forcé
                    </span>
                  )}
                  {recommendationByPosition.get(cp.position.id)?.excludedForInjury && (
                    <span className="rounded-full border border-red-300/60 bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold text-red-50">
                      Exclu blessure
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
          {course.positions.length === 0 && (
            <li className="text-slate-300">Aucune position associée.</li>
          )}
        </ul>
      </section>

      <section className="panel border-indigo-400/15 p-6">
        <h2 className="text-lg font-semibold text-white">Participants</h2>
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          {course.attendances.map((attendance) => {
            const hasActiveInjury = (attendance.student?.injuries?.length ?? 0) > 0;
            return (
              <li
                key={attendance.id}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-slate-200"
              >
                {attendance.student?.id ? (
                  <Link
                    href={`/teacher/students/${attendance.student.id}?from=${encodeURIComponent(currentPath)}`}
                    className="inline-flex items-center gap-2 text-white underline-offset-4 hover:underline"
                  >
                    {attendance.student?.name ?? attendance.student?.email ?? "Élève"}
                    {hasActiveInjury && (
                      <span
                        className="inline-flex h-2.5 w-2.5 items-center justify-center rounded-full border border-amber-300/70 bg-amber-500/80 text-[10px]"
                        title="Blessure active"
                        aria-label="Blessure active"
                      />
                    )}
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    {attendance.student?.name ?? attendance.student?.email ?? "Élève"}
                    {hasActiveInjury && (
                      <span
                        className="inline-flex h-2.5 w-2.5 items-center justify-center rounded-full border border-amber-300/70 bg-amber-500/80 text-[10px]"
                        title="Blessure active"
                        aria-label="Blessure active"
                      />
                    )}
                  </span>
                )}
              </li>
            );
          })}
          {course.attendances.length === 0 && (
            <li className="text-slate-300">Aucun élève rattaché.</li>
          )}
        </ul>
      </section>

      <section className="panel space-y-4 border-indigo-300/20 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-indigo-100">Niveaux par élève</p>
            <h2 className="text-lg font-semibold text-white">Tricks et niveaux atteints</h2>
            <p className="text-sm text-slate-300">
              Pour chaque élève inscrit, renseigne le niveau atteint sur les positions du cours.
            </p>
          </div>
        </div>
        {course.attendances.length === 0 || course.positions.length === 0 ? (
          <p className="text-sm text-slate-300">
            Ajoute des élèves et des positions au cours pour renseigner les niveaux.
          </p>
        ) : (
          <form action={updateCourseNotesOnlyAction} className="space-y-4">
            <input type="hidden" name="courseId" value={course.id} />
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5">
              <table className="min-w-full text-sm text-slate-200">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.12em] text-indigo-100">
                    <th className="px-3 py-2">Élève</th>
                    {course.positions.map((p) => (
                      <th key={p.position.id} className="px-3 py-2">
                        {p.position.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {course.attendances.map((att) => (
                    <tr key={att.id} className="border-b border-white/5">
                      <td className="px-3 py-3 font-semibold text-white">
                        {att.student?.name ?? att.student?.email ?? "Élève"}
                      </td>
                      {course.positions.map((p) => {
                        const key = `${att.studentId}-${p.position.id}`;
                        const current = statusMap.get(key) ?? LearningStatus.NOT_STARTED;
                        return (
                          <td key={p.position.id} className="px-3 py-2 align-top">
                            <ProgressSlider
                              name={`note:${att.studentId}:${p.position.id}`}
                              defaultValue={current}
                              hideLabel
                              hideValue
                              tone="neutral"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full border border-cyan-400/60 bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-300/70 hover:bg-cyan-500/30"
              >
                Sauvegarder les niveaux
              </button>
            </div>
          </form>
        )}
      </section>

      {!isPastCourse && (
      <section className="panel border-indigo-400/15 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-white">Suggestions (générateur)</h2>
            <p className="text-sm text-slate-300">
              Propositions basées sur la progression des élèves présents, en évitant les positions déjà planifiées et récentes.
            </p>
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
          </div>
          <div className="flex items-center gap-2">
            <form action={currentPath} method="get" className="inline-flex items-center gap-2">
              {safeFrom ? <input type="hidden" name="from" value={safeFrom} /> : null}
              <input type="hidden" name="forceDiscovery" value={forceDiscovery ? "1" : "0"} />
              <button
                type="submit"
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
              >
                Régénérer
              </button>
            </form>
            <form action={currentPath} method="get" className="inline-flex items-center gap-2">
              {safeFrom ? <input type="hidden" name="from" value={safeFrom} /> : null}
              <input type="hidden" name="forceDiscovery" value={forceDiscovery ? "0" : "1"} />
              <button
                type="submit"
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
              >
                {forceDiscovery ? "Slot découverte auto" : "Forcer 1 découverte"}
              </button>
            </form>
          </div>
        </div>
        {suggestions.length === 0 ? (
          <p className="mt-2 text-slate-300">Aucune suggestion disponible (ajoutez des élèves ou des positions).</p>
        ) : (
          <form action={applySuggestedPositionsAction} className="mt-4 space-y-3">
            <input type="hidden" name="courseId" value={course.id} />
            <input type="hidden" name="suggestions" value={JSON.stringify(suggestions)} />
            <div className="grid gap-2 md:grid-cols-2">
              {suggestions.map((s) => {
                const persisted = recommendationState.get(s.positionId);
                return (
                  <label
                    key={s.positionId}
                    className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                  >
                    <div className="flex flex-col gap-2">
                      <input
                        type="checkbox"
                        name="positionIds"
                        value={s.positionId}
                        defaultChecked={!s.excludedForInjury}
                        className="mt-1 h-4 w-4"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{s.name}</span>
                        {persisted?.appliedAt && (
                          <span className="rounded-full border border-emerald-300/60 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-50">
                            Appliqué
                          </span>
                        )}
                        {persisted?.forced && (
                          <span className="rounded-full border border-amber-300/60 bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-50">
                            Forcé
                          </span>
                        )}
                        {persisted?.excludedForInjury && !persisted?.forced && (
                          <span className="rounded-full border border-red-300/60 bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold text-red-50">
                            Exclu blessure
                          </span>
                        )}
                        {s.type ? (
                          <span className="text-[11px] uppercase tracking-[0.12em] text-cyan-100">{s.type}</span>
                        ) : null}
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
                        {s.excludedForInjury && !persisted?.forced ? (
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
                      <p className="text-xs text-slate-300">{s.reason}</p>
                      {s.excludedForInjury && s.unsafeInjuries && s.unsafeInjuries.length > 0 && (
                        <p className="text-xs text-rose-200 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full border border-red-300/60 bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold text-red-50">
                            ⚠️ Exclu blessure
                          </span>
                          Incompatible : {s.unsafeInjuries.join(", ")}
                        </p>
                      )}
                      <div className="text-xs text-slate-200 space-y-1">
                        <p className="font-semibold text-indigo-100">Pourquoi ?</p>
                        <p className="text-slate-300">{s.reason}</p>
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
                      {s.excludedForInjury && (
                        <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-amber-50">
                          <input type="checkbox" name="forcePositionIds" value={s.positionId} className="h-4 w-4" />
                          <span>Forcer quand même</span>
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="submit"
                className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-400"
                >
                  Valider ces positions
                </button>
                <Link
                  href={`/teacher/courses/${course.id}/edit?from=${encodeURIComponent(currentPath)}`}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
                >
                  Ajuster dans l’édition
                </Link>
              </div>
          </form>
        )}
      </section>
      )}
      {successToast && (
        <div className="fixed bottom-4 right-4 z-20 rounded-xl border border-emerald-300/50 bg-emerald-600/80 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/40">
          Suggestions appliquées au cours.
        </div>
      )}

      <section className="panel border-indigo-400/15 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-white">Notes</h2>
            <p className="text-sm text-slate-300">Niveaux/commentaires saisis pendant/avant cours.</p>
          </div>
          <Link
            href={`/teacher/courses/${course.id}/edit?from=${encodeURIComponent(currentPath)}`}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            Éditer les notes
          </Link>
        </div>
        {course.notes.length === 0 ? (
          <p className="mt-2 text-slate-300">Aucune note pour ce cours.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm text-slate-200">
            {course.notes.map((note) => (
              <li
                key={note.id}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-white">
                      {(note.student as { id?: string | null } | null | undefined)?.id ? (
                        <Link
                          href={`/teacher/students/${(note.student as { id: string }).id}?from=${encodeURIComponent(currentPath)}`}
                          className="underline-offset-4 hover:underline"
                        >
                          {note.student?.name ?? note.student?.email ?? "Élève"}
                        </Link>
                      ) : (
                        note.student?.name ?? note.student?.email ?? "Élève"
                      )}
                    </p>
                    <p className="text-xs text-slate-300">
                      {note.position.name}
                    </p>
                  </div>
                  <span className="text-xs uppercase tracking-[0.12em] text-cyan-200">
                    {note.learningStatus ?? "(non renseigné)"}
                  </span>
                </div>
                {note.comment && (
                  <p className="mt-1 text-slate-300">{note.comment}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
