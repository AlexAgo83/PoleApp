import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function TeacherDashboard() {
  const session = await getServerSession(authOptions);
  const nameParts =
    session?.user?.name
      ?.trim()
      .split(/\s+/)
      .filter(Boolean) ?? [];
  const firstName = nameParts[0];
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : undefined;
  const displayName = firstName ?? lastName ?? session?.user?.email ?? "professeur";
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
    <main className="grid gap-6">
      <section className="panel space-y-4 p-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl text-white">
            Bonjour <span className="font-semibold">{displayName}</span>,
          </h2>
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
            <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
              Élèves
            </p>
            <p className="text-base font-semibold text-white">
              Liste et fiches élèves
          </p>
          <p className="text-sm text-slate-300">
            Voir blessures et progression par position, filtré sur ton école.
          </p>
        </Link>
          <Link
            href="/app/teacher/courses"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
              Cours
            </p>
            <p className="text-base font-semibold text-white">
              Créer et suivre les cours
          </p>
            <p className="text-sm text-slate-300">
              Présences, positions, notes élève×position, impact progression.
            </p>
          </Link>
          <Link
            href={teacherProfileHref}
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
              Fiche professeur
            </p>
            <p className="text-base font-semibold text-white">
              Photo, diplômes, positions préférées
            </p>
            <p className="text-sm text-slate-300">
              Vue partagée avec tes élèves. Édite depuis ton profil.
            </p>
          </Link>
          <Link
            href="/positions"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
              Positions
            </p>
            <p className="text-base font-semibold text-white">
              Gérer les positions
            </p>
            <p className="text-sm text-slate-300">
              Voir/ajouter des positions (types, niveaux, médias) utilisables en cours.
            </p>
          </Link>
          <Link
            href="/app/student/game"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
              Jeux
            </p>
            <p className="text-base font-semibold text-white">
              6 mini-jeux de révision
            </p>
            <p className="text-sm text-slate-300">
              Photo→nom, nom→type/niveau/grips/intro/tip pour animer tes sessions.
            </p>
          </Link>
          <Link
            href="/app/teacher/school"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
              École
            </p>
            <p className="text-base font-semibold text-white">Fiche école</p>
            <p className="text-sm text-slate-300">
              Studios et partenaires rattachés à ton école.
            </p>
          </Link>
          <Link
            href="/app/teacher/purchases"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">Achats élèves</p>
            <p className="text-base font-semibold text-white">Packs / Abos / Presets</p>
            <p className="text-sm text-slate-300">Lecture des achats de l’école (packs, abonnements, presets).</p>
          </Link>
          <Link
            href="/app/teacher/presets"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">Presets / combos</p>
            <p className="text-base font-semibold text-white">Créer/ gérer les presets</p>
            <p className="text-sm text-slate-300">Combos vidéo premium ou en crédits avec positions liées.</p>
          </Link>
          <Link
            href="/app/teacher/billing"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-emerald-400/70 hover:bg-white/10"
          >
            <p className="text-sm uppercase tracking-[0.12em] text-emerald-200">
              Facturation
            </p>
            <p className="text-base font-semibold text-white">
              Suivre tes factures (lecture)
            </p>
            <p className="text-sm text-slate-300">
              Montants, statuts et présences sur tes cours (lecture seule).
            </p>
          </Link>
          <Link
            href="/app/admin"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            <p className="text-sm uppercase tracking-[0.12em] text-cyan-200">
              Admin (si autorisé)
            </p>
            <p className="text-base font-semibold text-white">
              Gestion école
            </p>
            <p className="text-sm text-slate-300">
              Dashboard et gestion utilisateurs (réservé School Admin).
            </p>
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
