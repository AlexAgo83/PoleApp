import Link from "next/link";
import { getServerSession } from "next-auth";

import { CircularRedFox } from "@/components/FoxVignette";
import HealthBadge from "@/components/HealthBadge";
import { authOptions } from "@/lib/auth";
import { defaultHomeForRole } from "@/lib/rbac";
import { appSignature } from "@/lib/appMeta";

const billingStatus = "Livré";

const moduleSections = [
  {
    title: "Positions",
    href: "/positions",
    description:
      "Base positions + médias, filtres, vignettes 2 colonnes, détail partageable, retour contextuel.",
    status: "Étape 8-9",
    role: "Élève / Professeur / Admin",
    icon: "🌀",
  },
  {
    title: "Cours",
    href: "/teacher/courses",
    description: "Création cours, présences, notes, durée et mise à jour progression.",
    status: "Étape 5-9",
    role: "Professeur",
    icon: "📅",
  },
  {
    title: "Élèves",
    href: "/teacher/students",
    description:
      "Fiches élèves, progression, blessures visibles par professeur.",
    status: "Étapes 3-4",
    role: "Professeur / Admin",
    icon: "🧑‍🎓",
  },
  {
    title: "Mini-jeu",
    href: "/student/game",
    description: "6 modes (photo/type/niveau/grips/description + blitz), historique et leaderboard.",
    status: "Étape 6-9",
    role: "Élève / Prof / Admin",
    icon: "🎯",
  },
  {
    title: "Admin école",
    href: "/admin",
    description: "Pilotage école : utilisateurs, stats rapides, studios et partenaires.",
    status: "Étape 7",
    role: "Admin",
    icon: "🏢",
  },
  {
    title: "Agenda (élève)",
    href: "/student/courses/agenda",
    description: "Vue agenda mensuelle + semaine, filtres studios/profs/« mes cours » sans scroll mobile.",
    status: "Étape 9",
    role: "Élève",
    icon: "🗓️",
  },
  {
    title: "Agenda (prof/admin)",
    href: "/teacher/courses/agenda",
    description: "Agenda cours avec filtres studio/prof, navigation mois + vue semaine.",
    status: "Étape 9",
    role: "Professeur / Admin",
    icon: "📆",
  },
  {
    title: "École (élève)",
    href: "/student/school",
    description: "Studios/partenaires + agenda école (semaine/mois) et prochains cours.",
    status: "Étape 9",
    role: "Élève",
    icon: "🏫",
  },
  {
    title: "Crédits & achats",
    href: "/student",
    description: "Solde crédits visible, bouton Acheter des crédits (demo) et règles d’inscription.",
    status: "Étape 9",
    role: "Élève",
    icon: "💳",
  },
  {
    title: "Facturation (admin)",
    href: "/admin/billing",
    description: "Factures cours avec filtres/statuts, export CSV, backfill, actions guidées.",
    status: billingStatus,
    role: "Admin",
    icon: "💼",
  },
  {
    title: "Facturation (prof)",
    href: "/teacher/billing",
    description: "Vue lecture factures de mes cours (montants/statuts).",
    status: billingStatus,
    role: "Professeur",
    icon: "🧾",
  },
  {
    title: "Studios & partenaires",
    href: "/admin/studios",
    description: "Gestion studios (toggle lecture/édition), accès partenaires et navigation admin.",
    status: "Étape 9",
    role: "Admin",
    icon: "🏬",
  },
  {
    title: "Profile",
    href: "/profile",
    description: "Consulter et mettre à jour prénom/nom, voir email, rôle et école.",
    status: "Étape 8",
    role: "Élève / Professeur / Admin",
    icon: "👤",
  },
];

const roleLabels: Record<string, string> = {
  STUDENT: "Élève",
  TEACHER: "Professeur",
  SCHOOL_ADMIN: "Admin école",
  SUPER_ADMIN: "Super Admin",
};

export default async function Home() {
  const session = await getServerSession(authOptions);
  const homeForRole = defaultHomeForRole(session?.user?.role);
  const isAuthenticated = Boolean(session?.user);

  return (
    <main className="relative mx-auto flex min-h-screen max-w-6xl flex-col gap-3 px-2 pt-0 pb-2 md:gap-6 md:px-8 md:pt-0 md:pb-4">
      <div className="flex flex-1 items-center justify-center">
        <div className="relative flex flex-col items-center gap-16 md:gap-4">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-[18rem] w-[18rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.32),rgba(99,102,241,0.08)_55%,transparent_72%)] blur-3xl opacity-90 md:h-[22rem] md:w-[22rem]" />
          </div>
          <CircularRedFox
            sizeClass="h-36 w-36 md:h-[10.5rem] md:w-[10.5rem]"
            href={isAuthenticated ? homeForRole : "/login"}
          />
          <Link
            href={isAuthenticated ? homeForRole : "/login"}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            Continuer
          </Link>
          <p className="text-xs text-slate-300/80">{appSignature}</p>
        </div>
      </div>

    </main>
  );
}
