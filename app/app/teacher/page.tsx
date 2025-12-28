import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function TeacherDashboard() {
  const session = await getServerSession(authOptions);
  const teacherUser = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { avatarUrl: true, name: true, email: true },
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
  const avatarUrl = teacherUser?.avatarUrl ?? session?.user?.image ?? null;
  const avatarInitial = (displayName?.[0] ?? "P").toUpperCase();
  const teacherProfileHref = session?.user?.id ? `/app/teachers/${session.user.id}` : "/app/profile";
  const partners =
    session?.user?.schoolId
      ? await prisma.partner.findMany({
          where: { schoolId: session.user.schoolId },
          select: { id: true, name: true, kind: true, website: true, description: true },
          orderBy: { name: "asc" },
          take: 4,
        })
      : [];

  return (
    <main className="flex min-h-screen w-full flex-col gap-4">
      <section className="panel space-y-4 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/5 shadow-inner shadow-slate-900/30">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                <span className="text-base font-semibold text-white/90">{avatarInitial}</span>
              )}
            </div>
            <h2 className="text-xl text-white">
              Bonjour <span className="font-semibold text-fuchsia-200">{displayName}</span>,
            </h2>
          </div>
          {teacherProfileHref && (
            <Link
              href={teacherProfileHref}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-white/90 transition hover:border-indigo-300/70 hover:text-white"
              aria-label="Éditer le profil"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/gear.svg" alt="" className="h-4 w-4" />
              Éditer
            </Link>
          )}
        </div>
        <p className="text-slate-300">
          Accès réservé aux profs/admins de l’école pour gérer élèves, cours et progression.
        </p>
      </section>

      <section className="panel p-6">
        <h3 className="text-lg font-semibold text-white">
          Modules et actions prof
        </h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
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
                <p className="text-sm text-slate-300">
                  Voir blessures et progression par position, filtré sur ton école.
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
                  Cours
                </p>
                <p className="text-base font-semibold text-white">
                  Créer et suivre les cours
                </p>
                <p className="text-sm text-slate-300">
                  Présences, positions, notes élève×position, impact progression.
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
                  Photo, diplômes, positions préférées
                </p>
                <p className="text-sm text-slate-300">
                  Vue partagée avec tes élèves. Édite depuis ton profil.
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
                <p className="text-base font-semibold text-white">
                  Gérer les positions
                </p>
                <p className="text-sm text-slate-300">
                  Voir/ajouter des positions (types, niveaux, médias) utilisables en cours.
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
                <p className="text-sm text-slate-300">
                  Photo→nom, nom→type/niveau/grips/intro/tip pour animer tes sessions.
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
                <p className="text-base font-semibold text-white">Fiche école</p>
                <p className="text-sm text-slate-300">
                  Studios et partenaires rattachés à ton école.
                </p>
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
                <p className="text-base font-semibold text-white">Packs / Abos / Presets</p>
                <p className="text-sm text-slate-300">Lecture des achats de l’école (packs, abonnements, presets).</p>
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
                <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">Presets / combos</p>
                <p className="text-base font-semibold text-white">Créer/ gérer les presets</p>
                <p className="text-sm text-slate-300">Combos vidéo premium ou en crédits avec positions liées.</p>
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
                  Suivre tes factures (lecture)
                </p>
                <p className="text-sm text-slate-300">
                  Montants, statuts et présences sur tes cours (lecture seule).
                </p>
              </div>
            </div>
          </Link>
          <Link
            href="/app/admin"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 4l7 3v5c0 3.5-2.4 6.7-7 8-4.6-1.3-7-4.5-7-8V7z" />
                  <path d="M10 11l2 2 4-4" />
                </svg>
              </span>
              <div className="space-y-1">
                <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
                  Admin (si autorisé)
                </p>
                <p className="text-base font-semibold text-white">
                  Gestion école
                </p>
                <p className="text-sm text-slate-300">
                  Dashboard et gestion utilisateurs (réservé School Admin).
                </p>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {partners.length > 0 && (
        <section className="panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-white">Partenaires de l’école</h3>
            <Link
              href="/app/teacher/school"
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
            >
              Voir la fiche école
            </Link>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {partners.map((partner) => (
              <div
                key={partner.id}
                className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200"
              >
                <p className="text-base font-semibold text-white">{partner.name}</p>
                {partner.kind && <p className="text-xs uppercase tracking-[0.12em] text-cyan-200">{partner.kind}</p>}
                {partner.description && <p className="text-sm text-slate-300">{partner.description}</p>}
                {partner.website && (
                  <a
                    href={partner.website}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-cyan-300 transition hover:text-cyan-100"
                  >
                    Site web ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
