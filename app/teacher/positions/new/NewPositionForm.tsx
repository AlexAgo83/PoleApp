"use client";

import { PositionLevel, PositionType } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

import { createPositionAction } from "./server-action";

const schema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  type: z.nativeEnum(PositionType),
  levelRequired: z.nativeEnum(PositionLevel),
  grips: z.string().optional(),
  tips: z.string().optional(),
  contraindications: z.string().optional(),
  imageUrl: z.string().url().optional(),
  videoUrl: z.string().url().optional(),
  discipline: z.string().min(1),
  muscles: z.array(z.string()).optional(),
});

type Muscle = { id: string; name: string; kind: string | null };

export function NewPositionForm({
  muscles,
  disciplines,
}: {
  muscles: Muscle[];
  disciplines: { name: string; color?: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [muscleList, setMuscleList] = useState<Muscle[]>(muscles);
  const [newMuscle, setNewMuscle] = useState("");
  const [addingMuscle, setAddingMuscle] = useState(false);

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
      imageUrl: formData.get("imageUrl") || undefined,
      videoUrl: formData.get("videoUrl") || undefined,
      discipline: formData.get("discipline"),
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
          name="discipline"
          options={disciplines.map((d) => d.name)}
          defaultValue={disciplines[0]?.name ?? "Danse"}
        />
        <Field label="Grips (séparés par virgule)" name="grips" placeholder="TRUE, CUP" />
      </div>
      <Field label="Description" name="description" textarea />
      <Field label="Conseils" name="tips" textarea />
      <Field label="Contre-indications" name="contraindications" textarea />
      <Field label="Image URL (placeholder accepté)" name="imageUrl" />
      <Field label="Vidéo (URL)" name="videoUrl" placeholder="https://..." />
      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-100">Muscles / articulations sollicités</p>
        <p className="text-xs text-slate-400">
          Multi-sélection (référentiel). Tu peux aussi cliquer “Tout” ou “Aucun”.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-white transition hover:border-cyan-400/70 hover:bg-white/10"
            onClick={() => setSelectedMuscles(muscleList.map((m) => m.id))}
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
            {muscleList.map((m) => {
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
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMuscle}
            onChange={(e) => setNewMuscle(e.target.value)}
            placeholder="Ajouter un muscle/articulation"
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
          />
          <button
            type="button"
            disabled={addingMuscle || newMuscle.trim().length < 2}
            onClick={async () => {
              if (newMuscle.trim().length < 2) return;
              setAddingMuscle(true);
              setError(null);
              try {
                const res = await fetch("/api/muscles", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name: newMuscle.trim() }),
                });
                if (!res.ok) {
                  const data = await res.json().catch(() => ({}));
                  throw new Error(data.error ?? "Ajout muscle impossible");
                }
                const created = (await res.json()) as Muscle;
                setMuscleList((prev) => [...prev, created]);
                setSelectedMuscles((prev) => [...prev, created.id]);
                setNewMuscle("");
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setAddingMuscle(false);
              }
            }}
            className="rounded-full border border-cyan-400/60 bg-cyan-500/20 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-300/80 hover:bg-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {addingMuscle ? "Ajout..." : "Ajouter"}
          </button>
        </div>
        <input type="hidden" name="muscles" value="" />
      </div>

      {error && (
        <p className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
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
  options: string[];
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
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}
