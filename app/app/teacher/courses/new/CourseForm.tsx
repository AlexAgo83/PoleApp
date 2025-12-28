"use client";

import { MasteryLevel } from "@prisma/client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Student = { id: string; name: string | null; email: string };
type Position = { id: string; name: string; type: string; discipline?: string | null };
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
  disciplines?: { name: string; color?: string }[];
  teacherFavorites?: Record<string, string[]>;
  studentsWithActiveInjury?: Record<string, number>;
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
  defaultDiscipline = "",
  progressByStudent = [],
  disciplines = [],
  teacherFavorites = {},
  studentsWithActiveInjury = {},
}: Props) {
  const [selectedStudents, setSelectedStudents] =
    useState<string[]>(defaultSelectedStudents);
  const [selectedPositions, setSelectedPositions] = useState<string[]>(
    defaultSelectedPositions
  );
  const [notes, setNotes] = useState<Record<string, Note>>(defaultNotes);
  const [lastGeneratedCount, setLastGeneratedCount] = useState(0);
  const resolvedStudioId = defaultStudioId ?? studios[0]?.id ?? "";
  const [selectedTeacherId, setSelectedTeacherId] = useState(
    defaultTeacherId ?? teachers[0]?.id ?? ""
  );
  const [selectedDiscipline, setSelectedDiscipline] = useState(defaultDiscipline ?? "");
  const [showConfirm, setShowConfirm] = useState(false);
  const [allowSubmit, setAllowSubmit] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset positions when switching discipline to avoid incoherent selections
  useEffect(() => {
    setSelectedPositions([]);
    setLastGeneratedCount(0);
  }, [selectedDiscipline]);

  const masteryOptions = useMemo(
    () => [
      { value: "", label: "(non renseigné)" },
      { value: MasteryLevel.NOVELTY, label: "Nouveauté" },
      { value: MasteryLevel.INITIATED, label: "Initié" },
      { value: MasteryLevel.PASSED, label: "Passé" },
      { value: MasteryLevel.FLUID_CHOREO, label: "Fluide chorégraphié" },
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
  const hasDefaultDisciplineInList =
    defaultDiscipline &&
    disciplines.some(
      (d) => d.name.toLowerCase() === defaultDiscipline.toLowerCase()
    );
  const favoritePositionsForTeacher = useMemo(() => {
    return new Set(teacherFavorites[selectedTeacherId] ?? []);
  }, [teacherFavorites, selectedTeacherId]);
  const filteredPositions = useMemo(() => {
    if (!selectedDiscipline) return positions;
    return positions.filter(
      (p) => (p.discipline ?? "").toLowerCase() === selectedDiscipline.toLowerCase()
    );
  }, [positions, selectedDiscipline]);
  const resolvedDefaultDate = useMemo(() => {
    const dateValue = defaultDate ? new Date(defaultDate) : new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${dateValue.getFullYear()}-${pad(dateValue.getMonth() + 1)}-${pad(
      dateValue.getDate()
    )}T${pad(dateValue.getHours())}:${pad(dateValue.getMinutes())}`;
  }, [defaultDate]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!allowSubmit && selectedStudents.length > 0) {
      e.preventDefault();
      setShowConfirm(true);
      return;
    }
    setAllowSubmit(false);
  };

  const confirmSubmit = () => {
    setAllowSubmit(true);
    setShowConfirm(false);
    // requestSubmit relance le submit avec allowSubmit=true
    requestAnimationFrame(() => {
      formRef.current?.requestSubmit();
    });
  };

  return (
    <form ref={formRef} action={action} className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm text-slate-200">
          Date
          <input
            type="datetime-local"
            name="date"
            required
            defaultValue={resolvedDefaultDate}
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-indigo-400"
          />
        </label>
        <label className="text-sm text-slate-200">
          Titre (optionnel)
          <input
            type="text"
            name="title"
            required
            placeholder="Cours du soir - Spins inter"
            defaultValue={defaultTitle ?? ""}
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-indigo-400"
          />
        </label>
        <label className="text-sm text-slate-200">
          Discipline
          <select
            name="discipline"
            value={selectedDiscipline}
            onChange={(e) => setSelectedDiscipline(e.target.value)}
            required
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-indigo-400"
          >
            <option value="">Sélectionner une discipline</option>
            {disciplines.map((d) => (
              <option key={d.name} value={d.name}>
                {d.name}
              </option>
            ))}
            {!hasDefaultDisciplineInList && defaultDiscipline ? (
              <option value={defaultDiscipline}>{defaultDiscipline}</option>
            ) : null}
          </select>
        </label>
      </div>

      {teachers.length > 0 && (
        <label className="block text-sm text-slate-200">
          Professeur (admin)
          <select
            name="teacherId"
            value={selectedTeacherId}
            onChange={(e) => setSelectedTeacherId(e.target.value)}
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
          Studio
          <select
            name="studioId"
            required
            defaultValue={resolvedStudioId}
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-indigo-400"
          >
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
          <p className="mt-1 text-xs text-slate-400">Par défaut 100 crédits. Valeur minimale 0.</p>
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

      <section className="space-y-2 text-sm text-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>Élèves présents (Forcer l'inscription / Pre-filtrer & générer)</span>
          {selectedStudents.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSelectedStudents([]);
              }}
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white transition hover:border-cyan-300/70 hover:bg-white/10"
            >
              Tout désélectionner
            </button>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {students.map((student) => {
            const checked = selectedStudents.includes(student.id);
            const hasInjury = Boolean(studentsWithActiveInjury[student.id]);
            return (
              <label
                key={student.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-white/12 bg-white/8 px-3 py-2 text-sm text-white shadow-inner shadow-slate-900/20"
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
                <span className="flex items-center gap-2">
                  {student.name ?? student.email}
                  {hasInjury ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/60 bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-100">
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                        <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm-.75 5.5a.75.75 0 011.5 0v5a.75.75 0 01-1.5 0v-5zm.75 9a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                      Blessure active
                    </span>
                  ) : null}
                </span>
              </label>
            );
          })}
        </div>
      </section>

      <label className="block text-sm text-slate-200">
        Positions abordées (Filtrées par discipline)
        <div className="mt-2 flex flex-wrap items-center gap-3">
          {selectedStudents.length > 0 && (
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
                    r.masteryLevel === MasteryLevel.FLUID_CHOREO
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

              const fallbackPool = filteredPositions.map((p) => p.id);
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
          )}
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
        <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filteredPositions.map((position) => {
            const checked = selectedPositions.includes(position.id);
            const isFavorite = favoritePositionsForTeacher.has(position.id);
            return (
              <label
                key={position.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-white/12 bg-gradient-to-br from-white/10 via-slate-900/10 to-indigo-900/20 px-3 py-2 text-sm text-white shadow-inner shadow-slate-900/30"
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
                <span className="flex flex-col text-sm leading-tight">
                  <span className="flex items-center gap-2">
                    {position.name}
                    {isFavorite ? (
                      <span className="text-rose-200" title="Position favorite du professeur">
                        ♥
                      </span>
                    ) : null}
                  </span>
                  <span className="text-[11px] text-cyan-100">{position.type}</span>
                </span>
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
      {cancelHref && (
        <input type="hidden" name="from" value={cancelHref} />
      )}
      {courseId && <input type="hidden" name="courseId" value={courseId} />}
      <input type="hidden" name="notes" value={JSON.stringify(notesArray)} />
      {teachers.length === 0 && (
        <input type="hidden" name="teacherId" value={selectedTeacherId} />
      )}

      <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-white/10 pt-4">
        {cancelHref && (
          <a
            href={cancelHref}
            className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-300/70 hover:bg-white/10"
          >
            Annuler
          </a>
        )}
        <button
          type="submit"
          className="rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={selectedPositions.length === 0}
        >
          {submitLabel}
        </button>
      </div>

      {mounted &&
        showConfirm &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-2xl border border-cyan-300/20 bg-slate-900/95 p-6 shadow-2xl shadow-cyan-900/40">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-amber-500/15 p-2 text-amber-200">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                    <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm-.75 5.5a.75.75 0 011.5 0v5a.75.75 0 01-1.5 0v-5zm.75 9a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-white">Confirmer la création</h3>
                  <p className="text-sm text-slate-200">
                    Au moins un élève est inscrit manuellement sur ce cours. Confirme que tu souhaites valider le cours avec ces inscriptions forcées.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/10"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={confirmSubmit}
                  className="rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 transition hover:brightness-110"
                >
                  Confirmer
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
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
                        onChange={(e) => {
                          const raw = e.target.value as MasteryLevel | "";
                          const nextValue = raw === "" ? undefined : (raw as MasteryLevel);
                          setNotes((prev) => ({
                            ...prev,
                            [key]: {
                              ...(prev[key] ?? {
                                studentId: student.id,
                                positionId: pos.id,
                              }),
                              masteryLevel: nextValue,
                            },
                          }));
                        }}
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
