import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { CourseForm } from "../../new/CourseForm";
import { updateCourseAction } from "../actions";

type Props =
  | { params: { id: string } }
  | { params: Promise<{ id?: string }> };

export default async function EditCoursePage({ params }: Props) {
  const resolvedParams = await Promise.resolve(
    (params as { id?: string } | Promise<{ id?: string }>)
  );
  const id = resolvedParams?.id;
  const session = await getServerSession(authOptions);
  const teacherId = session?.user?.id;
  const schoolId = session?.user?.schoolId;
  const role = session?.user?.role;
  if (!teacherId || !schoolId || (role !== "TEACHER" && role !== "SCHOOL_ADMIN")) {
    redirect("/access-denied");
  }

  if (!id) {
    notFound();
  }

  const course = await prisma.course.findFirst({
    where: { id, schoolId },
    include: {
      attendances: true,
      positions: { include: { position: true } },
      notes: true,
    },
  });
  if (!course) {
    notFound();
  }

  const [students, positions] = await Promise.all([
    prisma.user.findMany({
      where: { schoolId, role: "STUDENT" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.position.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true },
    }),
  ]);

  const defaultSelectedStudents = course.attendances.map((a) => a.studentId);
  const defaultSelectedPositions = course.positions.map((p) => p.positionId);
  const defaultNotes = course.notes.reduce<Record<string, { studentId: string; positionId: string; masteryLevel?: string; comment?: string }>>(
    (acc, n) => {
      const key = `${n.studentId}-${n.positionId}`;
      acc[key] = {
        studentId: n.studentId,
        positionId: n.positionId,
        masteryLevel: n.masteryLevel ?? undefined,
        comment: n.comment ?? undefined,
      };
      return acc;
    },
    {}
  );

  // Preserve local date/time in the datetime-local input (avoid UTC shift)
  const dateObj = new Date(course.date);
  const pad = (n: number) => n.toString().padStart(2, "0");
  const defaultDate = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(
    dateObj.getDate()
  )}T${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`;

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="panel p-6">
        <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">
          Professeur / Admin
        </p>
        <h1 className="text-3xl font-semibold text-white">Éditer le cours</h1>
        <p className="text-sm text-slate-300">
          Mets à jour la date, les élèves, les positions et les notes pour ce cours.
        </p>
      </header>

      <section className="panel p-6">
        <CourseForm
          students={students}
          positions={positions}
          action={updateCourseAction}
          defaultTitle={course.title}
          defaultDate={defaultDate}
          defaultSelectedStudents={defaultSelectedStudents}
          defaultSelectedPositions={defaultSelectedPositions}
          defaultNotes={defaultNotes}
          submitLabel="Mettre à jour"
          cancelHref={`/app/teacher/courses/${course.id}`}
          courseId={course.id}
        />
      </section>

      <Link
        href={`/app/teacher/courses/${course.id}`}
        className="text-sm text-cyan-300 underline underline-offset-4"
      >
        Retour au détail
      </Link>
    </main>
  );
}
