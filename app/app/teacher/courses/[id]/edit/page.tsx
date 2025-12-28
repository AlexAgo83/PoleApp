import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { CourseForm } from "../../new/CourseForm";
import { deleteCourseAction, updateCourseAction } from "../actions";

type Props = {
  params: { id: string } | Promise<{ id?: string }>;
  searchParams?: Promise<{ from?: string }>;
};

export default async function EditCoursePage({ params, searchParams }: Props) {
  const resolvedParams = await Promise.resolve(params);
  const id = resolvedParams?.id;
  const session = await getServerSession(authOptions);
  const teacherId = session?.user?.id;
  const schoolId = session?.user?.schoolId;
  const role = session?.user?.role;
  if (!teacherId || !schoolId || (role !== "TEACHER" && role !== "SCHOOL_ADMIN")) {
    redirect("/access-denied");
  }

  if (!id) {
    notFound();
  }

  const course = await prisma.course.findFirst({
    where: { id, schoolId },
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
      teacherId: true,
      studioId: true,
      isVirtual: true,
      attendances: true,
      positions: { include: { position: true } },
      notes: true,
    },
  });
  if (!course) {
    notFound();
  }

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

  const [students, positions, teachers, studios, progresses, disciplinesRaw, courseDisciplines, teacherFavoritesRows] = await Promise.all([
    prisma.user.findMany({
      where: { schoolId, role: "STUDENT" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.position.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true, discipline: true },
    }),
    role === "SCHOOL_ADMIN"
      ? prisma.user.findMany({
          where: { schoolId, role: "TEACHER" },
          select: { id: true, name: true, email: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    prisma.studio.findMany({
      where: { schoolId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.studentPositionProgress.findMany({
      where: { student: { schoolId } },
      select: {
        studentId: true,
        positionId: true,
        masteryLevel: true,
        learningStatus: true,
        position: { select: { name: true, type: true } },
      },
    }),
    prisma.discipline.findMany({
      where: { schoolId },
      select: { name: true, color: true },
      orderBy: { name: "asc" },
    }),
    prisma.course.findMany({
      where: { schoolId },
      select: { discipline: true },
      distinct: ["discipline"],
    }),
    prisma.teacherFavoritePosition.findMany({
      where: {
        teacherId: {
          in: [teacherId, course.teacherId].filter(Boolean) as string[],
        },
      },
      select: { teacherId: true, positionId: true },
    }),
  ]);
  const fallbackDisciplines = [
    { name: "Danse" },
    { name: "Pole" },
    { name: "Exotic" },
    { name: "Souplesse" },
    { name: "Pilates" },
  ];
  const mergedDisciplines = (() => {
    const rows = (disciplinesRaw ?? []).map((d) => ({ ...d }));
    const legacy = courseDisciplines
      .map((c) => c.discipline)
      .filter((d): d is string => Boolean(d && d.trim().length > 0))
      .map((d) => ({ name: d.trim(), color: undefined as string | undefined }));
    const merged: { name: string; color?: string; id?: string }[] = [...rows];
    legacy.forEach((d) => {
      if (!merged.some((m) => m.name.toLowerCase() === d.name.toLowerCase())) {
        merged.push(d);
      }
    });
    if (
      course.discipline &&
      !merged.some((m) => m.name.toLowerCase() === course.discipline.toLowerCase())
    ) {
      merged.push({ name: course.discipline });
    }
    return merged.length > 0 ? merged : fallbackDisciplines;
  })();
  const studentsWithActiveInjury = (await prisma.studentInjury.findMany({
    where: { studentId: { in: students.map((s) => s.id) }, isActive: true },
    select: { studentId: true },
  })).reduce<Record<string, number>>((acc, row) => {
    acc[row.studentId] = (acc[row.studentId] ?? 0) + 1;
    return acc;
  }, {});

  const defaultSelectedStudents = course.attendances.map((a) => a.studentId);
  const defaultSelectedPositions = course.positions.map((p) => p.positionId);
  const defaultNotes = course.notes.reduce<Record<string, { studentId: string; positionId: string; masteryLevel?: string; comment?: string }>>(
    (acc, n) => {
      const key = `${n.studentId}-${n.positionId}`;
      acc[key] = {
        studentId: n.studentId,
        positionId: n.positionId,
        masteryLevel: n.masteryLevel ?? undefined,
        comment: n.comment ?? undefined,
      };
      return acc;
    },
    {}
  );

  // Preserve local date/time in the datetime-local input (avoid UTC shift)
  const dateObj = new Date(course.date);
  const pad = (n: number) => n.toString().padStart(2, "0");
  const defaultDate = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(
    dateObj.getDate()
  )}T${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`;
  const resolvedSearch = (await searchParams) ?? {};
  const rawFrom = resolvedSearch.from;
  const safeFrom =
    rawFrom && rawFrom.startsWith("/") && !rawFrom.startsWith("//")
      ? rawFrom
      : undefined;
  const backHref = safeFrom ?? `/app/teacher/courses/${course.id}`;

  return (
    <main className="flex min-h-screen w-full flex-col gap-4">
      <header className="panel p-6">
        <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">
          Professeur / Admin
        </p>
        <h1 className="text-3xl font-semibold text-white">Éditer le cours</h1>
        <p className="text-sm text-slate-300">
          Mets à jour la date, les élèves, les positions et les notes pour ce cours.
        </p>
      </header>

      {storedRecommendations.length > 0 && (
        <section className="panel border-indigo-400/15 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-white">État générateur (suggestions)</h2>
              <p className="text-sm text-slate-300">Récap des suggestions appliquées/forcées/exclues pour ce cours.</p>
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
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {course.positions.map((p) => {
              const rec = recommendationByPosition.get(p.positionId);
              if (!rec) return null;
              return (
                <div
                  key={p.positionId}
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                >
                  <span className="font-semibold">{p.position.name}</span>
                  {rec.appliedAt && (
                    <span className="rounded-full border border-emerald-300/60 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-50">
                      Appliqué
                    </span>
                  )}
                  {rec.forced && (
                    <span className="rounded-full border border-amber-300/60 bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-50">
                      Forcé
                    </span>
                  )}
                  {rec.excludedForInjury && !rec.forced && (
                    <span className="rounded-full border border-red-300/60 bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold text-red-50">
                      Exclu blessure
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="panel p-6">
        <CourseForm
          students={students}
          positions={positions}
          action={updateCourseAction}
          defaultTitle={course.title}
          defaultDate={defaultDate}
          defaultSelectedStudents={defaultSelectedStudents}
          defaultSelectedPositions={defaultSelectedPositions}
          defaultNotes={defaultNotes}
          submitLabel="Mettre à jour"
          cancelHref={backHref}
          courseId={course.id}
          teachers={role === "SCHOOL_ADMIN" ? teachers : []}
          defaultTeacherId={course.teacherId ?? teacherId}
          studios={studios}
          defaultStudioId={course.studioId ?? null}
          defaultDurationMinutes={course.durationMinutes ?? 60}
          defaultMaxSeats={course.maxSeats ?? 30}
          defaultWaitlistQuota={course.waitlistQuota ?? 0}
          defaultCostCredits={course.costCredits ?? 100}
          defaultPhotoUrl={course.photoUrl ?? ""}
          defaultDiscipline={course.discipline ?? ""}
          disciplines={mergedDisciplines}
          teacherFavorites={teacherFavoritesRows.reduce<Record<string, string[]>>((acc, row) => {
            if (!acc[row.teacherId]) acc[row.teacherId] = [];
            acc[row.teacherId].push(row.positionId);
            return acc;
          }, {})}
          studentsWithActiveInjury={studentsWithActiveInjury}
          progressByStudent={progresses.map((p) => ({
            studentId: p.studentId,
            positionId: p.positionId,
            masteryLevel: p.masteryLevel,
            learningStatus: p.learningStatus,
            positionName: p.position.name,
            positionType: p.position.type,
          }))}
          isVirtual={course.isVirtual}
        />
      </section>

      <section className="panel border-red-500/30 bg-red-500/5 p-6">
        <h2 className="text-lg font-semibold text-white">Supprimer ce cours</h2>
        <p className="text-sm text-slate-200">
          Action irréversible. Les présences, positions et notes liées seront supprimées.
        </p>
        <form action={deleteCourseAction} className="mt-4">
          <input type="hidden" name="courseId" value={course.id} />
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400"
          >
            Supprimer
          </button>
        </form>
      </section>
    </main>
  );
}
