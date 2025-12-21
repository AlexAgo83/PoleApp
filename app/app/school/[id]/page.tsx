import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps =
  | { params: { id: string }; searchParams?: Promise<Record<string, string | string[] | undefined>> }
  | { params: Promise<{ id?: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function StudioPage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const studioId = resolvedParams?.id;
  if (!studioId) redirect("/access-denied");

  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const userRole = session.user.role;

  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    include: {
      school: { select: { id: true, name: true } },
      courses: {
        orderBy: { date: "asc" },
        take: 10,
        include: {
          teacher: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!studio || (session.user.schoolId && studio.school?.id && studio.school.id !== session.user.schoolId)) {
    redirect("/access-denied");
  }

  const isAdmin = userRole === "SCHOOL_ADMIN";
  const schoolName = studio.school?.name ?? "École";
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
        {studio.courses.length === 0 ? (
          <p className="mt-2 text-sm text-slate-300">Aucun cours associé pour le moment.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {studio.courses.map((course) => (
              <li key={course.id} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
                <div className="flex items-center justify-between text-xs font-semibold text-white">
                  <span>{new Date(course.date).toLocaleString("fr-FR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })}</span>
                  <span className="text-[11px] text-cyan-100">
                    {course.durationMinutes ?? 60} min
                  </span>
                </div>
                <p className="mt-1 text-base font-semibold text-white">
                  {course.title ?? "Cours"}
                </p>
                <p className="text-sm text-cyan-100">
                  {course.teacher?.name ?? course.teacher?.email ?? "Professeur"}
                </p>
                <Link
                  href={`${
                    userRole === "STUDENT"
                      ? "/app/student/courses"
                      : "/app/teacher/courses"
                  }/${course.id}?from=/app/school/${studio.id}`}
                  className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
                >
                  Voir le cours
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
