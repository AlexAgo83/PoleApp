import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { SafeImage } from "@/components/SafeImage";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { COURSE_PLACEHOLDER } from "@/lib/placeholders";

export const dynamic = "force-dynamic";

export default async function TeacherSchoolPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !session.user.schoolId) {
    redirect("/access-denied");
  }
  if (session.user.role !== "TEACHER" && session.user.role !== "SCHOOL_ADMIN") {
    redirect("/access-denied");
  }

  type SchoolView = {
    id: string;
    name: string;
    photoUrl: string | null;
    website: string | null;
    studios: { id: string; name: string; address: string | null }[];
    partners: {
      id: string;
      name: string;
      kind: string | null;
      description: string | null;
      website: string | null;
      sponsoredLinks: { id: string; category: string | null; label: string | null; url: string }[];
    }[];
  };

  let school: SchoolView | null = null;
  try {
    const fetched = await prisma.school.findUnique({
      where: { id: session.user.schoolId },
      select: {
        id: true,
        name: true,
        photoUrl: true,
        website: true,
        studios: { select: { id: true, name: true, address: true } },
        partners: {
          select: {
            id: true,
            name: true,
            kind: true,
            description: true,
            website: true,
            sponsoredLinks: { select: { id: true, category: true, label: true, url: true } },
          },
        },
      },
    });
    if (fetched) {
      school = {
        id: fetched.id,
        name: fetched.name,
        photoUrl: fetched.photoUrl ?? null,
        website: fetched.website ?? null,
        studios: fetched.studios,
        partners: fetched.partners,
      };
    }
  } catch (err) {
    const message = (err as Error)?.message.toLowerCase() ?? "";
    const shouldFallback = message.includes("website") || message.includes("photourl");
    if (!shouldFallback) {
      throw err;
    }
    const fetched = await prisma.school.findUnique({
      where: { id: session.user.schoolId },
      select: {
        id: true,
        name: true,
        studios: { select: { id: true, name: true, address: true } },
        partners: {
          select: {
            id: true,
            name: true,
            kind: true,
            description: true,
            website: true,
            sponsoredLinks: { select: { id: true, category: true, label: true, url: true } },
          },
        },
      },
    });
    if (fetched) {
      school = {
        id: fetched.id,
        name: fetched.name,
        photoUrl: null,
        website: null,
        studios: fetched.studios,
        partners: fetched.partners,
      };
    }
  }

  if (!school) {
    redirect("/access-denied");
  }

  return (
    <main className="flex min-h-screen w-full flex-col gap-4">
      <header className="panel flex flex-wrap items-center justify-between gap-3 border-indigo-400/25 p-6 shadow-indigo-900/30">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-indigo-100">
            {session.user.role === "SCHOOL_ADMIN" ? "Admin" : "Professeur"}
          </p>
          <h1 className="text-3xl font-semibold text-white">École</h1>
          <p className="text-sm text-slate-200">{school.name}</p>
          {school.website ? (
            <a
              href={school.website}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-cyan-200 underline underline-offset-2"
            >
              Site web
            </a>
          ) : null}
        </div>
        {session.user.role === "SCHOOL_ADMIN" ? (
          <Link
            href="/app/admin"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-normal text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            ← Retour dashboard
          </Link>
        ) : (
          <Link
            href="/app/teacher"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-normal text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            ← Retour accueil
          </Link>
        )}
        {school.photoUrl && (
          <div className="mt-3 w-full">
            <SafeImage
              src={school.photoUrl}
              alt={`Photo de l’école ${school.name}`}
              width={1200}
              height={360}
              className="h-56 w-full rounded-xl border border-white/10 object-cover shadow"
              fallbackSrc={COURSE_PLACEHOLDER}
            />
          </div>
        )}
      </header>

      <section className="panel p-6">
        <h2 className="text-lg font-semibold text-white">Studios</h2>
        {school.studios.length === 0 ? (
          <p className="text-slate-300">Aucun studio renseigné.</p>
        ) : (
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {school.studios.map((studio) => (
              <li
                key={studio.id}
                className="rounded-xl border border-white/10 bg-white/5 p-3 text-slate-200"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-base font-semibold text-white">{studio.name}</p>
                  <Link
                    href={`/app/school/${studio.id}?view=agenda&range=month`}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
                  >
                    Voir le studio
                  </Link>
                </div>
                {studio.address && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(studio.address)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-cyan-300 transition hover:text-cyan-200"
                  >
                    {studio.address}
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

    </main>
  );
}
