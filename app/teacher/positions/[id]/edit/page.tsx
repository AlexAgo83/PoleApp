import { PositionLevel, PositionType } from "@prisma/client";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { updatePositionAction } from "./action";

export const dynamic = "force-dynamic";

type Props = { params: { id: string } };

export default async function EditPositionPage({ params }: Props) {
  const awaitedParams = await params;
  if (!awaitedParams?.id) {
    notFound();
  }

  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!role || (role !== "TEACHER" && role !== "SCHOOL_ADMIN")) {
    redirect("/access-denied");
  }

  const position = await prisma.position.findUnique({
    where: { id: awaitedParams.id },
    include: { media: true },
  });

  if (!position) {
    notFound();
  }

  const types = Object.values(PositionType);
  const levels = Object.values(PositionLevel);
  const cover = position.media[0];

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-6 py-12">
      <header className="panel p-8">
        <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">
          Professeur / Admin
        </p>
        <h1 className="text-3xl font-semibold text-white">Éditer la position</h1>
        <p className="text-slate-300">
          Mets à jour les informations principales de la position. Les médias supplémentaires
          viendront plus tard.
        </p>
      </header>

      <section className="panel p-8">
        <form action={updatePositionAction} className="space-y-4">
          <input type="hidden" name="id" value={position.id} />
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nom" name="name" defaultValue={position.name} required />
            <SelectField
              label="Type"
              name="type"
              options={types}
              defaultValue={position.type}
            />
            <SelectField
              label="Niveau requis"
              name="levelRequired"
              options={levels}
              defaultValue={position.levelRequired}
            />
            <Field
              label="Grips (séparés par virgule)"
              name="grips"
              defaultValue={position.grips ?? ""}
              placeholder="TRUE, CUP"
            />
          </div>
          <Field
            label="Description"
            name="description"
            textarea
            defaultValue={position.description ?? ""}
          />
          <Field label="Conseils" name="tips" textarea defaultValue={position.tips ?? ""} />
          <Field
            label="Contre-indications"
            name="contraindications"
            textarea
            defaultValue={position.contraindications ?? ""}
          />
          <Field
            label="Image URL (placeholder accepté)"
            name="imageUrl"
            defaultValue={cover?.url ?? ""}
          />

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-400"
            >
              Éditer
            </button>
            <Link
              href={`/positions/${position.id}?from=/positions`}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
            >
              Annuler
            </Link>
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
  defaultValue,
}: {
  label: string;
  name: string;
  required?: boolean;
  textarea?: boolean;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <label className="block text-sm text-slate-200">
      {label}
      {textarea ? (
        <textarea
          name={name}
          required={required}
          placeholder={placeholder}
          defaultValue={defaultValue}
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
        />
      ) : (
        <input
          name={name}
          required={required}
          placeholder={placeholder}
          defaultValue={defaultValue}
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
