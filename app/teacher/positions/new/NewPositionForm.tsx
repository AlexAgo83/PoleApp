"use client";

import { PositionLevel, PositionType } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

import { CloudinaryUpload } from "@/components/CloudinaryUpload";
import { createPositionAction } from "./server-action";

const schema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  type: z.nativeEnum(PositionType),
  levelRequired: z.nativeEnum(PositionLevel),
  grips: z.string().optional(),
  tips: z.string().optional(),
  contraindications: z.string().optional(),
  imagePublicId: z.string().optional(),
  videoPublicId: z.string().optional(),
  disciplineId: z.string().min(1),
  muscles: z.array(z.string()).optional(),
});

type Muscle = { id: string; name: string; kind: string | null };

export function NewPositionForm({
  muscles,
  disciplines,
}: {
  muscles: Muscle[];
  disciplines: { id?: string; name: string; color?: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [videoPublicId, setVideoPublicId] = useState<string>("");
  const [imagePublicId, setImagePublicId] = useState<string>("");

  const handleSubmit = async (formData: FormData) => {
    setError(null);
    setLoading(true);

    const data = schema.safeParse({
      name: formData.get("name"),
      description: formData.get("description") || undefined,
      type: formData.get("type"),
      levelRequired: formData.get("levelRequired"),
      grips: formData.get("grips") || undefined,
      tips: formData.get("tips") || undefined,
      contraindications: formData.get("contraindications") || undefined,
      imagePublicId: imagePublicId || undefined,
      videoPublicId: formData.get("videoPublicId") || undefined,
      disciplineId: formData.get("disciplineId"),
      muscles: formData.getAll("muscles").map((m) => m.toString()).filter(Boolean),
    });

    if (!data.success) {
      setError("Formulaire incomplet ou invalide.");
      setLoading(false);
      return;
    }

    const result = await createPositionAction(data.data);
    router.push(`/positions/${result.id}`);
  };

  const types = Object.values(PositionType);
  const levels = Object.values(PositionLevel);

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nom" name="name" required />
        <SelectField label="Type" name="type" options={types} />
        <SelectField label="Niveau requis" name="levelRequired" options={levels} />
        <SelectField
          label="Discipline"
          name="disciplineId"
          options={disciplines.map((d) => ({ value: d.id ?? d.name, label: d.name }))}
          defaultValue={disciplines[0]?.id ?? disciplines[0]?.name ?? "Pole"}
        />
        <Field label="Grips (séparés par virgule)" name="grips" placeholder="TRUE, CUP" />
      </div>
      <Field label="Description" name="description" textarea />
      <Field label="Conseils" name="tips" textarea />
      <Field label="Contre-indications" name="contraindications" textarea />
      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-100">Image (Cloudinary publicId)</p>
        <CloudinaryUpload
          label="Uploader une image"
          folder="poleapp/positions"
          resourceType="image"
          deliveryType="upload"
          accept="image/*"
          maxSizeMB={10}
          currentPublicId={imagePublicId || undefined}
          onChange={(_, publicId) => setImagePublicId(publicId ?? "")}
        />
        <input type="hidden" name="imagePublicId" value={imagePublicId} />
      </div>
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
        <input type="hidden" name="videoPublicId" value={videoPublicId} />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-100">Muscles / articulations sollicités</p>
        <p className="text-xs text-slate-400">
          Multi-sélection (référentiel). Tu peux aussi cliquer “Tout” ou “Aucun”.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-white transition hover:border-cyan-400/70 hover:bg-white/10"
            onClick={() => setSelectedMuscles(muscles.map((m) => m.id))}
          >
            Tout
          </button>
          <button
            type="button"
            className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-white transition hover:border-cyan-400/70 hover:bg-white/10"
            onClick={() => setSelectedMuscles([])}
          >
            Aucun
          </button>
        </div>
        <div className="max-h-40 w-full overflow-y-auto rounded-lg border border-white/10 bg-white/5 p-2">
          <div className="flex flex-wrap gap-2">
            {muscles.map((m) => {
              const checked = selectedMuscles.includes(m.id);
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
                      setSelectedMuscles((prev) =>
                        isChecked ? [...prev, m.id] : prev.filter((id) => id !== m.id)
                      );
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
        <input type="hidden" name="muscles" value="" />
      </div>

      {error && (
        <p className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          {error}
        </p>
      )}

      <div className="flex flex-wrap justify-end">
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Enregistrement..." : "Créer la position"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  required,
  textarea,
  placeholder,
}: {
  label: string;
  name: string;
  required?: boolean;
  textarea?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm text-slate-200">
      {label}
      {textarea ? (
        <textarea
          name={name}
          required={required}
          placeholder={placeholder}
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
        />
      ) : (
        <input
          name={name}
          required={required}
          placeholder={placeholder}
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
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
  options: ({ value: string; label: string } | string)[];
  defaultValue?: string;
}) {
  return (
    <label className="block text-sm text-slate-200">
      {label}
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
      >
        {options.map((opt) =>
          typeof opt === "object" && "value" in opt ? (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ) : (
            <option key={opt} value={opt}>
              {opt}
            </option>
          )
        )}
      </select>
    </label>
  );
}
