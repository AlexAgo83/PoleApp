import Link from "next/link";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveAvatarUrl } from "@/lib/avatar";
import { WeekView } from "@/app/student/courses/agenda/WeekView";
import {
  buildTeacherWeekAgenda,
  resolveTeacherAgendaAccess,
} from "@/lib/teacherAgenda";
import { TeacherEditPanel } from "./TeacherEditPanel";
import { TeacherAvatarManager } from "./TeacherAvatarManager";
import { ShareLinkButton } from "@/components/ShareLinkButton";
import { TeacherCombosGrid } from "./TeacherCombosGrid";
import { updateTeacherPasswordAction } from "./actions";
import { ProfileCollapsible } from "@/app/profile/ProfileCollapsible";

const TEACHER_AVATAR_PLACEHOLDER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop stop-color='%23111' offset='0%'/><stop stop-color='%23223' offset='100%'/></linearGradient></defs><rect width='120' height='120' rx='60' fill='url(%23g)'/><circle cx='60' cy='48' r='24' fill='%23334155'/><path d='M24 110c6-20 66-20 72 0' fill='%23334155'/></svg>";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ from?: string; combosPage?: string; week?: string }>;

export default async function TeacherPublicProfilePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams?: SearchParams;
}) {
  const resolvedParams = await Promise.resolve(params);
  const teacherId = resolvedParams?.id;
  const resolvedSearch = (await Promise.resolve(searchParams ?? {})) as {
    from?: string;
    combosPage?: string;
    week?: string;
  };
  const rawFrom = resolvedSearch.from;
  const rawCombosPage = resolvedSearch.combosPage;
  const rawWeek = resolvedSearch.week;
  const safeFrom =
    rawFrom && rawFrom.startsWith("/") && !rawFrom.startsWith("//")
      ? rawFrom
      : undefined;
  const initialCombosPage = Math.max(1, Number(rawCombosPage ?? "1") || 1);
  const weekParam = typeof rawWeek === "string" ? rawWeek : undefined;

  if (!teacherId) {
    notFound();
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/teachers/${teacherId}`);
  }

  const teacher = await prisma.user.findUnique({
    where: { id: teacherId },
    select: {
      id: true,
      name: true,
      email: true,
      age: true,
      avatarPublicId: true,
      diplomas: true,
      role: true,
      schoolId: true,
      school: { select: { name: true } },
      favoritePositions: {
        include: { position: true },
        orderBy: { position: { name: "asc" } },
      },
      favoriteDisciplines: {
        include: { discipline: true },
        orderBy: { discipline: { name: "asc" } },
      },
      createdPresets: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          discipline: true,
          priceCredits: true,
          premiumRequired: true,
          imagePublicId: true,
          positions: {
            take: 3,
            select: { position: { select: { name: true } } },
          },
        },
        take: 50,
      },
    },
  });

  if (!teacher || (teacher.role !== "TEACHER" && teacher.role !== "SCHOOL_ADMIN")) {
    notFound();
  }
  const teacherSummary = { id: teacher.id, role: teacher.role, schoolId: teacher.schoolId };
  const access = resolveTeacherAgendaAccess(teacherSummary, session.user);
  if (!access.allowed) {
    if (access.reason === "forbidden") {
      redirect("/access-denied");
    }
    notFound();
  }
  const canEdit =
    session.user.role === "SCHOOL_ADMIN" || session.user.id === teacher.id;
  const positions = canEdit
    ? await prisma.position.findMany({
        select: { id: true, name: true, type: true },
        orderBy: { name: "asc" },
      })
    : [];
  const disciplines = canEdit
    ? await prisma.discipline.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : [];
  const agendaResult = await buildTeacherWeekAgenda({ teacher: teacherSummary, viewer: session.user, weekParam });
  if (!agendaResult.data) {
    notFound();
  }
  const agendaData = agendaResult.data;
  const hasCoursesThisWeek = agendaData.days.some((day) => day.courses.length > 0);
  const courseBasePath =
    session.user.role === "TEACHER" || session.user.role === "SCHOOL_ADMIN"
      ? "/teacher/courses"
      : session.user.role === "SUPER_ADMIN"
      ? "/admin/courses"
      : "/student/courses";
  const coursesListHref = `/student/courses?teacher=${teacher.id}`;
  const agendaBaseFrom = `/teachers/${teacher.id}`;

  const avatarUrl = resolveAvatarUrl({
    avatarPublicId: teacher.avatarPublicId,
    avatarUrl: null,
    placeholder: TEACHER_AVATAR_PLACEHOLDER,
  });
  const favoritePositions =
    teacher.favoritePositions
      .map((fp) => fp.position)
      .filter((p): p is NonNullable<typeof p> => Boolean(p)) ?? [];
  const favoriteDisciplines =
    teacher.favoriteDisciplines
      .map((fd) => fd.discipline)
      .filter((d): d is NonNullable<typeof d> => Boolean(d)) ?? [];
  const backHref = safeFrom || undefined;
  const teacherName = teacher.name?.trim() || teacher.email || "Professeur";
  const nameParts = (teacher.name ?? "")
    .trim()
    .split(" ")
    .filter(Boolean);
  let firstNameDefault = nameParts[0] ?? "";
  let lastNameDefault = nameParts.slice(1).join(" ");
  if (!firstNameDefault && teacher.email) {
    firstNameDefault = teacher.email.split("@")[0] ?? "";
  }
  const favoritePositionIds = teacher.favoritePositions.map((fp) => fp.positionId);
  const favoriteDisciplineIds = teacher.favoriteDisciplines.map((fd) => fd.disciplineId);
  const avatarFolder = process.env.NEXT_PUBLIC_CLOUDINARY_AVATAR_FOLDER ?? "poleapp/avatars";
  const cloudinaryCloudName =
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? process.env.CLOUDINARY_CLOUD_NAME ?? "";

  return (
    <main className="flex w-full flex-col gap-4">
      <section className="panel panel-body border-indigo-400/25 shadow-indigo-900/30">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl}
              alt={`Avatar de ${teacherName}`}
              className="h-20 w-20 rounded-full border border-white/10 object-cover shadow-lg shadow-black/30"
            />
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-indigo-100">
                Fiche professeur
              </p>
              <h1 className="text-2xl font-semibold text-white">{teacherName}</h1>
              <p className="text-sm text-slate-200">{teacher.email}</p>
              <p className="text-sm text-slate-300">
                École : {teacher.school?.name ?? "Non rattaché"}
              </p>
            </div>
          </div>
          <div className="flex w-full justify-end md:w-auto">
            <ShareLinkButton
              path={`/teachers/${teacher.id}`}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-300/70 hover:bg-white/10"
            />
          </div>
        </div>
        <div className="panel-grid mt-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <h2 className="text-lg font-semibold text-white">Diplômes</h2>
            <p className="whitespace-pre-line rounded-xl px-0 py-0 text-sm text-slate-100">
              {teacher.diplomas?.trim() || "Non renseigné"}
            </p>
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-white">Positions coups de cœur</h2>
            {favoritePositions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {favoritePositions.map((position) => (
                  <Link
                    key={position.id}
                    href={`/positions/${position.id}`}
                    className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[12px] font-semibold text-white transition hover:border-cyan-300 hover:text-cyan-100"
                  >
                    {position.name}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-300">Aucune position préférée renseignée.</p>
            )}
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-white">Disciplines favorites</h2>
            {favoriteDisciplines.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {favoriteDisciplines.map((discipline) => (
                  <span
                    key={discipline.id}
                    className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[12px] font-semibold text-white"
                  >
                    {discipline.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-300">Aucune discipline favorite renseignée.</p>
            )}
          </div>
        </div>

        <TeacherCombosGrid
          teacherId={teacher.id}
          combos={teacher.createdPresets}
          fromPath={`/teachers/${teacher.id}`}
          cloudName={cloudinaryCloudName}
          initialPage={initialCombosPage}
        />
      </section>

      <section className="panel panel-body lg-gap border-indigo-400/25 shadow-indigo-900/30">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Agenda</p>
            <h2 className="text-xl font-semibold text-white">Agenda du professeur</h2>
          </div>
        </div>
        {!hasCoursesThisWeek && (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-slate-200">
            Aucun cours à venir pour le moment. Consulte la liste complète pour préparer ta prochaine session.
          </div>
        )}
        <WeekView
          initialWeek={agendaData.week}
          initialPrev={agendaData.prevWeek}
          initialNext={agendaData.nextWeek}
          initialDays={agendaData.days}
          filters={{ teacher: teacher.id }}
          baseFrom={agendaBaseFrom}
          apiPath={`/api/teachers/${teacher.id}/week-agenda`}
          courseBasePath={courseBasePath}
          showAttendanceBadges={session.user.role === "STUDENT"}
          compact
        />
      </section>

      {canEdit && (
        <>
          <TeacherEditPanel
            teacherId={teacher.id}
            defaults={{
              firstName: firstNameDefault,
              lastName: lastNameDefault,
              age: teacher.age,
              diplomas: teacher.diplomas,
              favoritePositionIds,
              favoriteDisciplineIds,
            }}
            positions={positions}
            disciplines={disciplines}
            returnTo={backHref}
          />

          <section className="panel panel-body lg-gap border-indigo-400/15">
            <details className="group">
              <summary className="flex cursor-pointer items-center justify-between text-lg font-semibold text-white outline-none transition hover:text-cyan-100">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Édition</p>
                  <h2 className="text-lg font-semibold text-white">Photo de profil</h2>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white transition hover:border-cyan-300/70 hover:bg-white/10 group-open:border-white/15 group-open:bg-white/5">
                  <span className="group-open:hidden">Modifier</span>
                  <span className="hidden group-open:inline">Fermer</span>
                </span>
              </summary>
              <div className="panel-body lg-gap pt-1">
                <TeacherAvatarManager
                  teacherId={teacher.id}
                  folder={avatarFolder}
                  returnTo={backHref}
                  initialUrl={avatarUrl}
                  initialPublicId={teacher.avatarPublicId ?? null}
                />
                <p className="text-sm text-slate-300">
                  Upload signé Cloudinary (auth), formats jpg/png/webp, 4 Mo max.
                </p>
              </div>
            </details>
          </section>

          <section className="panel panel-body lg-gap border-indigo-400/15">
            <ProfileCollapsible
              id="teacher-password"
              eyebrow="Sécurité"
              heading="Changer le mot de passe"
            >
              <form action={updateTeacherPasswordAction} className="panel-grid lg-gap md:grid-cols-2">
                <input type="hidden" name="teacherId" value={teacher.id} />
                {backHref ? <input type="hidden" name="returnTo" value={backHref} /> : null}
                <label className="space-y-2 text-sm text-slate-200 md:col-span-2">
                  Mot de passe actuel
                  <input
                    type="password"
                    name="currentPassword"
                    autoComplete="current-password"
                    required
                    minLength={8}
                    className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
                  />
                </label>
                <label className="space-y-2 text-sm text-slate-200">
                  Nouveau mot de passe
                  <input
                    type="password"
                    name="newPassword"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
                  />
                </label>
                <label className="space-y-2 text-sm text-slate-200">
                  Confirmer le nouveau mot de passe
                  <input
                    type="password"
                    name="confirmPassword"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
                  />
                </label>
                <div className="md:col-span-2 flex justify-end">
                  <button
                    type="submit"
                    className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-400"
                  >
                    Mettre à jour
                  </button>
                </div>
                <p className="md:col-span-2 text-xs text-slate-400">
                  Le mot de passe actuel est requis. Minimum 8 caractères.
                </p>
              </form>
            </ProfileCollapsible>
          </section>
        </>
      )}
    </main>
  );
}
