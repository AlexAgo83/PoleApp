import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Props = {
  params: { id: string };
};

export default async function TeacherStudentDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.schoolId) {
    redirect("/access-denied");
  }

  const student = await prisma.user.findFirst({
    where: {
      id: params.id,
      schoolId: session.user.schoolId,
      role: "STUDENT",
    },
    select: {
      id: true,
      email: true,
      name: true,
      isPremium: true,
      injuries: {
        include: { injuryType: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!student) {
    redirect("/access-denied");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-10">
      <header className="panel p-6">
        <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">
          Prof / Admin
        </p>
        <h1 className="text-3xl font-semibold text-white">Fiche élève</h1>
        <p className="text-sm text-slate-300">
          {student.name ?? student.email} · {student.email} ·{" "}
          {student.isPremium ? "Premium" : "Free"}
        </p>
      </header>

      <section className="panel p-6">
        <h2 className="text-lg font-semibold text-white">Blessures</h2>
        <div className="mt-4 flex flex-col divide-y divide-white/5">
          {student.injuries.map((injury) => (
            <article key={injury.id} className="py-3">
              <p className="text-base font-semibold text-white">
                {injury.injuryType.name} ·{" "}
                <span className={injury.isActive ? "text-amber-200" : "text-green-200"}>
                  {injury.isActive ? "Active" : "Résolue"}
                </span>
              </p>
              {injury.notes && (
                <p className="text-sm text-slate-200">Notes : {injury.notes}</p>
              )}
            </article>
          ))}
          {student.injuries.length === 0 && (
            <p className="py-4 text-slate-200">Aucune blessure déclarée.</p>
          )}
        </div>
      </section>
    </main>
  );
}
