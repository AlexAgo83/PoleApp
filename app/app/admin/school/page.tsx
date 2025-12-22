import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateSchoolAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminSchoolPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SCHOOL_ADMIN" || !session.user.schoolId) {
    redirect("/access-denied");
  }

  const baseSchool = await prisma.school.findUnique({
    where: { id: session.user.schoolId },
    select: {
      id: true,
      name: true,
      photoUrl: true,
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
  try {
    const withWebsite = await prisma.school.findUnique({
      where: { id: session.user.schoolId },
      select: { website: true },
    });
    schoolWebsite = withWebsite?.website ?? null;
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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-3 px-0 py-6 md:gap-6 md:px-8 md:py-10">
      <header className="panel p-6">
        <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Admin</p>
        <h1 className="text-3xl font-semibold text-white">Fiche école</h1>
        <p className="text-sm text-slate-300">
          Modifier les informations visibles par les professeurs et élèves rattachés.
        </p>
        <div className="mt-3 flex flex-wrap justify-end gap-3 text-sm">
          <Link
            href="/app/admin"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            ← Retour dashboard
          </Link>
        </div>
      </header>

      <section className="panel space-y-4 p-6">
        <div className="flex flex-col gap-1">
          <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Identité</p>
          <h2 className="text-xl font-semibold text-white">{baseSchool?.name ?? "École"}</h2>
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
          </p>
        </div>

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
              defaultValue={baseSchool?.photoUrl ?? ""}
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
      </section>

      {baseSchool?.photoUrl && (
        <section className="panel p-6">
          <h3 className="text-lg font-semibold text-white">Photo de l’école</h3>
          <div className="mt-3">
            <img
              src={baseSchool.photoUrl}
              alt={`Photo de l’école ${baseSchool.name}`}
              className="h-48 w-full rounded-xl border border-white/10 object-cover shadow"
            />
          </div>
        </section>
      )}

      <section className="panel space-y-3 p-6">
        <h3 className="text-lg font-semibold text-white">Résumé</h3>
        <div className="grid grid-cols-2 gap-3 text-sm text-slate-200 md:grid-cols-3">
          <Stat label="Utilisateurs" value={totalUsers} />
          <Stat label="Profs" value={teacherCount} />
          <Stat label="Élèves" value={studentCount} />
          <Stat label="Studios" value={studioCount} />
          <Stat label="Partenaires" value={partnerCount} />
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
