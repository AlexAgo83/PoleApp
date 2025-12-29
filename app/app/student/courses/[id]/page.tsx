import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { COURSE_PLACEHOLDER } from "@/lib/placeholders";
import { purchaseCourseAction } from "../actions";
import { LocalDateTime } from "@/components/LocalDateTime";
import { ShareLinkButton } from "@/components/ShareLinkButton";

const NOW_MS = Date.now();

function formatDuration(minutes: number) {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0) {
    return `${hrs}h${mins.toString().padStart(2, "0")}`;
  }
  return `${mins} min`;
}

type PageProps =
  | { params: { id: string }; searchParams?: Promise<{ from?: string }> }
  | { params: Promise<{ id?: string }>; searchParams?: Promise<{ from?: string }> };

export const dynamic = "force-dynamic";

export default async function StudentCourseDetailPage({
  params,
  searchParams,
}: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const id = resolvedParams?.id;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return notFound();
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { credits: true, schoolId: true },
  });
  if (!user?.schoolId) {
    return notFound();
  }

  if (!id || !session.user.schoolId) {
    return notFound();
  }

  const course = await prisma.course
    .findUnique({
      where: {
        id,
        schoolId: user.schoolId,
      },
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
        school: { select: { name: true } },
        teacher: { select: { id: true, name: true, email: true } },
        studio: { select: { name: true, address: true } },
        positions: { include: { position: true } },
        notes: {
          where: { studentId: session.user.id },
          include: { position: true },
        },
        attendances: {
          where: { studentId: session.user.id },
          select: { id: true, status: true, waitlistRank: true },
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
        school: { select: { name: true } },
        teacher: { select: { id: true, name: true, email: true } },
        studio: { select: { name: true, address: true } },
        positions: { include: { position: true } },
        notes: {
          where: { studentId: session.user.id },
          include: { position: true },
        },
        attendances: {
          where: { studentId: session.user.id },
          select: { id: true, status: true, waitlistRank: true },
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

  const resolvedSearch = (await searchParams) ?? {};
  const rawFrom = resolvedSearch.from;
  const safeFrom =
    rawFrom && rawFrom.startsWith("/") && !rawFrom.startsWith("//")
      ? rawFrom
      : undefined;
  const backHref = safeFrom ?? "/app/student/courses";
  const teacherName =
    course.teacher?.name ?? course.teacher?.email ?? "Professeur";
  const teacherProfileHref = course.teacher?.id
    ? `/app/teachers/${course.teacher.id}?from=${encodeURIComponent(backHref)}`
    : null;
  const confirmedSeats = await prisma.courseAttendance.count({
    where: { courseId: course.id, status: "CONFIRMED" },
  });
  const waitlistCount = await prisma.courseAttendance.count({
    where: { courseId: course.id, status: "WAITLIST" },
  });
  const remainingSeats = (course.maxSeats ?? 30) - confirmedSeats;
  const cost = course.costCredits ?? 100;
  const waitlistQuota = course.waitlistQuota ?? 0;
  const waitlistFull = waitlistQuota > 0 && waitlistCount >= waitlistQuota;
  const coursePhoto = course.photoUrl?.trim() || COURSE_PLACEHOLDER;
  const myAttendance = course.attendances[0];
  const isWaitlist = myAttendance?.status === "WAITLIST";
  const isAttending = Boolean(myAttendance);
  const endTime =
    new Date(course.date).getTime() + (course.durationMinutes ?? 60) * 60_000;
  const icsHref = `/api/courses/${course.id}/ics`;
  const sharePath = `/app/student/courses/${course.id}`;
  const hasPositions = course.positions.length > 0;
  const isVirtual = course.isVirtual;
  const canBuy =
    !isAttending && endTime > NOW_MS && (user.credits ?? 0) >= cost && hasPositions && !isVirtual;
  const formattedDate = new Date(course.date).toLocaleString("fr-FR", {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
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
        <div className="flex flex-col gap-4 md:flex-row md:items-stretch md:justify-between">
          <div className="flex flex-col gap-3 md:w-2/3">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.14em] text-indigo-100">Élève</p>
              <h1 className="text-3xl font-semibold text-white">
                {course.title ?? "Cours"}
              </h1>
            </div>
            <div className="space-y-1 text-sm text-slate-200">
              <p className="text-base text-white flex flex-wrap items-center gap-2">
                {teacherProfileHref ? (
                  <Link
                    href={teacherProfileHref}
                    className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[12px] font-semibold text-cyan-100 transition hover:border-cyan-300 hover:bg-white/10"
                  >
                    {teacherName}
                  </Link>
                ) : (
                  <span>{teacherName}</span>
                )}
                {course.discipline && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-cyan-300/60 bg-cyan-500/15 px-3 py-1 text-xs font-semibold text-cyan-100">
                    {course.discipline}
                  </span>
                )}
              </p>
              <p className="flex flex-wrap items-center gap-1">
                <LocalDateTime
                  iso={course.date.toISOString()}
                  fallback={formattedDate}
                  options={{ year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }}
                />
                <span className="mx-1">·</span>
                Durée : {formatDuration(course.durationMinutes ?? 60)}
              </p>
              <p className="flex flex-wrap items-center gap-2">
                {remainingSeats} place(s) restante(s) · {cost} crédits
                {isWaitlist && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-purple-300/70 bg-purple-500/20 px-2 py-0.5 text-[11px] font-semibold text-purple-50">
                    Liste d’attente
                    {typeof myAttendance.waitlistRank === "number"
                      ? ` · rang #${myAttendance.waitlistRank}`
                      : ""}
                    {waitlistQuota > 0 ? ` · quota ${waitlistCount}/${waitlistQuota}` : ""}
                  </span>
                )}
                {!isWaitlist && remainingSeats <= 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-purple-300/70 bg-purple-500/20 px-2 py-0.5 text-[11px] font-semibold text-purple-50">
                    Liste d’attente
                    {waitlistQuota > 0 ? ` · quota ${waitlistCount}/${waitlistQuota}` : ""}
                  </span>
                )}
              </p>
              {course.school?.name && (
                <p className="text-slate-300">
                  École : {course.school.name}
                </p>
              )}
              {course.studio && (
                <p className="text-slate-300">
                  Studio : {course.studio.name}
                  {course.studio.address ? ` — ${course.studio.address}` : ""}
                </p>
              )}
            </div>
          </div>
          <div className="flex w-full flex-col items-end gap-3 md:w-1/3 md:self-stretch md:justify-end">
            {(isVirtual || !hasPositions) && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/60 bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-100">
                Occurrence programmée
              </span>
            )}
            <div className="flex w-full flex-col items-end gap-3 md:mt-auto">
              {!isAttending && (
                <div className="flex w-full flex-wrap items-center justify-end">
                  <form action={purchaseCourseAction} className="flex">
                    <input type="hidden" name="courseId" value={course.id} />
                    <button
                      type="submit"
                      disabled={!canBuy || (remainingSeats <= 0 && waitlistFull)}
                      className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                        canBuy && !(remainingSeats <= 0 && waitlistFull)
                          ? "border border-cyan-400/70 bg-cyan-500/20 text-white hover:bg-cyan-400/30"
                          : "border border-white/10 bg-white/5 text-slate-400 cursor-not-allowed"
                      }`}
                      title={
                        canBuy
                          ? remainingSeats > 0
                            ? "S'inscrire"
                            : waitlistFull
                            ? "Liste d'attente complète"
                            : "Rejoindre la liste d’attente"
                          : isVirtual || !hasPositions
                          ? "Inscription bloquée tant que les positions ne sont pas définies"
                          : endTime <= NOW_MS
                          ? "Cours passé"
                          : (session.user.credits ?? 0) < cost
                          ? "Crédits insuffisants"
                          : "Non disponible"
                      }
                    >
                      {remainingSeats > 0
                        ? "S'inscrire"
                        : waitlistFull
                        ? "Liste d’attente complète"
                        : "Liste d’attente"}{" "}
                      ({cost} crédits)
                    </button>
                  </form>
                </div>
              )}
              <div className="flex w-full flex-wrap items-center justify-end gap-3 md:flex-nowrap">
                <Link
                  href={backHref}
                  className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-semibold text-white transition hover:border-indigo-300/70 hover:bg-white/10"
                >
                  ← Retour à mes cours
                </Link>
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
        </div>
      </header>

      <section className="panel border-indigo-400/15 p-6">
        <h2 className="text-lg font-semibold text-white">Positions couvertes</h2>
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          {course.positions.map((cp) => (
            <li
              key={cp.id}
              className="rounded-xl border border-white/10 bg-white/5 text-slate-200"
            >
              <Link
                href={`/positions/${cp.position.id}?from=${encodeURIComponent(backHref)}`}
                className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 transition hover:border-cyan-300/70 hover:bg-white/10"
              >
                <span className="font-semibold text-white">{cp.position.name}</span>
                {cp.position.type ? (
                  <span className="text-xs uppercase tracking-[0.12em] text-cyan-200">
                    {cp.position.type}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
          {course.positions.length === 0 && (
            <li className="text-slate-300">Aucune position associée.</li>
          )}
        </ul>
      </section>

      <section className="panel border-indigo-400/15 p-6">
        <h2 className="text-lg font-semibold text-white">Notes / progression</h2>
        {course.notes.length === 0 ? (
          <p className="text-slate-300">Aucune note pour ce cours.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm text-slate-200">
            {course.notes.map((note) => (
              <li
                key={note.id}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-white">
                    {note.position.name}
                  </span>
                  <span className="text-xs uppercase tracking-[0.12em] text-cyan-200">
                    {note.masteryLevel}
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
