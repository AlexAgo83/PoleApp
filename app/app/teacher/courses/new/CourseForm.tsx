"use client";

import { MasteryLevel } from "@prisma/client";
import { useMemo, useState } from "react";

type Student = { id: string; name: string | null; email: string };
type Position = { id: string; name: string; type: string };
type Teacher = { id: string; name: string | null; email: string };
type Studio = { id: string; name: string };
type ProgressRecord = {
  studentId: string;
  positionId: string;
  masteryLevel?: MasteryLevel | null;
  learningStatus?: string | null;
  positionName: string;
  positionType?: string | null;
};

type Props = {
  students: Student[];
  positions: Position[];
  action: (formData: FormData) => Promise<void>;
  defaultTitle?: string | null;
  defaultDate?: string;
  defaultSelectedStudents?: string[];
  defaultSelectedPositions?: string[];
  defaultNotes?: Record<string, Note>;
  submitLabel?: string;
  cancelHref?: string;
  courseId?: string;
  teachers?: Teacher[];
  defaultTeacherId?: string | null;
  studios?: Studio[];
  defaultStudioId?: string | null;
  defaultDurationMinutes?: number;
  defaultMaxSeats?: number;
  defaultWaitlistQuota?: number;
  defaultCostCredits?: number;
  defaultPhotoUrl?: string | null;
  defaultDiscipline?: string | null;
  progressByStudent?: ProgressRecord[];
};

type Note = {
  studentId: string;
  positionId: string;
  masteryLevel?: string;
  comment?: string;
};

export function CourseForm({
  students,
  positions,
  action,
  defaultTitle = "",
  defaultDate,
  defaultSelectedStudents = [],
  defaultSelectedPositions = [],
  defaultNotes = {},
  submitLabel = "Créer le cours",
  cancelHref,
  courseId,
  teachers = [],
  defaultTeacherId,
  studios = [],
  defaultStudioId,
  defaultDurationMinutes = 60,
  defaultMaxSeats = 30,
  defaultWaitlistQuota = 0,
  defaultCostCredits = 100,
  defaultPhotoUrl = "",
  defaultDiscipline = "Danse",
  progressByStudent = [],
}: Props) {
  const [selectedStudents, setSelectedStudents] =
    useState<string[]>(defaultSelectedStudents);
  const [selectedPositions, setSelectedPositions] = useState<string[]>(
    defaultSelectedPositions
  );
  const [notes, setNotes] = useState<Record<string, Note>>(defaultNotes);
  const [lastGeneratedCount, setLastGeneratedCount] = useState(0);

  const masteryOptions = useMemo(
    () => [
      { value: "", label: "(non renseigné)" },
      { value: MasteryLevel.INITIATED, label: "Initiation" },
      { value: MasteryLevel.PASSED, label: "Passé" },
      { value: MasteryLevel.FLUID, label: "Fluide" },
      { value: MasteryLevel.CHOREO, label: "Choréo" },
    ],
    []
  );

  const notesArray: Note[] = useMemo(
    () =>
      Object.values(notes).filter(
        (n) => n.comment || (n.masteryLevel && n.masteryLevel.length > 0)
      ),
    [notes]
  );

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm text-slate-200">
          Date
          <input
            type="datetime-local"
            name="date"
            required
            defaultValue={defaultDate ?? new Date().toISOString().slice(0, 16)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-indigo-400"
          />
        </label>
        <label className="text-sm text-slate-200">
          Titre (optionnel)
          <input
            type="text"
            name="title"
            placeholder="Cours du soir - Spins inter"
            defaultValue={defaultTitle ?? ""}
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-indigo-400"
        />
        </label>
        <label className="text-sm text-slate-200">
          Discipline
          <input
            type="text"
            name="discipline"
            placeholder="Danse, Pilates, Pole..."
            defaultValue={defaultDiscipline ?? "Danse"}
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-indigo-400"
          />
        </label>
      </div>

      {teachers.length > 0 && (
        <label className="block text-sm text-slate-200">
          Professeur (admin)
          <select
            name="teacherId"
            defaultValue={defaultTeacherId ?? ""}
            required
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-indigo-400"
          >
            {!defaultTeacherId && <option value="">Sélectionner un professeur</option>}
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name ?? t.email}
              </option>
            ))}
          </select>
        </label>
      )}

      {studios.length > 0 && (
        <label className="block text-sm text-slate-200">
          Studio (optionnel)
          <select
            name="studioId"
            defaultValue={defaultStudioId ?? ""}
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-indigo-400"
          >
            <option value="">(Aucun studio)</option>
            {studios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block text-sm text-slate-200">
        Durée (minutes)
        <input
          type="number"
          name="durationMinutes"
          min={30}
          step={15}
          defaultValue={defaultDurationMinutes}
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-indigo-400"
        />
        <p className="mt-1 text-xs text-slate-400">Par tranches de 15 min, minimum 30 min. Par défaut 60 min.</p>
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm text-slate-200">
          Places maximum
          <input
            type="number"
            name="maxSeats"
            min={1}
            defaultValue={defaultMaxSeats}
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-indigo-400"
          />
          <p className="mt-1 text-xs text-slate-400">Par défaut 30 places.</p>
        </label>
        <label className="text-sm text-slate-200">
          Quota liste d&apos;attente
          <input
            type="number"
            name="waitlistQuota"
            min={0}
            defaultValue={defaultWaitlistQuota ?? 0}
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-indigo-400"
          />
          <p className="mt-1 text-xs text-slate-400">0 = illimité. Si plein et quota atteint, inscription refusée.</p>
        </label>
        <label className="text-sm text-slate-200">
          Coût en crédits
          <input
            type="number"
            name="costCredits"
            min={0}
            step={10}
            defaultValue={defaultCostCredits}
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-indigo-400"
          />
          <p className="mt-1 text-xs text-slate-400">Par défaut 100 crédits.</p>
        </label>
      </div>

      <label className="block text-sm text-slate-200">
        Photo (URL, optionnelle)
        <input
          type="url"
          name="photoUrl"
          placeholder="https://…"
          defaultValue={defaultPhotoUrl ?? ""}
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-indigo-400"
        />
        <p className="mt-1 text-xs text-slate-400">Laisse vide pour utiliser un placeholder.</p>
      </label>

      <label className="block text-sm text-slate-200">
        Élèves présents
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          {students.map((student) => {
            const checked = selectedStudents.includes(student.id);
            return (
              <label
                key={student.id}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    setSelectedStudents((prev) =>
                      e.target.checked
                        ? [...prev, student.id]
                        : prev.filter((id) => id !== student.id)
                    );
                  }}
                />
                {student.name ?? student.email}
              </label>
            );
          })}
        </div>
      </label>

      <label className="block text-sm text-slate-200">
        Positions abordées
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              // Génère une sélection rapide basée sur les élèves sélectionnés et leur progression.
              const selectedSet = new Set(selectedStudents);
              const weights: Record<string, number> = {
                NOT_STARTED: 3,
                IN_PROGRESS: 2,
                PASSED: 1,
                MASTERED: 0,
              };
              const scores = new Map<
                string,
                { score: number; name: string; type?: string | null }
              >();

              progressByStudent
                .filter((r) => selectedSet.has(r.studentId))
                .forEach((r) => {
                  const base =
                    weights[r.learningStatus ?? "IN_PROGRESS"] ?? 1;
                  const masteryPenalty =
                    r.masteryLevel === MasteryLevel.FLUID ||
                    r.masteryLevel === MasteryLevel.CHOREO
                      ? -1
                      : 0;
                  const score = base + masteryPenalty;
                  if (score <= 0) return;
                  const existing = scores.get(r.positionId);
                  const nextScore = (existing?.score ?? 0) + score;
                  scores.set(r.positionId, {
                    score: nextScore,
                    name: r.positionName,
                    type: r.positionType,
                  });
                });

              const sorted = Array.from(scores.entries())
                .sort((a, b) => b[1].score - a[1].score || a[1].name.localeCompare(b[1].name))
                .map(([positionId]) => positionId);

              const fallbackPool = positions.map((p) => p.id);
              const proposed = (sorted.length > 0 ? sorted : fallbackPool).slice(
                0,
                6
              );
              setSelectedPositions((prev) => {
                const merged = [...proposed, ...prev];
                return Array.from(new Set(merged));
              });
              setLastGeneratedCount(proposed.length);
            }}
            className="inline-flex items-center gap-2 rounded-full border border-cyan-400/50 bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-cyan-300/70 hover:bg-cyan-500/30"
          >
            Générer (auto)
          </button>
          {lastGeneratedCount > 0 && (
            <span className="text-xs text-emerald-100">
              +{lastGeneratedCount} proposées selon les élèves
            </span>
          )}
          {selectedPositions.length > 0 && (
            <span className="text-xs text-slate-300">
              {selectedPositions.length} sélectionnée(s)
            </span>
          )}
        </div>
        <div className="mt-2 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {positions.map((position) => {
            const checked = selectedPositions.includes(position.id);
            return (
              <label
                key={position.id}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    setSelectedPositions((prev) =>
                      e.target.checked
                        ? [...prev, position.id]
                        : prev.filter((id) => id !== position.id)
                    );
                  }}
                />
                {position.name} ({position.type})
              </label>
            );
          })}
        </div>
      </label>

      {selectedStudents.length > 0 && selectedPositions.length > 0 && (
        <NotesMatrix
          students={students.filter((s) => selectedStudents.includes(s.id))}
          positions={positions.filter((p) => selectedPositions.includes(p.id))}
          masteryOptions={masteryOptions}
          notes={notes}
          setNotes={setNotes}
        />
      )}

      <input
        type="hidden"
        name="studentIds"
        value={JSON.stringify(selectedStudents)}
      />
      <input
        type="hidden"
        name="positionIds"
        value={JSON.stringify(selectedPositions)}
      />
      {courseId && <input type="hidden" name="courseId" value={courseId} />}
      <input type="hidden" name="notes" value={JSON.stringify(notesArray)} />
      {teachers.length === 0 && (
        <input type="hidden" name="teacherId" value={defaultTeacherId ?? ""} />
      )}

      <div className="mt-4 flex flex-wrap justify-end gap-3">
        {cancelHref && (
          <a
            href={cancelHref}
            className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-indigo-300/70 hover:bg-white/10"
          >
            Annuler
          </a>
        )}
        <button
          type="submit"
          className="rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={selectedPositions.length === 0}
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function NotesMatrix({
  students,
  positions,
  masteryOptions,
  notes,
  setNotes,
}: {
  students: Student[];
  positions: Position[];
  masteryOptions: { value: string; label: string }[];
  notes: Record<string, Note>;
  setNotes: React.Dispatch<React.SetStateAction<Record<string, Note>>>;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h3 className="text-base font-semibold text-white">
        Notes par élève × position
      </h3>
      <p className="text-sm text-slate-300">
        Optionnel : renseigne un niveau ou un commentaire pour mettre à jour la
        progression.
      </p>
      <div className="mt-4 space-y-4">
        {students.map((student) => (
          <div key={student.id} className="space-y-2">
            <p className="text-sm font-semibold text-white">
              {student.name ?? student.email}
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {positions.map((pos) => {
                const key = `${student.id}-${pos.id}`;
                const current = notes[key];
                return (
                  <fieldset
                    key={key}
                    className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-200"
                  >
                    <legend className="text-sm font-semibold text-white">
                      {pos.name} ({pos.type})
                    </legend>
                    <label className="block">
                      Niveau
                      <select
                        value={current?.masteryLevel ?? ""}
                        onChange={(e) =>
                          setNotes((prev) => ({
                            ...prev,
                            [key]: {
                              ...(prev[key] ?? {
                                studentId: student.id,
                                positionId: pos.id,
                              }),
                              masteryLevel: e.target.value,
                            },
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white outline-none focus:border-indigo-400"
                      >
                        {masteryOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      Commentaire
                      <input
                        value={current?.comment ?? ""}
                        onChange={(e) =>
                          setNotes((prev) => ({
                            ...prev,
                            [key]: {
                              ...(prev[key] ?? {
                                studentId: student.id,
                                positionId: pos.id,
                              }),
                              comment: e.target.value,
                            },
                          }))
                        }
                        placeholder="Note courte"
                        className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white outline-none focus:border-indigo-400"
                      />
                    </label>
                  </fieldset>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
