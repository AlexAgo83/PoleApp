"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { COURSE_PLACEHOLDER } from "@/lib/placeholders";
import { updateStudioAction, deleteStudioAction } from "./actions";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";

type Studio = {
  id: string;
  name: string;
  address: string | null;
  photoUrl: string | null;
};

type Props = {
  studio: Studio;
};

export function StudioCard({ studio }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);

  const handleUpdate = (form: HTMLFormElement) => {
    const formData = new FormData(form);
    startTransition(async () => {
      await updateStudioAction(formData);
      setEditing(false);
      router.refresh();
    });
  };

  const handleDelete = () => {
    const formData = new FormData();
    formData.append("studioId", studio.id);
    startTransition(async () => {
      await deleteStudioAction(formData);
      router.refresh();
    });
  };

  return (
    <article
      className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-indigo-900/10"
      style={{
        backgroundImage: `linear-gradient(135deg, rgba(10,15,30,0.82), rgba(15,25,45,0.68)), url(${studio.photoUrl ?? COURSE_PLACEHOLDER})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {!editing ? (
        <div className="flex flex-col gap-3 text-sm text-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-indigo-100">
                Studio
              </span>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
              >
                ✏️ Éditer
              </button>
              <Link
                href={`/school/${studio.id}?view=agenda&range=month`}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
              >
                Voir la fiche
              </Link>
            </div>
            <form action={deleteStudioAction}>
              <input type="hidden" name="studioId" value={studio.id} />
              <ConfirmDeleteButton
                type="button"
                onConfirm={handleDelete}
                disabled={isPending}
                className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100 transition hover:border-red-400 hover:bg-red-500/20"
              >
                Supprimer
              </ConfirmDeleteButton>
            </form>
          </div>
          <div className="space-y-2">
            <p className="text-base font-semibold text-white">{studio.name}</p>
            {studio.address && (
              <p className="text-sm text-cyan-100">
                Adresse : {studio.address}{" "}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(studio.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-cyan-200 underline underline-offset-2 transition hover:text-cyan-100"
                >
                  Ouvrir dans Google Maps
                </a>
              </p>
            )}
            {studio.photoUrl ? <p className="text-xs text-slate-300">Photo disponible</p> : null}
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-cyan-400/40 bg-white/5 p-3 text-sm text-slate-200 shadow-inner shadow-indigo-900/10">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
            >
              Annuler
            </button>
            <ConfirmDeleteButton
              type="button"
              onConfirm={handleDelete}
              disabled={isPending}
              className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100 transition hover:border-red-400 hover:bg-red-500/20"
            >
              Supprimer
            </ConfirmDeleteButton>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleUpdate(e.currentTarget);
            }}
            className="grid gap-3 rounded-2xl border border-cyan-400/40 bg-white/5 p-4 shadow-inner shadow-indigo-900/10 text-sm text-slate-200 md:grid-cols-2 md:gap-4"
          >
            <input type="hidden" name="studioId" value={studio.id} />
            <label className="grid gap-1">
              Nom
              <input
                name="name"
                defaultValue={studio.name}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
                required
              />
            </label>
            <label className="grid gap-1">
              Adresse (optionnel)
              <input
                name="address"
                defaultValue={studio.address ?? ""}
                placeholder="Adresse"
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
              />
            </label>
            <label className="grid gap-1 md:col-span-2">
              Photo (URL)
              <input
                name="photoUrl"
                defaultValue={studio.photoUrl ?? ""}
                placeholder="https://..."
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
                type="url"
              />
            </label>
            <div className="md:col-span-2 flex flex-wrap justify-end gap-2">
              <button
                type="submit"
                disabled={isPending}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Sauvegarder
              </button>
            </div>
          </form>
        </>
      )}
    </article>
  );
}
