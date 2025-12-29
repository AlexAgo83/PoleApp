"use client";

import Link from "next/link";
import { ReactNode } from "react";

import { CourseForm } from "./CourseForm";

type Student = { id: string; name: string | null; email: string };
type Position = { id: string; name: string; type: string; discipline?: string | null };
type Teacher = { id: string; name: string | null; email: string };
type Studio = { id: string; name: string };
type ProgressRecord = {
  studentId: string;
  positionId: string;
  masteryLevel?: import("@prisma/client").MasteryLevel | null;
  learningStatus?: import("@prisma/client").LearningStatus | null;
  positionName: string;
  positionType?: string | null;
};

type Props = {
  formId: string;
  safeFrom: string;
  initialError?: string;
  students: Student[];
  positions: Position[];
  teachers: Teacher[];
  defaultTeacherId?: string | null;
  studios: Studio[];
  defaultStudioId?: string | null;
  disciplines: { name: string; color?: string }[];
  teacherFavorites: Record<string, string[]>;
  studentsWithActiveInjury: Record<string, number>;
  progressByStudent: ProgressRecord[];
  action: (formData: FormData) => Promise<void>;
};

export function CourseFormLayout({
  formId,
  safeFrom,
  students,
  positions,
  teachers,
  defaultTeacherId,
  studios,
  defaultStudioId,
  disciplines,
  teacherFavorites,
  studentsWithActiveInjury,
  progressByStudent,
  action,
  initialError,
}: Props) {
  return (
    <div className="flex min-h-screen w-full flex-col gap-4">
      <header className="panel border-indigo-400/25 bg-gradient-to-br from-slate-900/70 via-slate-900/60 to-indigo-900/40 p-6 shadow-indigo-900/40 md:p-8">
        <div className="flex flex-wrap items-start gap-3">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.14em] text-indigo-100">Professeur / Admin</p>
            <h1 className="text-3xl font-semibold text-white">Créer un cours</h1>
            <p className="text-sm text-slate-200 max-w-2xl">
              Sélectionne la date, les élèves présents, les positions abordées, puis ajoute des notes par élève/position pour mettre à jour la progression.
            </p>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Link
              href={safeFrom}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/15"
            >
              ← Retour cours
            </Link>
            <button
              type="submit"
              form={formId}
              className="inline-flex items-center rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 transition hover:brightness-110"
            >
              Créer le cours
            </button>
          </div>
        </div>
      </header>

      {initialError === "collision" && (
        <div className="mx-1 rounded-xl border border-amber-300/50 bg-amber-500/10 p-3 text-sm font-semibold text-amber-100 shadow-lg shadow-amber-900/30 md:mx-0">
          Conflit horaire/studio détecté : choisis un autre créneau ou studio.
        </div>
      )}

      <div className="space-y-6">
        <CourseForm
          formId={formId}
          groupedPanels
          hideFooterActions
          students={students}
          positions={positions}
          action={action}
          teachers={teachers}
          defaultTeacherId={defaultTeacherId}
          studios={studios}
          defaultStudioId={defaultStudioId}
          defaultPhotoUrl=""
          disciplines={disciplines}
          teacherFavorites={teacherFavorites}
          studentsWithActiveInjury={studentsWithActiveInjury}
          cancelHref={safeFrom}
          progressByStudent={progressByStudent}
        />
      </div>
    </div>
  );
}
