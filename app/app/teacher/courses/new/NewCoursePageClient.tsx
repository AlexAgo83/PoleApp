"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { CourseFormLayout } from "./CourseFormLayout";
import { createCourseAction } from "./actions";

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

type NewCourseData = {
  students: Student[];
  positions: Position[];
  teachers: Teacher[];
  studios: Studio[];
  defaultTeacherId?: string | null;
  defaultStudioId?: string | null;
  disciplines: { name: string; color?: string }[];
  teacherFavorites: Record<string, string[]>;
  studentsWithActiveInjury: Record<string, number>;
  progressByStudent: ProgressRecord[];
};

type Props = {
  formId: string;
  safeFrom: string;
};

export function NewCoursePageClient({ formId, safeFrom }: Props) {
  const [data, setData] = useState<NewCourseData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/teacher/courses/new", { cache: "no-store" });
        if (res.status === 401) {
          router.replace(`/login?from=${encodeURIComponent(safeFrom || "/app/teacher/courses/agenda?view=month")}`);
          return;
        }
        if (res.status === 403) {
          setError("Accès réservé aux professeurs ou administrateurs.");
          return;
        }
        if (!res.ok) {
          throw new Error(`Erreur serveur (${res.status})`);
        }
        const json = (await res.json()) as NewCourseData;
        if (!cancelled) {
          setData(json);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Impossible de charger les données du formulaire.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey, router, safeFrom]);

  if (loading) {
    return (
      <main className="flex min-h-screen w-full flex-col gap-4">
        <div className="panel border-indigo-400/25 bg-slate-900/70 p-6 text-white shadow-indigo-900/40 md:p-8">
          <p className="text-lg font-semibold">Chargement du formulaire…</p>
          <p className="text-sm text-slate-200">Récupération des élèves, positions et studios.</p>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="flex min-h-screen w-full flex-col gap-4">
        <div className="panel border-red-400/25 bg-slate-900/70 p-6 text-white shadow-red-900/40 md:p-8">
          <p className="text-lg font-semibold">Problème de chargement</p>
          <p className="text-sm text-slate-200">{error ?? "Aucune donnée reçue."}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setLoading(true);
                setData(null);
                setReloadKey((k) => k + 1);
              }}
              className="rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 transition hover:brightness-110"
            >
              Réessayer
            </button>
            <button
              type="button"
              onClick={() => router.replace(safeFrom || "/app/teacher/courses/agenda?view=month")}
              className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-300/70 hover:bg-white/15"
            >
              Retour
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <CourseFormLayout
      formId={formId}
      safeFrom={safeFrom}
      students={data.students}
      positions={data.positions}
      teachers={data.teachers}
      defaultTeacherId={data.defaultTeacherId}
      studios={data.studios}
      defaultStudioId={data.defaultStudioId}
      disciplines={data.disciplines}
      teacherFavorites={data.teacherFavorites}
      studentsWithActiveInjury={data.studentsWithActiveInjury}
      progressByStudent={data.progressByStudent}
      action={createCourseAction}
    />
  );
}
