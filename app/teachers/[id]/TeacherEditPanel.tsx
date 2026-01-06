"use client";

import { useState } from "react";

import { updateTeacherProfileAction } from "./actions";

type PositionOption = { id: string; name: string; type: string | null };

type Props = {
  teacherId: string;
  defaults: {
    firstName: string;
    lastName: string;
    age?: number | null;
    diplomas?: string | null;
    phone?: string | null;
    instagramUsername?: string | null;
    favoritePositionIds: string[];
    favoriteDisciplineIds: string[];
  };
  positions: PositionOption[];
  disciplines: { id: string; name: string }[];
  returnTo?: string;
};

export function TeacherEditPanel({ teacherId, defaults, positions, disciplines, returnTo }: Props) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const handleCancel = () => {
    setOpen(false);
    setFormKey((k) => k + 1);
  };

  return (
    <section className="panel panel-body lg-gap border-indigo-400/15">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Édition</p>
          <h2 className="text-lg font-semibold text-white">Éditer le profil</h2>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
        >
          {open ? "Fermer" : "Modifier"}
        </button>
      </div>

      {open && (
        <form
          key={formKey}
          action={updateTeacherProfileAction}
          className="panel-grid lg-gap md:grid-cols-2"
        >
          <input type="hidden" name="teacherId" value={teacherId} />
          {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
          <label className="space-y-2 text-sm text-slate-200">
            Prénom
            <input
              type="text"
              name="firstName"
              defaultValue={defaults.firstName}
              className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
            />
          </label>
          <label className="space-y-2 text-sm text-slate-200">
            Nom
            <input
              type="text"
              name="lastName"
              defaultValue={defaults.lastName}
              className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
            />
          </label>
          <label className="space-y-2 text-sm text-slate-200">
            Téléphone (WhatsApp)
            <input
              type="tel"
              name="phone"
              defaultValue={defaults.phone ?? ""}
              placeholder="+33601020304"
              className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
            />
            <p className="text-xs text-slate-400">
              8–20 chiffres, + optionnel. Vide pour retirer.
            </p>
          </label>
          <label className="space-y-2 text-sm text-slate-200">
            Instagram (username)
            <input
              type="text"
              name="instagramUsername"
              defaultValue={defaults.instagramUsername ?? ""}
              placeholder="mon.profil"
              className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
            />
            <p className="text-xs text-slate-400">
              Lettres/chiffres/._, 2–30 caractères. Vide pour retirer.
            </p>
          </label>
          <label className="space-y-2 text-sm text-slate-200">
            Âge (optionnel)
            <input
              type="number"
              name="age"
              inputMode="numeric"
              min={1}
              max={120}
              defaultValue={defaults.age ?? ""}
              className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
            />
          </label>
          <label className="md:col-span-2 space-y-2 text-sm text-slate-200">
            Diplômes (texte libre)
            <textarea
              name="diplomas"
              defaultValue={defaults.diplomas ?? ""}
              rows={3}
              className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
            />
          </label>
          <label className="md:col-span-2 space-y-2 text-sm text-slate-200">
            Positions coups de cœur
            <select
              name="favoritePositions"
              multiple
              defaultValue={defaults.favoritePositionIds}
              className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
            >
              {positions.map((position) => (
                <option key={position.id} value={position.id}>
                  {position.name} {position.type ? `(${position.type})` : ""}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-400">
              Maintiens Ctrl/Cmd (ou Maj) pour sélectionner plusieurs positions.
            </p>
          </label>
          <label className="md:col-span-2 space-y-2 text-sm text-slate-200">
            Disciplines favorites (max 5)
            <select
              name="favoriteDisciplines"
              multiple
              defaultValue={defaults.favoriteDisciplineIds}
              className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-cyan-400"
            >
              {disciplines.map((discipline) => (
                <option key={discipline.id} value={discipline.id}>
                  {discipline.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-400">
              Limite 5 disciplines. Maintiens Ctrl/Cmd (ou Maj) pour multi-sélection.
            </p>
          </label>
          <div className="md:col-span-2 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-slate-200/80 hover:text-slate-100"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-400"
            >
              Enregistrer
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
