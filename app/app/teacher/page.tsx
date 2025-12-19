import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

export default async function TeacherDashboard() {
  const session = await getServerSession(authOptions);

  return (
    <section className="panel space-y-4 p-6">
      <h2 className="text-xl font-semibold text-white">
        Vue prof /app/teacher
      </h2>
      <p className="text-slate-300">
        Les futures pages prof (élèves, cours, positions) seront montées ici. La
        middleware limite l’accès à TEACHER ou SCHOOL_ADMIN.
      </p>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
        <p>
          Connecté en : <strong>{session?.user?.email}</strong>
        </p>
        <p>
          Rôle : <strong>{session?.user?.role}</strong>
        </p>
      </div>
    </section>
  );
}
