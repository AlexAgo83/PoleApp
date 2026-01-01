import { getServerSession } from "next-auth";

import { FoxPageHeader } from "@/components/FoxPageHeader";
import { authOptions } from "@/lib/auth";
import { defaultHomeForRole } from "@/lib/rbac";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const roleTitle =
    session?.user?.role === "SCHOOL_ADMIN"
      ? "Dashboard admin"
      : session?.user?.role === "TEACHER"
        ? "Espace prof"
        : session?.user
          ? "Espace élève"
          : "Espace";
  const teacherShortcuts =
    session?.user?.role === "TEACHER"
      ? [
          { label: "Planning", href: "/teacher/courses/agenda?view=month" },
          { label: "Positions", href: "/teacher/positions" },
        ]
      : [];
  const headerButtons = session?.user
    ? [
        ...teacherShortcuts,
        {
          label: "Mon espace",
          href: defaultHomeForRole(session.user.role),
          icon: <img src="/house.svg" alt="" className="h-4 w-4" />,
        },
        { label: "Déconnexion", href: "/api/auth/signout" },
      ]
    : [{ label: "Se connecter", href: "/login", variant: "primary" as const }];

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-2 pt-0 pb-2 md:px-8 md:pt-0 md:pb-4">
      <FoxPageHeader
        title={roleTitle}
        eyebrow={
          session?.user?.role === "SCHOOL_ADMIN"
            ? "Espace admin"
            : session?.user?.role === "TEACHER"
              ? "Espace prof"
              : "Espace élève"
        }
        buttons={headerButtons}
        foxHref="/"
      />
      {children}
    </main>
  );
}
