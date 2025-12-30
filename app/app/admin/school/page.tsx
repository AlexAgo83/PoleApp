import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { SafeImage } from "@/components/SafeImage";
import { FoxPageHeader } from "@/components/FoxPageHeader";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { COURSE_PLACEHOLDER } from "@/lib/placeholders";
import { createStudioAction, deleteStudioAction, updateStudioAction } from "../studios/actions";
import { CollapsibleSection } from "./CollapsibleSection";
import {
  createDisciplineAction,
  deleteDisciplineAction,
  updateDisciplineAction,
  updateSchoolAction,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminSchoolPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
} = {}) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SCHOOL_ADMIN" || !session.user.schoolId) {
    redirect("/access-denied");
  }

  const resolvedParams = (await searchParams) ?? {};
  const getValue = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);
  const flash = getValue(resolvedParams.flash);
  const flashMessage = getValue(resolvedParams.flashMessage);
  const disciplinePageRaw = Number(getValue(resolvedParams.disciplinePage) ?? "1");
  const disciplinePage = Math.max(1, Number.isFinite(disciplinePageRaw) ? disciplinePageRaw : 1);
  const editStudioId = getValue(resolvedParams.edit);

  const baseSchool = await prisma.school.findUnique({
    where: { id: session.user.schoolId },
    select: {
      id: true,
      name: true,
      studios: { select: { id: true, name: true, address: true } },
      partners: {
        select: {
          id: true,
          name: true,
          description: true,
          website: true,
          sponsoredLinks: { select: { id: true, category: true, label: true, url: true } },
        },
      },
    },
  });
  let schoolWebsite: string | null = null;
  let schoolPhoto: string | null = null;
  try {
    const withExtras = await prisma.school.findUnique({
      where: { id: session.user.schoolId },
      select: { website: true },
    });
    schoolWebsite = withExtras?.website ?? null;
  } catch {
    // Column may not exist; ignore.
  }
  try {
    const rows = await prisma.$queryRawUnsafe<{ photoUrl: string | null }[]>(
      `SELECT "photoUrl" FROM "School" WHERE "id" = '${session.user.schoolId}' LIMIT 1`
    );
    schoolPhoto = rows?.[0]?.photoUrl ?? null;
  } catch {
    // Column may not exist; ignore.
  }

  const [totalUsers, teacherCount, studentCount, studioCount, partnerCount] = await Promise.all([
    prisma.user.count({ where: { schoolId: session.user.schoolId } }),
    prisma.user.count({ where: { schoolId: session.user.schoolId, role: "TEACHER" } }),
    prisma.user.count({ where: { schoolId: session.user.schoolId, role: "STUDENT" } }),
    prisma.studio.count({ where: { schoolId: session.user.schoolId } }),
    prisma.partner.count({ where: { schoolId: session.user.schoolId } }),
  ]);
  const studioPageRaw = Number(getValue(resolvedParams.studioPage) ?? "1");
  const studioPage = Math.max(1, Number.isFinite(studioPageRaw) ? studioPageRaw : 1);
  const studioTotalPages = Math.max(1, Math.ceil(studioCount / 6));
  const currentStudioPage = Math.min(studioPage, studioTotalPages);
  const studios = await prisma.studio.findMany({
    where: { schoolId: session.user.schoolId },
    select: { id: true, name: true, address: true, photoUrl: true },
    orderBy: { name: "asc" },
    skip: (currentStudioPage - 1) * 6,
    take: 6,
  });
  const disciplineCount = await prisma.discipline.count({ where: { schoolId: session.user.schoolId } });
  const disciplineTotalPages = Math.max(1, Math.ceil(disciplineCount / 6));
  const currentDisciplinePage = Math.min(disciplinePage, disciplineTotalPages);
  const redirectParams = new URLSearchParams();
  if (currentDisciplinePage > 1) redirectParams.set("disciplinePage", currentDisciplinePage.toString());
  if (currentStudioPage > 1) redirectParams.set("studioPage", currentStudioPage.toString());
  const redirectToSchool =
    redirectParams.toString().length > 0 ? `/app/admin/school?${redirectParams.toString()}` : "/app/admin/school";
  const disciplines = await prisma.discipline.findMany({
    where: { schoolId: session.user.schoolId },
    select: { id: true, name: true, color: true },
    orderBy: { name: "asc" },
    skip: (currentDisciplinePage - 1) * 6,
    take: 6,
  });

  const headerBg = schoolPhoto ?? COURSE_PLACEHOLDER;

  return (
    <main className="flex min-h-screen w-full flex-col gap-4">
      <section
        className="panel space-y-3 p-6"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(10,15,30,0.85), rgba(15,25,45,0.7)), url(${headerBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <h3 className="text-2xl font-semibold text-white">{baseSchool?.name ?? "École"}</h3>
        <div className="grid grid-cols-2 gap-3 text-sm text-slate-200 md:grid-cols-3">
          <Stat label="Utilisateurs" value={totalUsers} />
          <Stat label="Profs" value={teacherCount} />
          <Stat label="Élèves" value={studentCount} />
          <Stat label="Studios" value={studioCount} />
          <Stat label="Partenaires" value={partnerCount} />
          <Stat label="Disciplines" value={disciplineCount} />
        </div>
      </section>

      {flash && flashMessage && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm shadow-lg ${
            flash === "success"
              ? "border-emerald-300/60 bg-emerald-500/15 text-emerald-50 shadow-emerald-900/30"
              : "border-amber-300/60 bg-amber-500/15 text-amber-50 shadow-amber-900/30"
          }`}
        >
          {flashMessage}
        </div>
      )}

      <section className="panel space-y-4 p-6">
        <CollapsibleSection
          id="identity"
          defaultOpen={resolvedParams.identityOpen === "true"}
          summary={
            <>
              <h3 className="flex-1 text-xl font-semibold text-white">Identité</h3>
              <span className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white transition hover:border-cyan-300/70 hover:bg-white/10 group-open:border-white/15 group-open:bg-white/5">
                <span className="group-open:hidden">Modifier</span>
                <span className="hidden group-open:inline">Fermer</span>
              </span>
            </>
          }
        >
          <div className="space-y-4 pt-1">
            <p className="text-sm text-slate-300">
              ID : <span className="font-mono text-slate-200">{baseSchool?.id ?? "—"}</span>
              {schoolWebsite ? (
                <>
                  {" · "}
                  <Link
                    href={schoolWebsite}
                    className="text-cyan-200 underline underline-offset-2"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Site web
                  </Link>
                </>
              ) : null}
              {schoolPhoto && (
                <>
                  {" · "}
                  <span className="text-slate-400">Photo définie</span>
                </>
              )}
            </p>

            <form action={updateSchoolAction} className="space-y-3">
              <input type="hidden" name="schoolId" value={session.user.schoolId} />
              <label className="block text-sm text-slate-200">
                Nom de l’école
                <input
                  name="name"
                  defaultValue={baseSchool?.name ?? ""}
                  required
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-indigo-400"
                />
              </label>
              <label className="block text-sm text-slate-200">
                Photo (URL)
                <input
                  name="photoUrl"
                  type="url"
                  placeholder="https://..."
                  defaultValue={schoolPhoto ?? ""}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-indigo-400"
                />
              </label>
              <label className="block text-sm text-slate-200">
                Site web (optionnel)
                <input
                  name="website"
                  type="url"
                  placeholder="https://..."
                  defaultValue={schoolWebsite ?? ""}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-indigo-400"
                />
              </label>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
                >
                  Sauvegarder
                </button>
              </div>
            </form>
          </div>
        </CollapsibleSection>
      </section>

      <section className="panel space-y-4 p-6">
        <CollapsibleSection
          id="disciplines"
          defaultOpen={resolvedParams.disciplinesOpen === "true"}
          summary={
            <>
              <h3 className="flex-1 text-xl font-semibold text-white">Disciplines</h3>
              <span className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white transition hover:border-cyan-300/70 hover:bg-white/10 group-open:border-white/15 group-open:bg-white/5">
                <span className="group-open:hidden">Modifier</span>
                <span className="hidden group-open:inline">Fermer</span>
              </span>
            </>
          }
        >

          <div className="space-y-4 pt-1">
            <div className="grid gap-3 md:grid-cols-2">
              {disciplines.map((d) => (
                <div
                  key={d.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-4 w-4 rounded-full border border-white/20"
                        style={{ backgroundColor: d.color }}
                        aria-hidden="true"
                      />
                      <span className="font-semibold text-white">{d.name}</span>
                    </div>
                    <form action={deleteDisciplineAction}>
                      <input type="hidden" name="disciplineId" value={d.id} />
                      <button
                        type="submit"
                        className="text-xs font-semibold text-red-200 hover:text-red-100"
                      >
                        Supprimer
                      </button>
                    </form>
                  </div>
                  <form action={updateDisciplineAction} className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-5 md:items-end">
                    <input type="hidden" name="disciplineId" value={d.id} />
                    <label className="text-xs text-slate-300 md:col-span-3">
                      Nom
                      <input
                        name="name"
                        defaultValue={d.name}
                        required
                        className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white outline-none focus:border-cyan-400/70"
                      />
                    </label>
                    <label className="text-xs text-slate-300 md:col-span-1">
                      Couleur
                      <input
                        type="color"
                        name="color"
                        defaultValue={d.color}
                        className="mt-1 h-[42px] w-full rounded-lg border border-white/10 bg-white/5 p-1"
                      />
                    </label>
                    <div className="md:col-span-1 flex justify-end">
                      <button
                        type="submit"
                        className="w-full rounded-xl border border-cyan-400/60 bg-cyan-500/20 px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-500/30"
                      >
                        Mettre à jour
                      </button>
                    </div>
                  </form>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-200">
              <span>
                Page {currentDisciplinePage} / {disciplineTotalPages} · {disciplineCount} disciplines
              </span>
              <div className="flex gap-2">
                {currentDisciplinePage > 1 ? (
                  <Link
                    href={`?disciplinePage=${currentDisciplinePage - 1}`}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-semibold text-white transition hover:border-cyan-300/70 hover:bg-white/10"
                  >
                    Précédent
                  </Link>
                ) : null}
                {currentDisciplinePage < disciplineTotalPages ? (
                  <Link
                    href={`?disciplinePage=${currentDisciplinePage + 1}`}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-semibold text-white transition hover:border-cyan-300/70 hover:bg-white/10"
                  >
                    Suivant
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h4 className="text-sm font-semibold text-white">Créer une discipline</h4>
              <p className="text-xs text-slate-300">Nom + couleur. Suppression bloquée si utilisée par un cours.</p>
              <form action={createDisciplineAction} className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-5 md:items-end">
                <label className="text-xs text-slate-300 md:col-span-3">
                  Nom
                  <input
                    name="name"
                    required
                    placeholder="Danse, Pole, Exotic..."
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/70"
                  />
                </label>
                <label className="text-xs text-slate-300 md:col-span-1">
                  Couleur
                  <input
                    type="color"
                    name="color"
                    defaultValue="#7c3aed"
                    className="mt-1 h-[44px] w-full rounded-lg border border-white/10 bg-white/5 p-1"
                  />
                </label>
                <div className="md:col-span-1 flex justify-end">
                  <button
                    type="submit"
                    className="w-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 px-3 py-2 text-xs font-semibold text-white shadow-lg transition hover:brightness-110"
                  >
                    Ajouter
                  </button>
                </div>
              </form>
            </div>
          </div>
        </CollapsibleSection>
      </section>

      <section className="panel space-y-4 p-6">
        <CollapsibleSection
          id="studios"
          defaultOpen={resolvedParams.studiosOpen === "true" || Boolean(editStudioId)}
          summary={
            <>
              <h3 className="flex-1 text-xl font-semibold text-white">Studios</h3>
              <span className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white transition hover:border-cyan-300/70 hover:bg-white/10 group-open:border-white/15 group-open:bg-white/5">
                <span className="group-open:hidden">Modifier</span>
                <span className="hidden group-open:inline">Fermer</span>
              </span>
            </>
          }
        >

          <div className="space-y-4 pt-1">
            {studios.length === 0 ? (
              <p className="text-sm text-slate-200">Aucun studio pour le moment.</p>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  {studios.map((studio) => (
                    <article
                      key={studio.id}
                      className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-indigo-900/10"
                      style={{
                        backgroundImage: `linear-gradient(135deg, rgba(10,15,30,0.82), rgba(15,25,45,0.68)), url(${studio.photoUrl ?? COURSE_PLACEHOLDER})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    >
                      {(() => {
                        const baseParams = new URLSearchParams();
                        if (currentDisciplinePage > 1) {
                          baseParams.set("disciplinePage", currentDisciplinePage.toString());
                        }
                        if (currentStudioPage > 1) {
                          baseParams.set("studioPage", currentStudioPage.toString());
                        }
                        const editParams = new URLSearchParams(baseParams);
                        editParams.set("edit", studio.id);
                        const cancelHref = `/app/admin/school${
                          baseParams.toString() ? `?${baseParams.toString()}` : ""
                        }`;
                        const editHref = `/app/admin/school${editParams.toString() ? `?${editParams.toString()}` : ""}`;
                        const isEditing = editStudioId === studio.id;

                        if (!isEditing) {
                          return (
                            <>
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-indigo-100">
                                    Studio
                                  </span>
                                  <Link
                                    href={editHref}
                                    className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
                                  >
                                    ✏️ Éditer
                                  </Link>
                                  <Link
                                    href={`/app/school/${studio.id}?view=agenda&range=month`}
                                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
                                  >
                                    Voir la fiche
                                  </Link>
                                </div>
                                <form action={deleteStudioAction}>
                                  <input type="hidden" name="studioId" value={studio.id} />
                                  <input type="hidden" name="redirectTo" value={redirectToSchool} />
                                  <button
                                    type="submit"
                                    className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100 transition hover:border-red-400 hover:bg-red-500/20"
                                  >
                                    Supprimer
                                  </button>
                                </form>
                              </div>
                              <div className="space-y-2">
                                <p className="text-base font-semibold text-white">{studio.name}</p>
                                {studio.address ? (
                                  <p className="text-sm text-cyan-100">
                                    Adresse : {studio.address}{" "}
                                    <a
                                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(studio.address)}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-xs font-semibold text-cyan-200 underline underline-offset-2 transition hover:text-cyan-100"
                                    >
                                      Ouvrir dans Google Maps
                                    </a>
                                  </p>
                                ) : (
                                  <p className="text-sm text-slate-200">Adresse non renseignée.</p>
                                )}
                                {studio.photoUrl ? <p className="text-xs text-slate-300">Photo disponible</p> : null}
                              </div>
                            </>
                          );
                        }

                        return (
                          <>
                            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-cyan-400/40 bg-white/5 p-3 text-sm text-slate-200 shadow-inner shadow-indigo-900/10">
                              <Link
                                href={cancelHref}
                                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
                              >
                                Annuler
                              </Link>
                              <form action={deleteStudioAction} className="m-0">
                                <input type="hidden" name="studioId" value={studio.id} />
                                <input type="hidden" name="redirectTo" value={redirectToSchool} />
                                <button
                                  type="submit"
                                  className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100 transition hover:border-red-400 hover:bg-red-500/20"
                                >
                                  Supprimer
                                </button>
                              </form>
                            </div>
                            <form
                              action={updateStudioAction}
                              className="grid gap-3 rounded-2xl border border-cyan-400/40 bg-white/5 p-4 shadow-inner shadow-indigo-900/10 text-sm text-slate-200 md:grid-cols-2 md:gap-4"
                            >
                              <input type="hidden" name="studioId" value={studio.id} />
                              <input type="hidden" name="redirectTo" value={redirectToSchool} />
                              <label className="grid gap-1">
                                Nom
                                <input
                                  name="name"
                                  defaultValue={studio.name}
                                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
                                  required
                                />
                              </label>
                              <label className="grid gap-1">
                                Adresse (optionnel)
                                <input
                                  name="address"
                                  defaultValue={studio.address ?? ""}
                                  placeholder="Adresse"
                                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
                                />
                              </label>
                              <label className="grid gap-1">
                                Photo (URL)
                                <input
                                  name="photoUrl"
                                  defaultValue={studio.photoUrl ?? ""}
                                  placeholder="https://..."
                                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
                                  type="url"
                                />
                              </label>
                              <div className="md:col-span-2 flex flex-wrap justify-end gap-2">
                                <button
                                  type="submit"
                                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
                                >
                                  Sauvegarder
                                </button>
                              </div>
                            </form>
                          </>
                        );
                      })()}
                    </article>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between text-sm text-slate-200">
                  <Link
                    href={`/app/admin/school?${new URLSearchParams({
                      ...(currentDisciplinePage > 1 ? { disciplinePage: currentDisciplinePage.toString() } : {}),
                      studioPage: Math.max(1, currentStudioPage - 1).toString(),
                    }).toString()}`}
                    className={`rounded-full px-3 py-2 font-semibold ${
                      currentStudioPage === 1
                        ? "cursor-not-allowed border border-white/10 text-slate-500"
                        : "border border-white/10 text-white hover:border-cyan-400/70 hover:bg-white/5"
                    }`}
                    aria-disabled={currentStudioPage === 1}
                  >
                    Précédent
                  </Link>
                  <span>
                    Page {currentStudioPage} / {studioTotalPages}
                  </span>
                  <Link
                    href={`/app/admin/school?${new URLSearchParams({
                      ...(currentDisciplinePage > 1 ? { disciplinePage: currentDisciplinePage.toString() } : {}),
                      studioPage: Math.min(studioTotalPages, currentStudioPage + 1).toString(),
                    }).toString()}`}
                    className={`rounded-full px-3 py-2 font-semibold ${
                      currentStudioPage === studioTotalPages
                        ? "cursor-not-allowed border border-white/10 text-slate-500"
                        : "border border-white/10 text-white hover:border-cyan-400/70 hover:bg-white/5"
                    }`}
                    aria-disabled={currentStudioPage === studioTotalPages}
                  >
                    Suivant
                  </Link>
                </div>
              </>
            )}

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-sm font-semibold text-white">Ajouter un studio</h3>
              <form action={createStudioAction} className="mt-3 grid gap-3 md:grid-cols-2">
                <input type="hidden" name="redirectTo" value={redirectToSchool} />
                <label className="text-sm text-slate-200">
                  Nom
                  <input
                    name="name"
                    required
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
                  />
                </label>
                <label className="text-sm text-slate-200">
                  Adresse (optionnel)
                  <input
                    name="address"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
                  />
                </label>
                <label className="text-sm text-slate-200 md:col-span-2">
                  Photo (URL)
                  <input
                    name="photoUrl"
                    type="url"
                    placeholder="https://..."
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
                  />
                </label>
                <div className="md:col-span-2 flex justify-end">
                  <button
                    type="submit"
                    className="rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
                  >
                    Ajouter
                  </button>
                </div>
              </form>
            </div>
          </div>
        </CollapsibleSection>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
