"use client";

import { useMemo, useState } from "react";

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
  maxPositions?: number;
  showTeacherSelect?: boolean;
};

export function PresetCreateForm({
  positions,
  disciplines,
  teachers = [],
  action,
  currentUserLabel,
  maxPositions = 16,
  showTeacherSelect = true,
}: Props) {
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>("");
  const [imagePublicId, setImagePublicId] = useState<string>("");
  const [videoPublicId, setVideoPublicId] = useState<string>("");

  const filteredPositions = useMemo(() => {
    if (!selectedDiscipline) return positions.slice(0, maxPositions);
    return positions
      .filter((p) => {
        if (!selectedDiscipline) return true;
        if (p.disciplineId && p.disciplineId === selectedDiscipline) return true;
        return (p.discipline ?? "").toLowerCase() === selectedDiscipline.toLowerCase();
      })
      .slice(0, maxPositions);
  }, [positions, selectedDiscipline, maxPositions]);

  const labelForTeacher = (t: Teacher) => t.name ?? t.email ?? "Professeur";

  return (
    <form action={action} className="space-y-4">
      <label className="text-sm text-slate-200">
        Titre
        <input
          name="title"
          required
          className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
        />
      </label>
      <label className="text-sm text-slate-200">
        Discipline
        <select
          name="discipline"
          className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
          value={selectedDiscipline}
          onChange={(e) => setSelectedDiscipline(e.target.value)}
        >
          <option value="">(Toutes)</option>
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
          className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
        />
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
        <span className="text-xs text-slate-400">Facultatif, améliore l’aperçu du preset.</span>
      </label>
      {showTeacherSelect ? (
        <label className="text-sm text-slate-200">
          Professeur (créateur)
          <select
            name="teacherId"
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
            defaultValue=""
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
          <input type="checkbox" name="premiumRequired" className="h-4 w-4" />
          <span>Premium requis</span>
        </label>
        <label className="inline-flex items-center gap-2">
          <span>Prix crédits</span>
          <input
            name="priceCredits"
            type="number"
            min={0}
            placeholder="ex: 150"
            className="w-24 rounded-lg border border-white/10 bg-white/10 px-2 py-1 text-white outline-none focus:border-cyan-400"
          />
        </label>
      </div>
      <div className="text-sm text-slate-200">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.12em] text-indigo-100">
          <span>Positions incluses (max {maxPositions})</span>
          <span className="text-[11px] text-slate-300">
            {filteredPositions.length} affichée{filteredPositions.length > 1 ? "s" : ""}
          </span>
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {filteredPositions.length === 0 ? (
            <p className="col-span-2 text-xs text-slate-400">
              Aucune position pour cette discipline.
            </p>
          ) : (
            filteredPositions.map((p) => (
              <label
                key={p.id}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1"
              >
                <input type="checkbox" name="positionIds" value={p.id} className="h-4 w-4" />
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
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          className="rounded-full border border-cyan-300/60 bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-white hover:border-cyan-200"
        >
          Créer
        </button>
      </div>
    </form>
  );
}
