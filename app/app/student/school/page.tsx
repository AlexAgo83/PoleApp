import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function StudentSchoolPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    redirect("/access-denied");
  }
  if (!session.user.schoolId) {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-10">
        <section className="panel p-6">
          <h1 className="text-3xl font-semibold text-white">Mon école</h1>
          <p className="text-slate-300">Aucune école associée à ce compte.</p>
        </section>
      </main>
    );
  }

  const school = await prisma.school.findUnique({
    where: { id: session.user.schoolId },
    include: {
      studios: true,
      partners: {
        include: {
          sponsoredLinks: true,
        },
      },
    },
  });

  if (!school) {
    redirect("/access-denied");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="panel flex flex-wrap items-center justify-between gap-3 border-indigo-400/25 p-6 shadow-indigo-900/30">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-indigo-100">Élève</p>
          <h1 className="text-3xl font-semibold text-white">Mon école</h1>
          <p className="text-sm text-slate-200">{school.name}</p>
        </div>
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
                <p className="text-base font-semibold text-white">{studio.name}</p>
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
                <div className="mt-2 rounded-lg border border-white/10 bg-gradient-to-r from-indigo-900/30 via-slate-900/40 to-cyan-900/30 p-3 text-xs text-slate-300">
                  Carte (aperçu mock) – ouvre la carte sur le lien ci-dessus.
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel p-6">
        <h2 className="text-lg font-semibold text-white">Partenaires</h2>
        {school.partners.length === 0 ? (
          <p className="text-slate-300">Aucun partenaire renseigné.</p>
        ) : (
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {school.partners.map((partner) => (
              <li
                key={partner.id}
                className="rounded-xl border border-white/10 bg-white/5 p-3 text-slate-200"
              >
                <p className="text-base font-semibold text-white">{partner.name}</p>
                <p className="text-sm text-slate-300">{partner.kind}</p>
                {partner.website && (
                  <a
                    href={partner.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold text-cyan-300 transition hover:text-cyan-200"
                  >
                    Site web ↗
                  </a>
                )}
                {partner.description && (
                  <p className="text-sm text-slate-300">{partner.description}</p>
                )}
                {partner.sponsoredLinks && partner.sponsoredLinks.length > 0 && (
                  <div className="mt-2 space-y-1 text-sm text-slate-200">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-cyan-200">
                      Liens sponsorisés
                    </p>
                    <ul className="space-y-1">
                      {partner.sponsoredLinks.map((link) => (
                        <li key={link.id} className="flex flex-col gap-0.5">
                          <span className="text-xs text-slate-300">
                            {link.category}
                            {link.label ? ` · ${link.label}` : ""}
                          </span>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-semibold text-cyan-300 transition hover:text-cyan-200"
                          >
                            Consulter le lien
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
