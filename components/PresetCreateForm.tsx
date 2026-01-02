"use client";

import { FormEvent, useMemo, useState } from "react";

import { CloudinaryUpload } from "./CloudinaryUpload";

type Position = { id: string; name: string; discipline: string | null; disciplineId?: string | null };
type Discipline = { id?: string; name: string };
type Teacher = { id: string; name: string | null; email: string | null };

type Props = {
  positions: Position[];
  disciplines: Discipline[];
  teachers?: Teacher[];
  action: (formData: FormData) => Promise<void>;
  currentUserLabel?: string;
  showTeacherSelect?: boolean;
  initialPreset?: {
    id?: string;
    title?: string;
    description?: string | null;
    discipline?: string | null;
    disciplineId?: string | null;
    videoPublicId?: string | null;
    imagePublicId?: string | null;
    premiumRequired?: boolean | null;
    priceCredits?: number | null;
    positionIds?: string[];
    teacherId?: string | null;
    positionMeta?: {
      positionId: string;
      order?: number | null;
      timestampSeconds?: number | null;
      note?: string | null;
    }[];
  };
  submitLabel?: string;
};

export function PresetCreateForm({
  positions,
  disciplines,
  teachers = [],
  action,
  currentUserLabel,
  showTeacherSelect = true,
  initialPreset,
  submitLabel,
}: Props) {
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>(
    initialPreset?.disciplineId ?? initialPreset?.discipline ?? ""
  );
  const [imagePublicId, setImagePublicId] = useState<string>(initialPreset?.imagePublicId ?? "");
  const [videoPublicId, setVideoPublicId] = useState<string>(initialPreset?.videoPublicId ?? "");
  const [selectedPositions, setSelectedPositions] = useState<string[]>(initialPreset?.positionIds ?? []);
  const [positionMeta, setPositionMeta] = useState<Record<
    string,
    { order: number; timestampSeconds: number | null; note: string }
  >>(() => {
    const meta: Record<string, { order: number; timestampSeconds: number | null; note: string }> = {};
    (initialPreset?.positionMeta ?? []).forEach((m, idx) => {
      meta[m.positionId] = {
        order: m.order ?? idx + 1,
        timestampSeconds: m.timestampSeconds ?? null,
        note: m.note ?? "",
      };
    });
    // ensure ordering for positions with no meta
    (initialPreset?.positionIds ?? []).forEach((id, idx) => {
      if (!meta[id]) {
        meta[id] = { order: idx + 1, timestampSeconds: null, note: "" };
      }
    });
    return meta;
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const isEdit = Boolean(initialPreset?.id);
  const PER_PAGE = 20;

  const filteredPositions = useMemo(() => {
    const baseList = positions.filter((p) => {
      if (!selectedDiscipline) return true;
      if (p.disciplineId && p.disciplineId === selectedDiscipline) return true;
      return (p.discipline ?? "").toLowerCase() === selectedDiscipline.toLowerCase();
    });
    const selectedItems = positions.filter((p) => selectedPositions.includes(p.id));
    const merged = [...selectedItems, ...baseList];
    const deduped = Array.from(new Map(merged.map((p) => [p.id, p])).values());
    return deduped;
  }, [positions, selectedDiscipline, selectedPositions]);

  const totalPages = Math.max(1, Math.ceil(filteredPositions.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedPositions = filteredPositions.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const orderedSelectedPositions = useMemo(() => {
    const fallbackIndex = (id: string) => selectedPositions.indexOf(id);
    return [...selectedPositions].sort((a, b) => {
      const orderA = positionMeta[a]?.order ?? fallbackIndex(a);
      const orderB = positionMeta[b]?.order ?? fallbackIndex(b);
      return orderA - orderB;
    });
  }, [positionMeta, selectedPositions]);

  const labelForTeacher = (t: Teacher) => t.name ?? t.email ?? "Professeur";
  const togglePosition = (id: string) => {
    setSelectedPositions((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((p) => p !== id);
        setPositionMeta((meta) => {
          const clone = { ...meta };
          delete clone[id];
          // reassign orders
          next.forEach((pid, idx) => {
            clone[pid] = {
              order: idx + 1,
              timestampSeconds: clone[pid]?.timestampSeconds ?? null,
              note: clone[pid]?.note ?? "",
            };
          });
          return clone;
        });
        return next;
      }
      const next = [...prev, id];
      setPositionMeta((meta) => ({
        ...meta,
        [id]: {
          order: next.length,
          timestampSeconds: meta[id]?.timestampSeconds ?? null,
          note: meta[id]?.note ?? "",
        },
      }));
      return next;
    });
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    const formData = new FormData(e.currentTarget);
    const picked = formData.getAll("positionIds");
    if (!selectedDiscipline) {
      e.preventDefault();
      setFormError("Sélectionne une discipline.");
      return;
    }
    if (picked.length === 0) {
      e.preventDefault();
      setFormError("Sélectionne au moins une position.");
      return;
    }
    // normalize orders before submit
    setPositionMeta((meta) => {
      const ordered = [...selectedPositions];
      const next: typeof meta = {};
      ordered.forEach((pid, idx) => {
        const current = meta[pid];
        next[pid] = {
          order: idx + 1,
          timestampSeconds: current?.timestampSeconds ?? null,
          note: current?.note ?? "",
        };
      });
      return next;
    });
    setFormError(null);
  };

  const movePosition = (id: string, direction: "up" | "down") => {
    setSelectedPositions((prev) => {
      const idx = prev.indexOf(id);
      if (idx === -1) return prev;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      setPositionMeta((meta) => {
        const clone = { ...meta };
        next.forEach((pid, i) => {
          const current = clone[pid] ?? { order: i + 1, timestampSeconds: null, note: "" };
          clone[pid] = { ...current, order: i + 1 };
        });
        return clone;
      });
      return next;
    });
  };

  const formatTimestamp = (seconds: number | null | undefined) => {
    if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return "";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const parseTimestamp = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^\d+$/.test(trimmed)) return Math.max(0, Number(trimmed));
    const parts = trimmed.split(":").map((v) => Number(v));
    if (parts.some((n) => Number.isNaN(n))) return null;
    if (parts.length === 2) {
      return Math.max(0, parts[0] * 60 + parts[1]);
    }
    return null;
  };

  return (
    <form action={action} onSubmit={handleSubmit} className="space-y-4">
      {initialPreset?.id ? <input type="hidden" name="id" value={initialPreset.id} /> : null}
      <label className="text-sm text-slate-200">
        Titre
        <input
          name="title"
          required
          defaultValue={initialPreset?.title ?? ""}
          className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
        />
      </label>
      <label className="text-sm text-slate-200">
        Discipline
        <select
          name="discipline"
          className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
          value={selectedDiscipline}
          required
          onChange={(e) => setSelectedDiscipline(e.target.value)}
        >
          <option value="">Sélectionne une discipline</option>
          {disciplines.map((d) => (
            <option key={d.id ?? d.name} value={d.id ?? d.name}>
              {d.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm text-slate-200">
        Description
        <textarea
          name="description"
          rows={3}
          defaultValue={initialPreset?.description ?? ""}
          className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
        />
      </label>
      <label className="text-sm text-slate-200">
        Image (Cloudinary)
        <CloudinaryUpload
          label="Uploader une image"
          folder="poleapp/presets"
          resourceType="image"
          deliveryType="upload"
          accept="image/*"
          maxSizeMB={10}
          currentPublicId={imagePublicId || undefined}
          onChange={(_, publicId) => setImagePublicId(publicId ?? "")}
        />
        <input type="hidden" name="imagePublicId" value={imagePublicId} />
      </label>
      <label className="text-sm text-slate-200">
        Vidéo (Cloudinary)
        <CloudinaryUpload
          label="Uploader une vidéo"
          folder="poleapp/presets"
          resourceType="video"
          deliveryType="authenticated"
          accept="video/*"
          maxSizeMB={100}
          currentPublicId={videoPublicId || undefined}
          onChange={(_, publicId) => setVideoPublicId(publicId ?? "")}
        />
        <input type="hidden" name="videoPublicId" value={videoPublicId} />
      </label>
      {showTeacherSelect ? (
        <label className="text-sm text-slate-200">
          Professeur (créateur)
          <select
            name="teacherId"
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
            defaultValue={initialPreset?.teacherId ?? ""}
          >
            <option value="">{currentUserLabel ?? "Moi"}</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {labelForTeacher(t)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-200">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            name="premiumRequired"
            className="h-4 w-4"
            defaultChecked={initialPreset?.premiumRequired ?? false}
          />
          <span>Premium requis</span>
        </label>
        <label className="inline-flex items-center gap-2">
          <span>Prix crédits</span>
          <input
            name="priceCredits"
            type="number"
            min={0}
            placeholder="ex: 150"
            defaultValue={initialPreset?.priceCredits ?? ""}
            className="w-24 rounded-lg border border-white/10 bg-white/10 px-2 py-1 text-white outline-none focus:border-cyan-400"
          />
        </label>
      </div>
      <div className="text-sm text-slate-200">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.12em] text-indigo-100">
          <span>Positions filtrées</span>
          <span className="text-[11px] text-slate-300">
            {filteredPositions.length} résultat{filteredPositions.length > 1 ? "s" : ""} · page {currentPage}/{totalPages}
          </span>
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {filteredPositions.length === 0 ? (
            <p className="col-span-2 text-xs text-slate-400">
              Aucune position pour cette discipline.
            </p>
          ) : (
            paginatedPositions.map((p) => (
              <label
                key={p.id}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1"
              >
                <input
                  type="checkbox"
                  name="positionIds"
                  value={p.id}
                  checked={selectedPositions.includes(p.id)}
                  onChange={() => togglePosition(p.id)}
                  className="h-4 w-4"
                />
                <span className="text-sm text-white">
                  {p.name}
                  {p.discipline ? (
                    <span className="ml-1 text-[11px] text-slate-300">({p.discipline})</span>
                  ) : null}
                </span>
              </label>
            ))
          )}
        </div>
        {filteredPositions.length > PER_PAGE && (
          <div className="mt-2 flex items-center justify-between text-xs text-slate-200">
            <button
              type="button"
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-semibold transition hover:border-cyan-300/60 hover:bg-white/10 disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              ← Précédent
            </button>
            <button
              type="button"
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-semibold transition hover:border-cyan-300/60 hover:bg-white/10 disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              Suivant →
            </button>
          </div>
        )}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.12em] text-indigo-100">
            <span>Ordre & timing</span>
            <span className="text-[11px] text-slate-300">
              {orderedSelectedPositions.length} sélectionnée{orderedSelectedPositions.length > 1 ? "s" : ""}
            </span>
          </div>
          {orderedSelectedPositions.length === 0 ? (
            <p className="text-xs text-slate-400">Sélectionne au moins une position pour définir l’ordre.</p>
          ) : (
            <div className="space-y-2">
              {orderedSelectedPositions.map((pid, idx) => {
                const pos = positions.find((p) => p.id === pid);
                const meta = positionMeta[pid] ?? { order: idx + 1, timestampSeconds: null, note: "" };
                return (
                  <div
                    key={pid}
                    className="flex flex-col gap-2 rounded-lg border border-white/10 p-2 text-xs text-white"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          className="rounded-full border border-white/15 bg-white/10 px-2 py-1 hover:border-cyan-300/60 hover:bg-white/15 disabled:opacity-50"
                          onClick={() => movePosition(pid, "up")}
                          disabled={idx === 0}
                          aria-label="Monter"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-white/15 bg-white/10 px-2 py-1 hover:border-cyan-300/60 hover:bg-white/15 disabled:opacity-50"
                          onClick={() => movePosition(pid, "down")}
                          disabled={idx === orderedSelectedPositions.length - 1}
                          aria-label="Descendre"
                        >
                          ↓
                        </button>
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <p className="text-[11px] uppercase tracking-[0.12em] text-indigo-100">
                            #{meta.order ?? idx + 1}
                          </p>
                          <label className="flex items-center gap-1 text-[11px] text-slate-200">
                            <span>Timing</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              placeholder="mm:ss"
                              value={formatTimestamp(positionMeta[pid]?.timestampSeconds ?? meta.timestampSeconds)}
                              onChange={(e) => {
                                const seconds = parseTimestamp(e.target.value);
                                setPositionMeta((prev) => ({
                                  ...prev,
                                  [pid]: {
                                    order: meta.order ?? idx + 1,
                                    timestampSeconds: seconds,
                                    note: prev[pid]?.note ?? "",
                                  },
                                }));
                              }}
                              className="w-20 rounded-lg border border-white/10 bg-white/10 px-2 py-1 text-white outline-none focus:border-cyan-400"
                            />
                          </label>
                        </div>
                        <p className="text-sm font-semibold">{pos?.name ?? "Position"}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-slate-200">Commentaire</label>
                      <textarea
                        value={positionMeta[pid]?.note ?? meta.note}
                        maxLength={280}
                        onChange={(e) => {
                          const note = e.target.value;
                          setPositionMeta((prev) => ({
                            ...prev,
                            [pid]: {
                              order: meta.order ?? idx + 1,
                              timestampSeconds: prev[pid]?.timestampSeconds ?? null,
                              note,
                            },
                          }));
                        }}
                        className="w-full rounded-lg border border-white/10 bg-white/10 px-2 py-2 text-white outline-none focus:border-cyan-400"
                        rows={2}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="hidden">
            {orderedSelectedPositions.map((pid) => {
              const meta = positionMeta[pid] ?? { order: 0, timestampSeconds: null, note: "" };
              return (
                <div key={pid}>
                  <input type="hidden" name="positionMetaId" value={pid} />
                  <input type="hidden" name="positionMetaOrder" value={meta.order ?? 0} />
                  <input
                    type="hidden"
                    name="positionMetaTimestamp"
                    value={meta.timestampSeconds !== null && meta.timestampSeconds !== undefined ? meta.timestampSeconds : ""}
                  />
                  <input type="hidden" name="positionMetaNote" value={meta.note ?? ""} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {formError ? <p className="text-sm font-semibold text-amber-200">{formError}</p> : null}
      <div className="flex justify-end">
        <button
          type="submit"
          className="rounded-full border border-cyan-300/60 bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-white hover:border-cyan-200"
        >
          {submitLabel ?? (isEdit ? "Enregistrer" : "Créer")}
        </button>
      </div>
    </form>
  );
}
