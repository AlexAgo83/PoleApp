import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  action?: string;
  actor?: string;
  target?: string;
  from?: string;
  to?: string;
  page?: string;
}>;

export default async function AuditPage({ searchParams }: { searchParams?: SearchParams }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "SCHOOL_ADMIN")) {
    redirect("/access-denied");
  }

  const params = (await Promise.resolve(searchParams ?? {})) as {
    action?: string;
    actor?: string;
    target?: string;
    from?: string;
    to?: string;
    page?: string;
  };
  const rawPage = Number(params.page ?? "1");
  const pageSize = 20;
  const where: Prisma.AuditLogWhereInput = {
    ...(params.action
      ? { action: { contains: params.action.trim(), mode: Prisma.QueryMode.insensitive } }
      : {}),
    ...(params.target
      ? { target: { contains: params.target.trim(), mode: Prisma.QueryMode.insensitive } }
      : {}),
    ...(params.actor
      ? {
          actor: {
            OR: [
              { name: { contains: params.actor.trim(), mode: Prisma.QueryMode.insensitive } },
              { email: { contains: params.actor.trim(), mode: Prisma.QueryMode.insensitive } },
            ],
          },
        }
      : {}),
  };
  if (session.user.role === "SCHOOL_ADMIN" && session.user.schoolId) {
    where.details = {
      path: ["schoolId"],
      equals: session.user.schoolId,
    } as Prisma.JsonFilter;
  }
  const fromDate = params.from ? new Date(`${params.from}T00:00:00`) : null;
  const toDate = params.to ? new Date(`${params.to}T23:59:59`) : null;
  if (fromDate && !Number.isNaN(fromDate.getTime())) {
    where.createdAt = { ...(where.createdAt as Prisma.DateTimeFilter ?? {}), gte: fromDate };
  }
  if (toDate && !Number.isNaN(toDate.getTime())) {
    where.createdAt = { ...(where.createdAt as Prisma.DateTimeFilter ?? {}), lte: toDate };
  }

  const totalCount = await prisma.auditLog.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(Math.max(1, rawPage || 1), totalPages);
  const skip = (currentPage - 1) * pageSize;

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip,
    take: pageSize,
    select: {
      id: true,
      action: true,
      target: true,
      details: true,
      createdAt: true,
      actor: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  const qs = (extra: Record<string, string | number | undefined>) => {
    const search = new URLSearchParams();
    if (params.action) search.set("action", params.action);
    if (params.actor) search.set("actor", params.actor);
    if (params.target) search.set("target", params.target);
    if (params.from) search.set("from", params.from);
    if (params.to) search.set("to", params.to);
    Object.entries(extra).forEach(([key, value]) => {
      if (value === undefined) return;
      search.set(key, String(value));
    });
    const str = search.toString();
    return str.length > 0 ? `?${str}` : "";
  };

  return (
    <main className="flex min-h-screen w-full flex-col gap-4">
      <header className="panel p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Super admin</p>
            <h1 className="text-3xl font-semibold text-white">Journal d’audit</h1>
            <p className="text-sm text-slate-300">
              Actions tracées (création, désactivation, réactivation, mises à jour). Pagination 20, tri décroissant.
            </p>
          </div>
          <Link
            href="/admin"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            ← Retour admin
          </Link>
        </div>
      </header>

      <section className="panel p-4 md:p-6">
        <h2 className="text-lg font-semibold text-white">Filtres</h2>
        <form method="get" className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="text-sm text-slate-200">
            Action
            <input
              name="action"
              type="text"
              defaultValue={params.action ?? ""}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              placeholder="ex: studio.disable"
            />
          </label>
          <label className="text-sm text-slate-200">
            Acteur (nom/email)
            <input
              name="actor"
              type="text"
              defaultValue={params.actor ?? ""}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              placeholder="Nom ou email"
            />
          </label>
          <label className="text-sm text-slate-200">
            Cible
            <input
              name="target"
              type="text"
              defaultValue={params.target ?? ""}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
              placeholder="Id ou libellé"
            />
          </label>
          <label className="text-sm text-slate-200">
            Date min
            <input
              name="from"
              type="date"
              defaultValue={params.from ?? ""}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
            />
          </label>
          <label className="text-sm text-slate-200">
            Date max
            <input
              name="to"
              type="date"
              defaultValue={params.to ?? ""}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
            />
          </label>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-400"
            >
              Filtrer
            </button>
            <Link
              href="/admin/audit"
              className="rounded-full border border-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
            >
              Réinitialiser
            </Link>
          </div>
        </form>
      </section>

      <section className="panel p-4 md:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Logs ({totalCount})</h2>
          <p className="text-sm text-slate-300">
            Page {currentPage} / {totalPages}
          </p>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10 text-sm text-slate-200">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.12em] text-slate-400">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Cible</th>
                <th className="px-3 py-2">Acteur</th>
                <th className="px-3 py-2">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-white/5">
                  <td className="px-3 py-2 text-slate-300">
                    {new Date(log.createdAt).toLocaleString("fr-FR", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-3 py-2 font-semibold text-white">{log.action}</td>
                  <td className="px-3 py-2">{log.target ?? "—"}</td>
                  <td className="px-3 py-2">
                    {log.actor
                      ? `${log.actor.name ?? log.actor.email ?? "Utilisateur"} (${log.actor.role})`
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-300">
                    <pre className="whitespace-pre-wrap break-words text-[11px]">
                      {log.details ? JSON.stringify(log.details) : "—"}
                    </pre>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-3 text-center text-slate-300">
                    Aucun log pour ces filtres.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-end gap-2 text-sm text-slate-200">
          <Link
            href={qs({ page: Math.max(1, currentPage - 1) })}
            aria-disabled={currentPage === 1}
            className={`rounded-full border border-white/10 px-3 py-2 ${
              currentPage === 1
                ? "cursor-not-allowed text-slate-500"
                : "bg-white/5 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
            }`}
          >
            Précédent
          </Link>
          <Link
            href={qs({ page: Math.min(totalPages, currentPage + 1) })}
            aria-disabled={currentPage === totalPages}
            className={`rounded-full border border-white/10 px-3 py-2 ${
              currentPage === totalPages
                ? "cursor-not-allowed text-slate-500"
                : "bg-white/5 text-white transition hover:border-cyan-400/70 hover:bg-white/10"
            }`}
          >
            Suivant
          </Link>
        </div>
      </section>
    </main>
  );
}
