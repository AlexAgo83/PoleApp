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

  const labelForTeacher = (t: Teacher) => t.name ?? t.email ?? "Professeur";
  const togglePosition = (id: string) => {
    setSelectedPositions((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
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
    setFormError(null);
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
