import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { FoxPageHeader } from "@/components/FoxPageHeader";

export const dynamic = "force-dynamic";

export default async function LogicsPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") {
    redirect("/access-denied");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 px-2 pt-0 pb-2 md:px-8 md:pt-0 md:pb-4">
      <FoxPageHeader
        eyebrow="Super admin"
        title="Logics"
        buttons={[
          { label: "Accueil super admin", href: "/super-admin" },
          { label: "Déconnexion", href: "/api/auth/signout" },
        ]}
        foxHref="/"
      />
    </main>
  );
}
