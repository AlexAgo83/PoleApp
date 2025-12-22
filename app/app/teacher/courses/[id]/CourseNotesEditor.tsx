"use client";

import { MasteryLevel } from "@prisma/client";
import { useMemo, useState } from "react";

type Student = { id: string; name: string | null; email: string | null };
type Position = { id: string; name: string; type: string | null };
type Note = { studentId: string; positionId: string; masteryLevel?: MasteryLevel | null; comment?: string | null };

type Props = {
  students: Student[];
  positions: Position[];
  existingNotes: Note[];
  courseId: string;
  action: (formData: FormData) => Promise<void>;
};

export function CourseNotesEditor({ students, positions, existingNotes, courseId, action }: Props) {
  const [notes, setNotes] = useState<Record<string, Note>>(() => {
    const initial: Record<string, Note> = {};
    existingNotes.forEach((n) => {
      const key = `${n.studentId}-${n.positionId}`;
      initial[key] = n;
    });
    return initial;
  });

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

  const notesArray = useMemo(
    () =>
      Object.values(notes).filter((n) => (n.masteryLevel && n.masteryLevel.length > 0) || (n.comment && n.comment.length > 0)),
    [notes]
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="notes" value={JSON.stringify(notesArray)} />
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-white">Notes par élève × position</h3>
            <p className="text-sm text-slate-300">Renseigne un niveau ou un commentaire pour mettre à jour la progression.</p>
          </div>
          <button
            type="submit"
            className="rounded-full bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-cyan-400"
            title="Enregistrer les notes"
          >
            Sauvegarder
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {students.map((student) => (
            <div key={student.id} className="space-y-2">
              <p className="text-sm font-semibold text-white">{student.name ?? student.email ?? "Élève"}</p>
              <div className="grid gap-3 md:grid-cols-2">
                {positions.map((pos) => {
                  const key = `${student.id}-${pos.id}`;
                  const current = notes[key];
                  return (
                    <fieldset key={key} className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-200">
                      <legend className="text-sm font-semibold text-white">
                        {pos.name} {pos.type ? `(${pos.type})` : ""}
                      </legend>
                      <label className="block">
                        Niveau
                        <select
                          value={current?.masteryLevel ?? ""}
                          onChange={(e) =>
                            setNotes((prev) => ({
                              ...prev,
                              [key]: {
                                ...(prev[key] ?? { studentId: student.id, positionId: pos.id }),
                                masteryLevel: e.target.value as MasteryLevel,
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
                                ...(prev[key] ?? { studentId: student.id, positionId: pos.id }),
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
    </form>
  );
}
