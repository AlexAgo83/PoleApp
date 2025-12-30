import Link from "next/link";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveAvatarUrl } from "@/lib/avatar";
import { TeacherEditPanel } from "./TeacherEditPanel";
import { TeacherAvatarManager } from "./TeacherAvatarManager";
import { ShareLinkButton } from "@/components/ShareLinkButton";

const TEACHER_AVATAR_PLACEHOLDER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop stop-color='%23111' offset='0%'/><stop stop-color='%23223' offset='100%'/></linearGradient></defs><rect width='120' height='120' rx='60' fill='url(%23g)'/><circle cx='60' cy='48' r='24' fill='%23334155'/><path d='M24 110c6-20 66-20 72 0' fill='%23334155'/></svg>";

type Params = { id?: string } | Promise<{ id?: string }>;
type SearchParams = { from?: string } | Promise<{ from?: string }>;

export default async function TeacherPublicProfilePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams?: SearchParams;
}) {
  const resolvedParams = await Promise.resolve(params);
  const teacherId = resolvedParams?.id;
  const resolvedSearch = (await Promise.resolve(searchParams)) ?? {};
  const rawFrom = resolvedSearch.from;
  const safeFrom =
    rawFrom && rawFrom.startsWith("/") && !rawFrom.startsWith("//")
      ? rawFrom
      : undefined;

  if (!teacherId) {
    notFound();
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/app/teachers/${teacherId}`);
  }
  if (!session.user.schoolId) {
    redirect("/access-denied");
  }

  const teacher = await prisma.user.findFirst({
    where: {
      id: teacherId,
      role: "TEACHER",
      schoolId: session.user.schoolId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      age: true,
      avatarUrl: true,
      avatarPublicId: true,
      diplomas: true,
      school: { select: { name: true } },
      favoritePositions: {
        include: { position: true },
        orderBy: { position: { name: "asc" } },
      },
    },
  });

  if (!teacher) {
    notFound();
  }

  if (session.user.role === "STUDENT") {
    const attended = await prisma.courseAttendance.count({
      where: { studentId: session.user.id, course: { teacherId: teacher.id } },
    });
    if (attended === 0) {
      redirect("/access-denied");
    }
  }

  const canEdit =
    session.user.role === "SCHOOL_ADMIN" || session.user.id === teacher.id;
  const positions = canEdit
    ? await prisma.position.findMany({
        select: { id: true, name: true, type: true },
        orderBy: { name: "asc" },
      })
    : [];

  const avatarUrl = resolveAvatarUrl({
    avatarPublicId: teacher.avatarPublicId,
    avatarUrl: teacher.avatarUrl,
    placeholder: TEACHER_AVATAR_PLACEHOLDER,
    seedKey: teacher.id,
  });
  const favoritePositions =
    teacher.favoritePositions
      .map((fp) => fp.position)
      .filter((p): p is NonNullable<typeof p> => Boolean(p)) ?? [];
  const backHref = safeFrom ?? null;
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
  const avatarFolder = process.env.NEXT_PUBLIC_CLOUDINARY_AVATAR_FOLDER ?? "poleapp/avatars";

  return (
    <main className="flex min-h-screen w-full flex-col gap-4">
      <section className="panel space-y-5 border-indigo-400/25 p-6 shadow-indigo-900/30">
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
              path={`/app/teachers/${teacher.id}`}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-300/70 hover:bg-white/10"
            />
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
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
        </div>
      </section>

      {canEdit && (
        <>
          <TeacherEditPanel
            teacherId={teacher.id}
            defaults={{
              firstName: firstNameDefault,
              lastName: lastNameDefault,
              age: teacher.age,
              avatarUrl: teacher.avatarUrl,
              avatarPublicId: teacher.avatarPublicId,
              diplomas: teacher.diplomas,
              favoritePositionIds,
            }}
            positions={positions}
            returnTo={backHref}
          />

          <section className="panel space-y-5 border-indigo-400/15 p-6">
            <details className="group space-y-3">
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
              <div className="pt-1">
                <TeacherAvatarManager
                  teacherId={teacher.id}
                  folder={avatarFolder}
                  returnTo={backHref}
                  initialUrl={teacher.avatarUrl ?? null}
                  initialPublicId={teacher.avatarPublicId ?? null}
                />
                <p className="text-sm text-slate-300">Upload signé Cloudinary (auth), formats jpg/png/webp, 4 Mo max.</p>
              </div>
            </details>
          </section>
        </>
      )}
    </main>
  );
}
