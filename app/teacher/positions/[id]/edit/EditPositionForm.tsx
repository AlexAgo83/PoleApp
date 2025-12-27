"use client";

import { PositionLevel, PositionType, type PositionMedia } from "@prisma/client";
import { useState } from "react";

import { CloudinaryUpload } from "@/components/CloudinaryUpload";
import { updatePositionAction, deletePositionAction } from "./action";

type Muscle = { id: string; name: string; kind: string | null };
type Discipline = { name: string; color?: string };

export function EditPositionForm({
  position,
  muscles,
  disciplines,
  selectedMuscleIds,
}: {
  position: {
    id: string;
    name: string;
    description: string | null;
    type: PositionType;
    levelRequired: PositionLevel;
    discipline: string;
    grips: string | null;
    tips: string | null;
    contraindications: string | null;
    media: PositionMedia[];
  };
  muscles: Muscle[];
  disciplines: Discipline[];
  selectedMuscleIds: string[];
}) {
  const video = position.media.find((m) => m.kind === "VIDEO");
  const [videoUrl, setVideoUrl] = useState<string>(video?.url ?? "");
  const [videoPublicId, setVideoPublicId] = useState<string>(video?.publicId ?? "");
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>(selectedMuscleIds);

  const types = Object.values(PositionType);
  const levels = Object.values(PositionLevel);

  return (
    <form action={updatePositionAction} className="space-y-4">
      <input type="hidden" name="id" value={position.id} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nom" name="name" defaultValue={position.name} required />
        <SelectField label="Type" name="type" options={types} defaultValue={position.type} />
        <SelectField
          label="Niveau requis"
          name="levelRequired"
          options={levels}
          defaultValue={position.levelRequired}
        />
        <SelectField
          label="Discipline"
          name="discipline"
          options={disciplines.map((d) => d.name)}
          defaultValue={position.discipline}
        />
        <Field
          label="Grips (séparés par virgule)"
          name="grips"
          defaultValue={position.grips ?? ""}
          placeholder="TRUE, CUP"
        />
      </div>
      <Field label="Description" name="description" textarea defaultValue={position.description ?? ""} />
      <Field label="Conseils" name="tips" textarea defaultValue={position.tips ?? ""} />
      <Field
        label="Contre-indications"
        name="contraindications"
        textarea
        defaultValue={position.contraindications ?? ""}
      />
      <Field label="Image URL (placeholder accepté)" name="imageUrl" defaultValue={position.media.find((m) => m.kind === "PHOTO")?.url ?? ""} />

      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-100">Vidéo (Cloudinary)</p>
        <CloudinaryUpload
          label="Uploader une vidéo"
          folder="poleapp/positions"
          resourceType="video"
          deliveryType="authenticated"
          accept="video/*"
          maxSizeMB={100}
          currentUrl={videoUrl || undefined}
          currentPublicId={videoPublicId || undefined}
          onChange={(url, publicId) => {
            setVideoUrl(url ?? "");
            setVideoPublicId(publicId ?? "");
          }}
        />
        <input type="hidden" name="videoUrl" value={videoUrl} />
        <input type="hidden" name="videoPublicId" value={videoPublicId} />
      </div>

      <MuscleSelect muscles={muscles} selected={selectedMuscles} onChange={setSelectedMuscles} />

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          className="rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
        >
          Enregistrer
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  required,
  textarea,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  required?: boolean;
  textarea?: boolean;
}) {
  return (
    <label className="block text-sm text-slate-200">
      {label}
      {textarea ? (
        <textarea
          name={name}
          defaultValue={defaultValue ?? ""}
          placeholder={placeholder}
          required={required}
          className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
        />
      ) : (
        <input
          name={name}
          defaultValue={defaultValue ?? ""}
          placeholder={placeholder}
          required={required}
          className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
        />
      )}
    </label>
  );
}

function SelectField({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  options: (string | PositionType | PositionLevel)[];
  defaultValue?: string | PositionType | PositionLevel | null;
}) {
  return (
    <label className="text-sm text-slate-200">
      {label}
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
      >
        {options.map((opt) => (
          <option key={opt.toString()} value={opt.toString()}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}

function MuscleSelect({
  muscles,
  selected,
  onChange,
}: {
  muscles: Muscle[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-slate-100">Muscles / articulations sollicités</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          onClick={() => onChange(muscles.map((m) => m.id))}
        >
          Tout
        </button>
        <button
          type="button"
          className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          onClick={() => onChange([])}
        >
          Aucun
        </button>
      </div>
      <div className="max-h-40 w-full overflow-y-auto rounded-lg border border-white/10 bg-white/5 p-2">
        <div className="flex flex-wrap gap-2">
          {muscles.map((m) => {
            const checked = selected.includes(m.id);
            return (
              <label
                key={m.id}
                className={`inline-flex items-center gap-2 rounded-full border ${checked ? "border-cyan-400/60 bg-cyan-500/15" : "border-white/10 bg-white/5"} px-3 py-1 text-xs text-slate-100 transition`}
              >
                <input
                  type="checkbox"
                  name="muscles"
                  value={m.id}
                  checked={checked}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    onChange(isChecked ? [...selected, m.id] : selected.filter((id) => id !== m.id));
                  }}
                  className="h-4 w-4 rounded border-white/20 bg-white/5"
                />
                <span className="font-semibold text-white">{m.name}</span>
                <span className="text-[10px] uppercase tracking-[0.08em] text-slate-300">
                  {m.kind?.toLowerCase()}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
