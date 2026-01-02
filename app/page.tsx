import Link from "next/link";
import { getServerSession } from "next-auth";

import { CircularRedFox } from "@/components/FoxVignette";
import { authOptions } from "@/lib/auth";
import { defaultHomeForRole } from "@/lib/rbac";
import { appSignature } from "@/lib/appMeta";

const billingStatus = "Livré";

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
