'use client';

import Link from "next/link";
import { useState } from "react";

import { signupStudentAction } from "./actions";

type School = { id: string; name: string };

export function SignupForm({ schools, error }: { schools: School[]; error?: string | null }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <form action={signupStudentAction} className="mt-6 space-y-5">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm text-slate-200">
          Prénom
          <input
            name="firstName"
            required
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-indigo-400"
            autoComplete="given-name"
          />
        </label>
        <label className="text-sm text-slate-200">
          Nom
          <input
            name="lastName"
            required
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-indigo-400"
            autoComplete="family-name"
          />
        </label>
      </div>

      <label className="text-sm text-slate-200">
        Email
        <input
          name="email"
          type="email"
          required
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-indigo-400"
          autoComplete="email"
        />
      </label>

      <label className="text-sm text-slate-200 block">
        Mot de passe
        <div className="mt-2 flex rounded-xl border border-white/10 bg-white/5 pr-2 text-white focus-within:border-indigo-400">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            className="w-full rounded-l-xl bg-transparent px-3 py-2 outline-none"
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="ml-1 inline-flex items-center justify-center rounded-lg px-2 text-xs text-slate-200 transition hover:text-white"
            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {showPassword ? "🙈" : "👁️"}
          </button>
        </div>
        <span className="mt-1 block text-xs text-slate-400">
          Minimum 8 caractères. L’email doit être unique.
        </span>
      </label>

      <label className="text-sm text-slate-200 block">
        Confirmation du mot de passe
        <div className="mt-2 flex rounded-xl border border-white/10 bg-white/5 pr-2 text-white focus-within:border-indigo-400">
          <input
            name="confirmPassword"
            type={showConfirm ? "text" : "password"}
            required
            minLength={8}
            className="w-full rounded-l-xl bg-transparent px-3 py-2 outline-none"
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="ml-1 inline-flex items-center justify-center rounded-lg px-2 text-xs text-slate-200 transition hover:text-white"
            aria-label={showConfirm ? "Masquer le mot de passe de confirmation" : "Afficher le mot de passe de confirmation"}
          >
            {showConfirm ? "🙈" : "👁️"}
          </button>
        </div>
      </label>

      <div className="space-y-2">
        <label className="text-sm text-slate-200">École</label>
        <select
          name="schoolId"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-indigo-400"
        >
          {schools.map((school) => (
            <option key={school.id} value={school.id}>
              {school.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          {error}
        </p>
      )}

      <div className="flex flex-wrap justify-between gap-3 text-sm text-slate-200">
        <Link
          href="/login"
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 font-semibold text-white transition hover:border-indigo-300/70 hover:bg-white/10"
        >
          Déjà inscrit ? Connexion
        </Link>
        <button
          type="submit"
          className="rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 px-4 py-2 font-semibold text-white shadow-lg transition hover:brightness-110"
        >
          Créer mon compte élève
        </button>
      </div>
    </form>
  );
}
