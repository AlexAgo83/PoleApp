import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const TEACHER_AVATAR_PLACEHOLDER = "https://placehold.co/160x160/111827/ffffff?text=Prof";

export default async function StudentTeachersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/app/student/teachers");
  }
  if (!session.user.schoolId) {
    redirect("/access-denied");
  }

  const teachers = await prisma.user.findMany({
    where: {
      role: "TEACHER",
      schoolId: session.user.schoolId,
      coursesTaught: {
        some: {
          attendances: { some: { studentId: session.user.id } },
        },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      diplomas: true,
      favoritePositions: {
        include: { position: true },
        orderBy: { position: { name: "asc" } },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 px-0 py-6 md:gap-6 md:px-8 md:py-10">
      <header className="panel border-indigo-400/25 p-6 shadow-indigo-900/30">
        <p className="text-xs uppercase tracking-[0.14em] text-indigo-100">
          Élève
        </p>
        <h1 className="text-3xl font-semibold text-white">Tes professeurs</h1>
        <p className="text-sm text-slate-200">
          Fiches professeurs qui t&apos;ont déjà donné cours. Accède à leurs diplômes et positions
          préférées.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <Link
            href="/app/student"
            className="inline-flex items-center justify-center rounded-full border border-white/20 px-3 py-2 text-white transition hover:border-indigo-300 hover:text-cyan-200"
          >
            ← Retour accueil
          </Link>
        </div>
      </header>

      <section className="panel border-indigo-400/15 p-6">
        <h2 className="text-lg font-semibold text-white">Professeurs</h2>
        {teachers.length === 0 ? (
          <p className="mt-3 text-slate-300">
            Aucun professeur associé pour le moment. Participe à un cours pour voir leur fiche.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {teachers.map((teacher) => {
              const avatar = teacher.avatarUrl?.trim() || TEACHER_AVATAR_PLACEHOLDER;
              const favoritePositions =
                teacher.favoritePositions
                  .map((fp) => fp.position)
                  .filter((p): p is NonNullable<typeof p> => Boolean(p)) ?? [];
              const snippet =
                teacher.diplomas && teacher.diplomas.length > 140
                  ? `${teacher.diplomas.slice(0, 140)}…`
                  : teacher.diplomas;
              return (
                <article
                  key={teacher.id}
                  className="flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={avatar}
                    alt={`Avatar de ${teacher.name ?? teacher.email ?? "Professeur"}`}
                    className="h-16 w-16 rounded-full border border-white/10 object-cover shadow"
                  />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-base font-semibold text-white">
                          {teacher.name ?? "Professeur"}
                        </p>
                        <p className="text-sm text-slate-300">{teacher.email}</p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-200">
                      {snippet ?? "Diplômes non renseignés"}
                    </p>
                    {favoritePositions.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {favoritePositions.slice(0, 3).map((position) => (
                          <span
                            key={position.id}
                            className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white"
                          >
                            {position.name}
                          </span>
                        ))}
                        {favoritePositions.length > 3 && (
                          <span className="text-[11px] text-slate-300">
                            +{favoritePositions.length - 3} autres
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 text-sm">
                      <Link
                        href={`/app/teachers/${teacher.id}?from=/app/student/teachers`}
                        className="inline-flex items-center justify-center rounded-full border border-cyan-400/60 bg-cyan-500/10 px-3 py-1.5 font-semibold text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-500/20"
                      >
                        Voir la fiche
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
