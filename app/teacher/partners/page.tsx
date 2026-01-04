"use server";

import Link from "next/link";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PartnerProductsCarousel } from "../../student/PartnerProductsCarousel";

export default async function TeacherPartnersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.schoolId || (session.user.role !== "TEACHER" && session.user.role !== "SCHOOL_ADMIN")) {
    return (
      <main className="flex min-h-screen w-full flex-col gap-4 p-6">
        <section className="panel panel-body lg-gap">
          <h1 className="text-2xl font-semibold text-white">Partenaires</h1>
          <p className="text-slate-300">Accès réservé aux professeurs/admins rattachés à une école.</p>
          <Link
            href="/teacher"
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            ← Retour accueil
          </Link>
        </section>
      </main>
    );
  }

  const partners = await prisma.partner.findMany({
    where: { schoolId: session.user.schoolId },
    select: {
      id: true,
      name: true,
      kind: true,
      website: true,
      description: true,
      sponsoredLinks: { select: { id: true, category: true, label: true, url: true } },
    },
    orderBy: { name: "asc" },
  });

  const partnerProducts = partners
    .flatMap((partner) =>
      partner.sponsoredLinks.map((link) => ({
        id: link.id,
        partnerId: partner.id,
        partnerName: partner.name,
        partnerKind: partner.kind,
        category: link.category,
        label: link.label,
        url: link.url,
      }))
    )
    .slice(0, 16);

  return (
    <main className="flex w-full flex-col gap-4">
      <section className="panel panel-body lg-gap">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold text-white">Partenaires de l’école</h1>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/teacher/school"
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
            >
              Fiche école
            </Link>
          </div>
        </div>

        <div className="panel-grid lg-gap md:grid-cols-2 xl:grid-cols-3">
          {partners.map((partner) => (
            <div
              key={partner.id}
              className="flex min-w-0 flex-col gap-1 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200 transition hover:border-cyan-300/70 hover:bg-white/10"
            >
              <p className="text-base font-semibold text-white">{partner.name}</p>
              {partner.kind && <p className="text-xs uppercase tracking-[0.12em] text-cyan-200">{partner.kind}</p>}
              {partner.description && <p className="text-sm text-slate-300">{partner.description}</p>}
              {partner.website && (
                <a
                  href={`/api/partners/redirect?partnerId=${partner.id}&url=${encodeURIComponent(partner.website)}&type=click`}
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

        {partnerProducts.length > 0 && (
          <div className="panel-body lg-gap">
            <h2 className="text-lg font-semibold text-white">Offres sponsorisées</h2>
            <PartnerProductsCarousel items={partnerProducts} />
          </div>
        )}
      </section>
    </main>
  );
}
