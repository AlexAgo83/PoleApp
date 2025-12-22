import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { COURSE_PLACEHOLDER } from "@/lib/placeholders";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const COURSE_PHOTO_PLACEHOLDER = COURSE_PLACEHOLDER;

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
  searchParams?: Promise<{ from?: string }>;
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
      include: {
        teacher: { select: { name: true, email: true } },
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
              include: { student: { select: { id: true, name: true, email: true } } },
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

  const teacherName =
    course.teacher?.name ?? course.teacher?.email ?? "Professeur";
  const resolvedSearch = (await searchParams) ?? {};
  const rawFrom = resolvedSearch.from;
  const safeFrom =
    rawFrom && rawFrom.startsWith("/") && !rawFrom.startsWith("//")
      ? rawFrom
      : undefined;
  const backHref = safeFrom ?? "/app/teacher/courses";
  const currentPath = `/app/teacher/courses/${course.id}${
    safeFrom ? `?from=${encodeURIComponent(safeFrom)}` : ""
  }`;
  const seatsUsed = course._count?.attendances ?? 0;
  const remainingSeats = (course.maxSeats ?? 30) - seatsUsed;
  const cost = course.costCredits ?? 100;
  const coursePhoto = course.photoUrl?.trim() || COURSE_PHOTO_PLACEHOLDER;
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
              <p className="text-xs uppercase tracking-[0.14em] text-indigo-100">
                Professeur / Admin
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-semibold text-white">
                  {course.title ?? "Cours sans titre"}
                </h1>
                <Link
                  href={`/app/teacher/courses/${course.id}/edit${
                    safeFrom ? `?from=${encodeURIComponent(safeFrom)}` : ""
                  }`}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white transition hover:border-indigo-300/70 hover:bg-white/10"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/gear.svg" alt="" className="h-4 w-4" />
                  Éditer
                </Link>
                {course.notes.length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-1 text-xs font-semibold text-white">
                    Notes : {course.notes.length}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coursePhoto}
                alt={course.title ?? "Cours"}
                className="h-20 w-32 rounded-xl border border-white/10 object-cover shadow"
              />
              <div className="space-y-1 text-sm text-slate-200">
                <p className="text-base text-white">{teacherName}</p>
                <p>
                  {formattedDate} · Durée : {formatDuration(course.durationMinutes ?? 60)}
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
          </div>
          <div className="flex w-full justify-end md:w-auto md:self-end">
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
            >
              ← Retour liste
            </Link>
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
                <span className="font-semibold text-white">
                  {cp.position.name}
                </span>
                {cp.position.type ? (
                  <span className="text-xs uppercase tracking-[0.12em] text-cyan-200">
                    {cp.position.type}
                  </span>
                ) : null}
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
        <ul className="mt-3 space-y-2">
          {course.attendances.map((attendance) => (
            <li
              key={attendance.id}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-slate-200"
            >
              {attendance.student?.id ? (
                <Link
                  href={`/app/teacher/students/${attendance.student.id}?from=${encodeURIComponent(currentPath)}`}
                  className="inline-flex items-center gap-2 text-white underline-offset-4 hover:underline"
                >
                  {attendance.student?.name ?? attendance.student?.email ?? "Élève"}
                </Link>
              ) : (
                attendance.student?.name ?? attendance.student?.email ?? "Élève"
              )}
            </li>
          ))}
          {course.attendances.length === 0 && (
            <li className="text-slate-300">Aucun élève rattaché.</li>
          )}
        </ul>
      </section>

      <section className="panel border-indigo-400/15 p-6">
        <h2 className="text-lg font-semibold text-white">Notes</h2>
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
                  <div className="space-y-0.5">
                    <p className="font-semibold text-white">
                      {(note.student as { id?: string | null } | null | undefined)?.id ? (
                        <Link
                          href={`/app/teacher/students/${(note.student as { id: string }).id}?from=${encodeURIComponent(currentPath)}`}
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
