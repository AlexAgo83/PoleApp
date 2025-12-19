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
});

export default function NewPositionPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-6 py-12">
      <header className="panel p-8">
        <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">
          Prof / Admin
        </p>
        <h1 className="text-3xl font-semibold text-white">Créer une position</h1>
        <p className="text-slate-300">
          Formulaire léger pour alimenter la base. Les médias supplémentaires et
          l’édition seront ajoutés plus tard.
        </p>
      </header>

      <section className="panel p-8">
        <form action={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nom" name="name" required />
            <SelectField label="Type" name="type" options={types} />
            <SelectField label="Niveau requis" name="levelRequired" options={levels} />
            <Field label="Grips (séparés par virgule)" name="grips" placeholder="TRUE, CUP" />
          </div>
          <Field label="Description" name="description" textarea />
          <Field label="Conseils" name="tips" textarea />
          <Field label="Contre-indications" name="contraindications" textarea />
          <Field label="Image URL (placeholder accepté)" name="imageUrl" />

          {error && (
            <p className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Enregistrement..." : "Créer la position"}
            </button>
          </div>
        </form>
      </section>
    </main>
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
}: {
  label: string;
  name: string;
  options: string[];
}) {
  return (
    <label className="block text-sm text-slate-200">
      {label}
      <select
        name={name}
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
