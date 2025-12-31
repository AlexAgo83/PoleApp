"use client";

import { CourseForm } from "./CourseForm";

type Student = { id: string; name: string | null; email: string };
type Position = { id: string; name: string; type: string; discipline?: string | null };
type Teacher = { id: string; name: string | null; email: string };
type Studio = { id: string; name: string };
type ProgressRecord = {
  studentId: string;
  positionId: string;
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
      {initialError === "collision" && (
        <div className="mx-1 rounded-xl border border-amber-300/50 bg-amber-500/10 p-3 text-sm font-semibold text-amber-100 shadow-lg shadow-amber-900/30 md:mx-0">
          Conflit horaire/studio détecté : choisis un autre créneau ou studio.
        </div>
      )}

      <div className="space-y-6">
        <CourseForm
          formId={formId}
          groupedPanels
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
          cancelHref={undefined}
          progressByStudent={progressByStudent}
          hideFooterActions={false}
        />
      </div>
    </div>
  );
}
