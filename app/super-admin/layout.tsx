import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { FoxPageHeader } from "@/components/FoxPageHeader";
import { authOptions } from "@/lib/auth";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/access-denied");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 px-2 pt-0 pb-2 md:px-8 md:pt-0 md:pb-4">
      <FoxPageHeader
        eyebrow="Super admin"
        title="Backoffice global"
        buttons={[
          { label: "Accueil", href: "/" },
          { label: "Déconnexion", href: "/api/auth/signout" },
        ]}
        foxHref="/"
      />
      {children}
    </main>
  );
}
