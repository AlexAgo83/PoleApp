import { PositionLevel, PositionType } from "@prisma/client";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { SessionNavBar } from "@/components/SessionNavBar";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { deletePositionAction, updatePositionAction } from "./action";

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
  if (
    role === "TEACHER" &&
    (!position.createdByUserId || position.createdByUserId !== session.user.id)
  ) {
    redirect("/access-denied");
  }

  const types = Object.values(PositionType);
  const levels = Object.values(PositionLevel);
  const cover = position.media.find((m) => m.kind === "PHOTO") ?? position.media[0];
  const video = position.media.find((m) => m.kind === "VIDEO");

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-4 px-2 py-6 md:gap-6 md:px-6 md:py-10">
      <SessionNavBar session={session} />
      <header className="panel p-4 md:p-6">
        <p className="text-xs uppercase tracking-[0.14em] text-indigo-100">
          Professeur / Admin
        </p>
        <h1 className="text-3xl font-semibold text-white">Éditer la position</h1>
        <p className="text-slate-200">
          Mets à jour les informations principales de la position. Les médias supplémentaires
          viendront plus tard.
        </p>
      </header>

      <section className="panel p-4 md:p-6">
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
          <Field
            label="Vidéo (URL)"
            name="videoUrl"
            defaultValue={video?.url ?? ""}
            placeholder="https://..."
          />

          <div className="flex flex-wrap justify-end gap-3">
            <Link
              href={`/positions/${position.id}?from=/positions`}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-indigo-300/70 hover:bg-white/10"
            >
              Annuler
            </Link>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/gear.svg" alt="" className="h-4 w-4" />
              Éditer
            </button>
          </div>
        </form>
      </section>

      <section className="panel border-red-500/30 bg-red-500/5 p-6">
        <h2 className="text-lg font-semibold text-white">Supprimer cette position</h2>
        <p className="text-sm text-slate-200">
          Action irréversible. Les liens cours/progression seront supprimés.
        </p>
        <form action={deletePositionAction} className="mt-4">
          <input type="hidden" name="positionId" value={position.id} />
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400"
          >
            Supprimer
          </button>
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
