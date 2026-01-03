"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import { CloudAsset, DbMediaRef } from "@/lib/mediaAudit";
import { scanMediaAuditAction, type AuditState } from "./actions";

const initialState: AuditState = { status: "idle" };

type CategoryFilter = "all" | "orphans" | "missing";

type Row =
  | ({ category: "orphan" } & CloudAsset)
  | ({ category: "missing" } & DbMediaRef);

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
    >
      {pending ? "Scan en cours..." : "Scanner"}
    </button>
  );
}

function toCsv(rows: Row[]) {
  const header = [
    "category",
    "public_id",
    "resource_type",
    "delivery_type",
    "folder",
    "bytes",
    "format",
    "created_at",
    "table",
    "field",
    "record_id",
    "is_seed",
  ];
  const lines = rows.map((row) => {
    if (row.category === "orphan") {
      return [
        row.category,
        row.publicId,
        row.resourceType,
        row.deliveryType,
        row.folder ?? "",
        row.bytes ?? "",
        row.format ?? "",
        row.createdAt ?? "",
        "",
        "",
        "",
        row.isSeed ? "yes" : "no",
      ];
    }
    return [
      row.category,
      row.publicId,
      row.resourceType ?? "",
      row.deliveryType ?? "",
      "",
      "",
      "",
      "",
      row.source.table,
      row.source.field,
      row.source.id,
      row.isSeed ? "yes" : "no",
    ];
  });
  return [header, ...lines]
    .map((cols) => cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

export function AuditClient() {
  const [state, formAction] = useActionState(scanMediaAuditAction, initialState);
  const [filter, setFilter] = useState<CategoryFilter>("all");

  const rows: Row[] = useMemo(() => {
    if (state.status !== "ok") return [];
    const orphanRows = state.data.orphans.map((o) => ({ category: "orphan" as const, ...o }));
    const missingRows = state.data.missing.map((m) => ({ category: "missing" as const, ...m }));
    const all = [...orphanRows, ...missingRows];
    switch (filter) {
      case "orphans":
        return orphanRows;
      case "missing":
        return missingRows;
      default:
        return all;
    }
  }, [state, filter]);

  const exportCsv = () => {
    if (rows.length === 0) return;
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "media-audit.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-4">
      <div className="panel panel-body lg-gap">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">Audit médias Cloudinary</h1>
            <p className="text-sm text-slate-400">Compare les assets Cloudinary (image/vidéo, upload/authenticated) avec les références DB.</p>
          </div>
        </div>
        <form action={formAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <label className="grid gap-1 text-sm text-slate-200">
            Type de ressource
            <select
              name="resourceType"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition focus:border-cyan-400 focus:outline-none"
            >
              <option value="all">Images + vidéos</option>
              <option value="image">Images</option>
              <option value="video">Vidéos</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm text-slate-200">
            Type de livraison
            <select
              name="deliveryType"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition focus:border-cyan-400 focus:outline-none"
            >
              <option value="all">upload + authenticated</option>
              <option value="upload">upload</option>
              <option value="authenticated">authenticated</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm text-slate-200">
            Prefix/dossier (optionnel)
            <input
              name="prefix"
              defaultValue=""
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 transition focus:border-cyan-400 focus:outline-none"
              placeholder="ex: poleapp/positions/"
            />
          </label>
          <label className="grid gap-1 text-sm text-slate-200">
            Max résultats (total)
            <input
              name="maxResults"
              type="number"
              defaultValue={400}
              min={1}
              max={1500}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition focus:border-cyan-400 focus:outline-none"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input
              name="includeSeeds"
              type="checkbox"
              className="h-4 w-4 rounded border border-white/20 bg-white/5 text-cyan-400"
            />{" "}
            Inclure seeds/placeholders
          </label>
          <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-2">
            <SubmitButton />
            {state.status === "error" ? <span className="text-sm text-amber-300">{state.message}</span> : null}
          </div>
        </form>
      </div>

      {state.status === "ok" ? (
        <div className="panel panel-body lg-gap">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex flex-wrap gap-3 text-sm text-slate-300">
              <span title="Assets Cloudinary scannés (après filtres prefix/type)" className="rounded-lg bg-white/5 px-3 py-1">
                Cloudinary : {state.data.stats.cloudCount}
              </span>
              <span title="Références médias trouvées en base" className="rounded-lg bg-white/5 px-3 py-1">
                DB : {state.data.stats.dbCount}
              </span>
              <span
                title="Assets présents sur Cloudinary mais absents en base"
                className="rounded-lg bg-amber-500/20 px-3 py-1 text-amber-100"
              >
                Orphelins : {state.data.stats.orphans}
              </span>
              <span
                title="Références présentes en base mais absentes de Cloudinary"
                className="rounded-lg bg-rose-500/20 px-3 py-1 text-rose-100"
              >
                Cassés : {state.data.stats.missing}
              </span>
              <span title="Durée du scan" className="rounded-lg bg-white/5 px-3 py-1">
                {(state.data.stats.durationMs / 1000).toFixed(1)}s
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <label className="flex items-center gap-2">
                Filtre
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as CategoryFilter)}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition focus:border-cyan-400 focus:outline-none"
                >
                  <option value="all">Tous</option>
                  <option value="orphans">Orphelins Cloudinary</option>
                  <option value="missing">Références cassées</option>
                </select>
              </label>
              <button
                onClick={exportCsv}
                className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-300/70 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={rows.length === 0}
                type="button"
              >
                Export CSV
              </button>
            </div>
          </div>
          <div className="grid gap-2">
            {rows.length === 0 ? (
              <p className="text-sm text-slate-400">Aucun résultat pour ce filtre.</p>
            ) : (
              rows.map((row) => (
                <div
                  key={`${row.category}-${row.normalizedFull}-${"source" in row ? row.source.id : row.createdAt ?? row.publicId}`}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-mono text-xs text-white">{row.publicId}</p>
                      <p className="text-xs text-slate-400">
                        {row.category === "orphan"
                          ? `${row.resourceType}/${row.deliveryType}${row.folder ? ` · ${row.folder}` : ""}${row.format ? ` · ${row.format}` : ""}`
                          : `${row.source.table}.${row.source.field} · ${row.source.id}`}
                        {row.isSeed ? " · seed" : ""}
                      </p>
                    </div>
                    {row.category === "orphan" ? (
                      <div className="text-right text-xs text-slate-400">
                        {row.bytes ? <span>{Math.round(row.bytes / 1024)} Ko</span> : null}
                        {row.createdAt ? <span className="ml-2">{new Date(row.createdAt).toLocaleString("fr-FR")}</span> : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="panel panel-body text-sm text-slate-400">Lance un scan pour afficher les résultats.</div>
      )}
    </div>
  );
}
