import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveAvatarUrl } from "@/lib/avatar";
import { AVATAR_PLACEHOLDER } from "@/lib/placeholders";

export default async function TeacherDashboard() {
  const session = await getServerSession(authOptions);
  const teacherUser = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, avatarUrl: true, avatarPublicId: true, name: true, email: true },
      })
    : null;
  const nameParts =
    (teacherUser?.name ?? session?.user?.name)
      ?.trim()
      .split(/\s+/)
      .filter(Boolean) ?? [];
  const firstName = nameParts[0];
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : undefined;
  const displayName = firstName ?? lastName ?? teacherUser?.email ?? session?.user?.email ?? "professeur";
  const avatarUrl = resolveAvatarUrl({
    avatarPublicId: teacherUser?.avatarPublicId,
    avatarUrl: teacherUser?.avatarUrl ?? session?.user?.image ?? null,
    placeholder: AVATAR_PLACEHOLDER,
    seedKey: teacherUser?.id ?? session?.user?.id,
  }) || null;
  const avatarInitial = (displayName?.[0] ?? "P").toUpperCase();
  const teacherProfileHref = session?.user?.id ? `/app/teachers/${session.user.id}` : "/app/profile";
  return (
    <main className="flex min-h-screen w-full flex-col gap-4">
      <section className="panel p-6">
        <div className="grid gap-3 md:grid-cols-2">
          <Link
            href="/app/teacher/students"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-white/10 bg-white/5">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="8" r="3" />
                  <circle cx="17" cy="9" r="3" />
                  <path d="M4 19v-1a4 4 0 014-4h2a4 4 0 014 4v1" />
                  <path d="M15 19v-1a3.5 3.5 0 013.5-3.5H20" />
                </svg>
              </span>
              <div className="space-y-1">
                <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
                  Élèves
                </p>
                <p className="text-base font-semibold text-white">
                  Liste et fiches élèves
                </p>
              </div>
            </div>
          </Link>
          <Link
            href="/app/teacher/courses/agenda?view=month"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-white/10 bg-white/5">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="5" width="16" height="15" rx="2" />
                  <path d="M16 3v4" />
                  <path d="M8 3v4" />
                  <path d="M4 11h16" />
                  <path d="M9 15h2" />
                  <path d="M13 15h2" />
                </svg>
              </span>
              <div className="space-y-1">
                <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
                  Planning
                </p>
                <p className="text-base font-semibold text-white">
                  Créer et suivre les cours
                </p>
              </div>
            </div>
          </Link>
          <Link
            href={teacherProfileHref}
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-white/10 bg-white/5">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="6" width="16" height="12" rx="2" />
                  <path d="M8 10h5" />
                  <path d="M8 13h3" />
                  <circle cx="16.5" cy="12" r="1.8" />
                </svg>
              </span>
              <div className="space-y-1">
                <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
                  Fiche professeur
                </p>
                <p className="text-base font-semibold text-white">
                  Photo, diplômes, positions coup de cœur
                </p>
              </div>
            </div>
          </Link>
          <Link
            href="/app/teacher/school"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-white/10 bg-white/5">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 4l8 4-8 4-8-4 8-4z" />
                  <path d="M4 12v5.5a1.5 1.5 0 001.5 1.5H9v-5.5" />
                  <path d="M20 12v5.5a1.5 1.5 0 01-1.5 1.5H15v-5.5" />
                </svg>
              </span>
              <div className="space-y-1">
                <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
                  École
                </p>
                <p className="text-base font-semibold text-white">
                  Fiche école et studios
                </p>
              </div>
            </div>
          </Link>
          <Link
            href="/positions"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-white/10 bg-white/5">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5c-2 0-3.5 1.5-3.5 3.5S10 12 12 12s3.5 1.5 3.5 3.5S14 19 12 19" />
                  <path d="M12 5V3" />
                  <path d="M12 21v-2" />
                  <path d="M5 12h2" />
                  <path d="M17 12h2" />
                  <path d="M7 7l1.5 1.5" />
                  <path d="M15.5 15.5 17 17" />
                  <path d="M7 17l1.5-1.5" />
                  <path d="M15.5 8.5 17 7" />
                </svg>
              </span>
              <div className="space-y-1">
                <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
                  Positions
                </p>
                <p className="text-base font-semibold text-white">Gérer les positions</p>
              </div>
            </div>
          </Link>
          <Link
            href="/app/teacher/presets"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-white/10 bg-white/5">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="5" width="16" height="14" rx="2" />
                  <path d="M4 9h16" />
                  <path d="M8 5v14" />
                  <path d="M16 5v14" />
                </svg>
              </span>
              <div className="space-y-1">
                <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">Combos</p>
                <p className="text-base font-semibold text-white">Créer et gérer les combos</p>
              </div>
            </div>
          </Link>
          <Link
            href="/app/teacher/purchases"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-white/10 bg-white/5">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="6" width="18" height="12" rx="2" />
                  <path d="M3 10h18" />
                  <path d="M7 15h2" />
                </svg>
              </span>
              <div className="space-y-1">
                <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">Achats élèves</p>
                <p className="text-base font-semibold text-white">Packs / Abos / Combos</p>
              </div>
            </div>
          </Link>
          <Link
            href="/app/teacher/billing"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-white/10 bg-white/5">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 4h10a2 2 0 012 2v12l-3-2-3 2-3-2-3 2V6a2 2 0 012-2z" />
                  <path d="M9 8h6" />
                  <path d="M9 12h6" />
                </svg>
              </span>
              <div className="space-y-1">
                <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
                  Facturation
                </p>
                <p className="text-base font-semibold text-white">
                  Suivre tes factures
                </p>
              </div>
            </div>
          </Link>
          <Link
            href="/app/student/game"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-white/10 bg-white/5">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="7" />
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 5V3" />
                  <path d="M12 21v-2" />
                  <path d="M5 12H3" />
                  <path d="M21 12h-2" />
                </svg>
              </span>
              <div className="space-y-1">
                <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
                  Jeux
                </p>
                <p className="text-base font-semibold text-white">
                  6 mini-jeux de révision
                </p>
              </div>
            </div>
          </Link>
          <Link
            href="/app/teacher/partners"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-white/10 bg-white/5">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8a6 6 0 00-9.33-5" />
                  <path d="M5 22a7 7 0 0010-6.71" />
                  <path d="M16 8a6 6 0 00-9.33-5" />
                  <path d="M2 22a7 7 0 0010-6.71" />
                  <path d="M7 10h10" />
                  <path d="M7 14h10" />
                </svg>
              </span>
              <div className="space-y-1">
                <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
                  Partenaires
                </p>
                <p className="text-base font-semibold text-white">
                  Voir partenaires/links sponsorisés
                </p>
              </div>
            </div>
          </Link>
        </div>
      </section>

    </main>
  );
}
