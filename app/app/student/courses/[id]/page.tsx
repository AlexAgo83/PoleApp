import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { COURSE_PLACEHOLDER } from "@/lib/placeholders";
import { purchaseCourseAction } from "../actions";
import { SafeImage } from "@/components/SafeImage";

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
      include: {
        school: { select: { name: true } },
        teacher: { select: { id: true, name: true, email: true } },
        studio: { select: { name: true, address: true } },
        positions: { include: { position: true } },
        notes: {
          where: { studentId: session.user.id },
          include: { position: true },
        },
        attendances: { where: { studentId: session.user.id }, select: { id: true } },
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
            attendances: { where: { studentId: session.user.id }, select: { id: true } },
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
  const seatsUsed = course._count?.attendances ?? 0;
  const remainingSeats = (course.maxSeats ?? 30) - seatsUsed;
  const cost = course.costCredits ?? 100;
  const coursePhoto = course.photoUrl?.trim() || COURSE_PLACEHOLDER;
  const isAttending = course.attendances.length > 0;
  const endTime =
    new Date(course.date).getTime() + (course.durationMinutes ?? 60) * 60_000;
  const canBuy =
    !isAttending &&
    endTime > NOW_MS &&
    remainingSeats > 0 &&
    (user.credits ?? 0) >= cost;
  const formattedDate = new Date(course.date).toLocaleString("fr-FR", {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-3 px-0 py-6 md:gap-6 md:px-8 md:py-10">
      <header className="panel space-y-4 border-indigo-400/25 p-6 shadow-indigo-900/30">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-3 md:w-2/3">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.14em] text-indigo-100">Élève</p>
              <h1 className="text-3xl font-semibold text-white">
                {course.title ?? "Cours"}
              </h1>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
              <SafeImage
                src={coursePhoto}
                alt={course.title ?? "Cours"}
                width={128}
                height={80}
                className="h-20 w-32 rounded-xl border border-white/10 object-cover shadow"
                fallbackSrc={COURSE_PLACEHOLDER}
              />
            <div className="space-y-1 text-sm text-slate-200">
              <p className="text-base text-white">
                {teacherProfileHref ? (
                  <Link
                    href={teacherProfileHref}
                      className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[12px] font-semibold text-cyan-100 transition hover:border-cyan-300 hover:bg-white/10"
                    >
                      {teacherName}
                    </Link>
                  ) : (
                    teacherName
                  )}
                </p>
                <p>
                  {formattedDate} · Durée : {formatDuration(course.durationMinutes ?? 60)}
                </p>
                <p>
                  {remainingSeats} place(s) restante(s) · {cost} crédits
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
          </div>
          <div className="flex w-full flex-wrap items-center justify-end gap-2 md:w-auto md:self-start">
            {!isAttending && (
              <form action={purchaseCourseAction}>
                <input type="hidden" name="courseId" value={course.id} />
                <button
                  type="submit"
                  disabled={!canBuy}
                  className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                    canBuy
                      ? "border border-cyan-400/70 bg-cyan-500/20 text-white hover:bg-cyan-400/30"
                      : "border border-white/10 bg-white/5 text-slate-400 cursor-not-allowed"
                  }`}
                  title={
                    canBuy
                      ? "Acheter ce cours"
                      : remainingSeats <= 0
                      ? "Plus de places"
                      : endTime <= NOW_MS
                      ? "Cours passé"
                      : (session.user.credits ?? 0) < cost
                      ? "Crédits insuffisants"
                      : "Non disponible"
                  }
                >
                  Acheter ({cost} crédits)
                </button>
              </form>
            )}
            <Link
              href={backHref}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-indigo-300/70 hover:bg-white/10"
            >
              Retour à mes cours
            </Link>
          </div>
        </div>
      </header>

      <section className="panel border-indigo-400/15 p-6">
        <h2 className="text-lg font-semibold text-white">Positions couvertes</h2>
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          {course.positions.map((cp) => (
            <li
              key={cp.id}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-slate-200"
            >
              <span className="font-semibold text-white">{cp.position.name}</span>
              {cp.position.type ? (
                <span className="ml-2 text-xs uppercase tracking-[0.12em] text-cyan-200">
                  {cp.position.type}
                </span>
              ) : null}
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
