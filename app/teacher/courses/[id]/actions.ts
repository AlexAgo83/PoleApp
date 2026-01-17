"use server";

import { LearningStatus, NotificationKind, Prisma, SuggestionTag } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateCourseSuggestions } from "@/lib/courseGenerator";
import { createNotification, createNotifications } from "@/lib/notifications";

const updateSchema = z.object({
  id: z.string().cuid(),
  title: z.string().optional(),
  date: z.coerce.date(),
  studentIds: z.array(z.string().cuid()).default([]),
  positionIds: z.array(z.string().cuid()).min(1),
  teacherId: z.string().cuid().optional(),
  studioId: z.string().cuid(),
  photoPublicId: z.string().trim().max(512).optional(),
  disciplineId: z.string().trim().min(1),
  durationMinutes: z
    .coerce.number()
    .min(30)
    .refine((n) => n % 15 === 0, { message: "La durée doit être un multiple de 15 minutes" }),
  maxSeats: z.coerce.number().min(1).default(30),
  waitlistQuota: z.coerce.number().min(0).default(0),
  costCredits: z.coerce.number().min(0).default(100),
  notes: z
    .array(
      z.object({
        studentId: z.string().cuid(),
        positionId: z.string().cuid(),
        learningStatus: z.nativeEnum(LearningStatus).optional(),
        comment: z.string().optional(),
      })
    )
    .optional(),
});

const updateNotesSchema = z.object({
  courseId: z.string().cuid(),
  notes: z
    .array(
      z.object({
        studentId: z.string().cuid(),
        positionId: z.string().cuid(),
        learningStatus: z.nativeEnum(LearningStatus).optional(),
        comment: z.string().optional(),
      })
    )
    .default([]),
});

const formatCourseDate = (date: Date) =>
  date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export async function updateCourseAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.schoolId) {
    redirect("/access-denied");
  }
  if (session.user.role !== "TEACHER" && session.user.role !== "SCHOOL_ADMIN") {
    redirect("/access-denied");
  }

  const parsed = updateSchema.safeParse({
    id: formData.get("courseId"),
    title: formData.get("title") || undefined,
    date: formData.get("date"),
    studentIds: JSON.parse((formData.get("studentIds") as string) ?? "[]"),
    positionIds: JSON.parse((formData.get("positionIds") as string) ?? "[]"),
    teacherId: formData.get("teacherId") || undefined,
    studioId: formData.get("studioId"),
    photoPublicId: formData.get("photoPublicId")?.toString().trim() || undefined,
    disciplineId: formData.get("disciplineId")?.toString().trim() || formData.get("discipline")?.toString().trim(),
    durationMinutes: formData.get("durationMinutes") ?? 60,
    maxSeats: formData.get("maxSeats") ?? 30,
    waitlistQuota: formData.get("waitlistQuota") ?? 0,
    costCredits: formData.get("costCredits") ?? 100,
    notes: JSON.parse((formData.get("notes") as string) ?? "[]"),
  });

  if (!parsed.success) {
    throw new Error("Form invalid");
  }

  const data = parsed.data;
  const disciplineRecord = data.disciplineId
    ? await prisma.discipline.findFirst({
        where: { OR: [{ id: data.disciplineId }, { name: data.disciplineId }] },
        select: { id: true, name: true },
      })
    : null;
  const disciplineName = disciplineRecord?.name ?? null;
  const disciplineId = disciplineRecord?.id ?? data.disciplineId ?? null;

  const existing = await prisma.course.findFirst({
    where: { id: data.id, schoolId: session.user.schoolId },
    select: { id: true, teacherId: true, studioId: true },
  });
  if (!existing) {
    redirect("/access-denied");
  }
  const existingAttendanceCount = await prisma.courseAttendance.count({
    where: { courseId: data.id },
  });
  if (data.maxSeats < existingAttendanceCount) {
    throw new Error("Places max inférieures aux élèves déjà inscrits");
  }
  const studioValid = await prisma.studio.findFirst({
    where: { id: data.studioId, schoolId: session.user.schoolId },
    select: { id: true },
  });
  if (!studioValid) {
    redirect("/access-denied");
  }

  let teacherId: string | null = null;
  if (session.user.role === "TEACHER") {
    teacherId = session.user.id;
  } else if (data.teacherId) {
    teacherId = data.teacherId;
  } else if (existing.teacherId) {
    teacherId = existing.teacherId;
  }

  if (session.user.role === "SCHOOL_ADMIN" && teacherId) {
    const teacherValid = await prisma.user.findFirst({
      where: {
        id: teacherId,
        schoolId: session.user.schoolId,
        role: "TEACHER",
      },
      select: { id: true },
    });
    if (!teacherValid) {
      redirect("/access-denied");
    }
  }

  const start = new Date(data.date);
  const duration = data.durationMinutes ?? 60;
  const end = new Date(start.getTime() + duration * 60_000);
  const nearbyCourses = await prisma.course.findMany({
    where: {
      studioId: data.studioId,
      id: { not: data.id },
      date: {
        gte: new Date(start.getTime() - 4 * 60 * 60_000),
        lte: new Date(end.getTime() + 4 * 60 * 60_000),
      },
    },
    select: { id: true, date: true, durationMinutes: true },
  });
  const hasCollision = nearbyCourses.some((c) => {
    const cStart = new Date(c.date);
    const cEnd = new Date(cStart.getTime() + (c.durationMinutes ?? 60) * 60_000);
    return start < cEnd && cStart < end;
  });
  if (hasCollision) {
    redirect(`/teacher/courses/${data.id}/edit?error=collision`);
  }

  let notesSyncResult: { applied: number; skipped: number } | null = null;

  await prisma.$transaction(async (tx) => {
    try {
      const teacherToConnect = teacherId ?? existing.teacherId;
      if (!teacherToConnect) {
        throw new Error("Aucun professeur fourni pour ce cours");
      }
      await tx.course.update({
        where: { id: data.id },
        data: {
          title: data.title || null,
          date: data.date,
          teacherId: teacherToConnect,
          studioId: data.studioId,
          discipline: disciplineName,
          disciplineId,
          durationMinutes: data.durationMinutes,
          maxSeats: data.maxSeats ?? 30,
          waitlistQuota: data.waitlistQuota ?? 0,
          costCredits: data.costCredits ?? 100,
          photoPublicId: data.photoPublicId ?? null,
          isVirtual: false,
        },
      });
    } catch (error) {
      const message = (error as Error)?.message ?? "";
      const missingColumns =
        message.includes("maxSeats") || message.includes("costCredits");
      if (!missingColumns) throw error;
      const teacherToConnect = teacherId ?? existing.teacherId;
      if (!teacherToConnect) {
        throw new Error("Aucun professeur fourni pour ce cours");
      }
      await tx.course.update({
        where: { id: data.id },
        data: {
          title: data.title || null,
          date: data.date,
          teacherId: teacherToConnect,
          studioId: data.studioId,
          discipline: disciplineName,
          disciplineId,
          durationMinutes: data.durationMinutes,
          waitlistQuota: data.waitlistQuota ?? 0,
          photoPublicId: data.photoPublicId ?? null,
          isVirtual: false,
        },
      });
    }

    await tx.courseAttendance.deleteMany({ where: { courseId: data.id } });
    await tx.coursePosition.deleteMany({ where: { courseId: data.id } });
    await tx.courseNote.deleteMany({ where: { courseId: data.id } });

    if (data.studentIds.length > 0) {
      await tx.courseAttendance.createMany({
        data: data.studentIds.map((studentId) => ({
          courseId: data.id,
          studentId,
        })),
      });
    }

    await tx.coursePosition.createMany({
      data: data.positionIds.map((positionId) => ({
        courseId: data.id,
        positionId,
      })),
    });

    if (data.notes && data.notes.length > 0) {
      await tx.courseNote.createMany({
        data: data.notes.map((n) => ({
          courseId: data.id,
          studentId: n.studentId,
          positionId: n.positionId,
          learningStatus: n.learningStatus ?? LearningStatus.NOT_STARTED,
          comment: n.comment || null,
        })),
      });

      notesSyncResult = await upsertProgressFromNotes(
        tx,
        data.notes,
        session.user.id,
        data.id,
        new Date(data.date)
      );
    }
  });

  console.info("[credits] Mise à jour du cours", {
    courseId: data.id,
    studentCount: data.studentIds.length,
    durationMinutes: data.durationMinutes,
  });

  const courseLabel = data.title || "Cours";
  const dateLabel = formatCourseDate(new Date(data.date));
  if (data.studentIds.length > 0) {
    await createNotifications(
      data.studentIds.map((studentId) => ({
        userId: studentId,
        kind: NotificationKind.COURSE_UPDATED,
        title: "Cours mis à jour",
        body: `${courseLabel} — ${dateLabel}`,
        link: `/student/courses/${data.id}`,
        courseId: data.id,
      }))
    );
  }
  if (teacherId && teacherId !== session.user.id) {
    await createNotification({
      userId: teacherId,
      kind: NotificationKind.COURSE_UPDATED,
      title: "Cours mis à jour",
      body: `${courseLabel} — ${dateLabel}`,
      link: `/teacher/courses/${data.id}`,
      courseId: data.id,
    });
  }
  const admins = await prisma.user.findMany({
    where: { schoolId: session.user.schoolId, role: "SCHOOL_ADMIN" },
    select: { id: true },
  });
  if (admins.length > 0) {
    await createNotifications(
      admins.map((admin) => ({
        userId: admin.id,
        kind: NotificationKind.ADMIN_COURSE_UPDATED,
        title: "Cours mis à jour",
        body: `${courseLabel} — ${dateLabel}`,
        link: `/teacher/courses/${data.id}`,
        courseId: data.id,
      }))
    );
  }

  revalidatePath("/teacher/courses");
  revalidatePath(`/teacher/courses/${data.id}`);
  const query = new URLSearchParams();
  const { applied, skipped } = notesSyncResult ?? { applied: 0, skipped: 0 };
  if (applied > 0 || skipped > 0) {
    query.set("notesApplied", `${applied}`);
    if (skipped > 0) {
      query.set("notesSkipped", `${skipped}`);
    }
  }
  redirect(`/teacher/courses/${data.id}${query.toString() ? `?${query.toString()}` : ""}`);
}

export async function updateCourseNotesOnlyAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.schoolId) {
    redirect("/access-denied");
  }
  if (session.user.role !== "TEACHER" && session.user.role !== "SCHOOL_ADMIN") {
    redirect("/access-denied");
  }

  const hasNotesField = formData.has("notes");
  const directParsed = hasNotesField
    ? updateNotesSchema.safeParse({
        courseId: formData.get("courseId"),
        notes: JSON.parse((formData.get("notes") as string) ?? "[]"),
      })
    : null;

  let parsedNotes: z.infer<typeof updateNotesSchema>["notes"] = [];
  let courseId: string | undefined;

  if (directParsed?.success) {
    parsedNotes = directParsed.data.notes;
    courseId = directParsed.data.courseId;
  } else {
    courseId = formData.get("courseId")?.toString();
    if (!courseId) {
      throw new Error("Form invalid");
    }
    const notes: {
      studentId: string;
      positionId: string;
      learningStatus?: LearningStatus;
      comment?: string;
    }[] = [];

    for (const [key, value] of formData.entries()) {
      if (!key.startsWith("note:")) continue;
      const [, studentId, positionId] = key.split(":");
      if (!studentId || !positionId) continue;
      const status = value?.toString() ?? "";
      if (!status) continue;
      if (!Object.values(LearningStatus).includes(status as LearningStatus)) continue;
      notes.push({
        studentId,
        positionId,
        learningStatus: status as LearningStatus,
      });
    }
    parsedNotes = notes;
  }

  const course = await prisma.course.findFirst({
    where: { id: courseId, schoolId: session.user.schoolId },
    select: { id: true, teacherId: true, title: true, date: true },
  });
  if (!course) {
    redirect("/access-denied");
  }
  if (session.user.role === "TEACHER" && course.teacherId !== session.user.id) {
    redirect("/access-denied");
  }

  const courseDate = course.date ? new Date(course.date) : new Date();
  let notesSyncResult: { applied: number; skipped: number } | null = null;

  await prisma.$transaction(async (tx) => {
    await tx.courseNote.deleteMany({ where: { courseId } });
    if (parsedNotes.length > 0) {
      await tx.courseNote.createMany({
        data: parsedNotes.map((n) => ({
          courseId,
          studentId: n.studentId,
          positionId: n.positionId,
          learningStatus: n.learningStatus ?? LearningStatus.NOT_STARTED,
          comment: n.comment || null,
        })),
      });
      notesSyncResult = await upsertProgressFromNotes(
        tx,
        parsedNotes,
        session.user.id,
        courseId,
        courseDate
      );
    }
  });

  if (parsedNotes.length > 0) {
    const byStudent = new Map<string, number>();
    parsedNotes.forEach((n) => {
      byStudent.set(n.studentId, (byStudent.get(n.studentId) ?? 0) + 1);
    });
    const courseLabel = course.title || "Cours";
    await createNotifications(
      Array.from(byStudent.entries()).map(([studentId, count]) => ({
        userId: studentId,
        kind: NotificationKind.NOTE_ADDED,
        title: "Nouvelle note",
        body: `${courseLabel} — ${count} position${count > 1 ? "s" : ""}`,
        link: `/student/courses/${courseId}`,
        courseId,
      }))
    );
  }

  revalidatePath(`/teacher/courses/${courseId}`);
  const query = new URLSearchParams();
  const { applied, skipped } = notesSyncResult ?? { applied: 0, skipped: 0 };
  if (applied > 0 || skipped > 0) {
    query.set("notesApplied", `${applied}`);
    if (skipped > 0) {
      query.set("notesSkipped", `${skipped}`);
    }
  }
  redirect(`/teacher/courses/${courseId}${query.toString() ? `?${query.toString()}` : ""}`);
}

async function upsertProgressFromNotes(
  tx: Prisma.TransactionClient,
  notes: {
    studentId: string;
    positionId: string;
    learningStatus?: LearningStatus;
    comment?: string;
  }[],
  teacherId: string,
  courseId: string,
  courseDate: Date
): Promise<{ applied: number; skipped: number }> {
  if (notes.length === 0) return { applied: 0, skipped: 0 };

  const courseTime = courseDate ? new Date(courseDate).getTime() : 0;
  const byKey = new Map<
    string,
    {
      studentId: string;
      positionId: string;
      learningStatus: LearningStatus;
      comment: string | null;
      freshness: number;
    }
  >();

  for (const note of notes) {
    const key = `${note.studentId}-${note.positionId}`;
    const learningStatus = note.learningStatus ?? LearningStatus.NOT_STARTED;
    const now = Date.now();
    const freshness = Math.max(now, courseTime);
    byKey.set(key, {
      studentId: note.studentId,
      positionId: note.positionId,
      learningStatus,
      comment: note.comment?.trim() || null,
      freshness,
    });
  }

  const keys = Array.from(byKey.values()).map((n) => ({
    studentId: n.studentId,
    positionId: n.positionId,
  }));

  const existing = await tx.studentPositionProgress.findMany({
    where: {
      OR: keys.map((k) => ({ studentId: k.studentId, positionId: k.positionId })),
    },
    select: { studentId: true, positionId: true, updatedAt: true, lastCourseNoteAt: true },
  });
  const existingMap = new Map<string, number>();
  existing.forEach((p) => {
    const key = `${p.studentId}-${p.positionId}`;
    existingMap.set(
      key,
      Math.max(p.updatedAt.getTime(), p.lastCourseNoteAt ? p.lastCourseNoteAt.getTime() : 0)
    );
  });

  let applied = 0;
  let skipped = 0;
  const debugLogs = process.env.DEBUG_PROGRESS_SYNC === "1";

  for (const note of byKey.values()) {
    const key = `${note.studentId}-${note.positionId}`;
    const globalFreshness = existingMap.get(key) ?? 0;
    const shouldApply = note.freshness > globalFreshness;

    if (debugLogs) {
      console.info("[progress-sync]", {
        studentId: note.studentId,
        positionId: note.positionId,
        courseId,
        action: shouldApply ? "applied" : "skipped",
        noteFreshness: note.freshness,
        globalFreshness,
      });
    }

    if (!shouldApply) {
      skipped += 1;
      continue;
    }

    applied += 1;
    await tx.studentPositionProgress.upsert({
      where: {
        studentId_positionId: {
          studentId: note.studentId,
          positionId: note.positionId,
        },
      },
      update: {
        learningStatus: note.learningStatus,
        comment: note.comment,
        lastUpdatedByUserId: teacherId,
        lastCourseNoteAt: new Date(note.freshness),
        lastCourseNoteSourceId: courseId,
      },
      create: {
        studentId: note.studentId,
        positionId: note.positionId,
        learningStatus: note.learningStatus,
        comment: note.comment,
        lastUpdatedByUserId: teacherId,
        lastCourseNoteAt: new Date(note.freshness),
        lastCourseNoteSourceId: courseId,
      },
    });
  }

  return { applied, skipped };
}

const deleteSchema = z.object({
  courseId: z.string().cuid(),
  deleteVirtualOccurrences: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((val) => val === true || val === "true"),
});

const applySuggestionsSchema = z.object({
  courseId: z.string().cuid(),
  positionIds: z.array(z.string().cuid()).min(1),
  suggestions: z
    .array(
      z.object({
        positionId: z.string().cuid(),
        tag: z.nativeEnum(SuggestionTag),
        reason: z.string().optional(),
        favoriteCount: z.number().optional(),
        excludedForInjury: z.boolean().optional(),
        unsafeInjuries: z.array(z.string()).optional(),
        attenuatedForInjury: z.boolean().optional(),
        fallbackCategory: z.boolean().optional(),
        unsoftenedChaining: z.boolean().optional(),
      })
    )
    .default([]),
  forcePositionIds: z.array(z.string().cuid()).optional(),
});

export async function deleteCourseAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.schoolId) {
    redirect("/access-denied");
  }
  if (session.user.role !== "TEACHER" && session.user.role !== "SCHOOL_ADMIN") {
    redirect("/access-denied");
  }

  const parsed = deleteSchema.safeParse({
    courseId: formData.get("courseId"),
    deleteVirtualOccurrences: formData.get("deleteVirtualOccurrences"),
  });

  if (!parsed.success) {
    throw new Error("Form invalid");
  }

  const course = await prisma.course.findFirst({
    where: { id: parsed.data.courseId, schoolId: session.user.schoolId },
    select: { id: true, recurrenceSeriesId: true, teacherId: true, title: true, date: true },
  });
  if (!course) {
    redirect("/access-denied");
  }

  const deleteVirtualOccurrences = parsed.data.deleteVirtualOccurrences ?? false;
  const extraVirtualCourses =
    deleteVirtualOccurrences && course.recurrenceSeriesId
      ? await prisma.course
          .findMany({
            where: {
              recurrenceSeriesId: course.recurrenceSeriesId,
              isVirtual: true,
              id: { not: course.id },
              schoolId: session.user.schoolId,
            },
            select: { id: true },
          })
          .then((rows) => rows.map((r) => r.id))
      : [];
  const idsToDelete = [course.id, ...extraVirtualCourses];
  let attendancesWithCourse: { studentId: string; courseId: string }[] = [];

  await prisma.$transaction(async (tx) => {
    attendancesWithCourse = await tx.courseAttendance.findMany({
      where: { courseId: { in: idsToDelete } },
      select: { studentId: true, courseId: true },
    });

    const coursesToDelete = await tx.course.findMany({
      where: { id: { in: idsToDelete } },
      select: { id: true, costCredits: true },
    });
    const costMap = new Map<string, number>(
      coursesToDelete.map((c) => [c.id, c.costCredits ?? 0])
    );
    const refundByUser = new Map<string, number>();
    for (const attendance of attendancesWithCourse) {
      const cost = costMap.get(attendance.courseId) ?? 0;
      if (cost <= 0) continue;
      refundByUser.set(
        attendance.studentId,
        (refundByUser.get(attendance.studentId) ?? 0) + cost
      );
    }
    if (refundByUser.size > 0) {
      for (const [studentId, amount] of refundByUser) {
        await tx.user.update({
          where: { id: studentId },
          data: { credits: { increment: amount } },
        });
      }
    }

    await tx.courseAttendance.deleteMany({ where: { courseId: { in: idsToDelete } } });
    await tx.coursePosition.deleteMany({ where: { courseId: { in: idsToDelete } } });
    await tx.courseNote.deleteMany({ where: { courseId: { in: idsToDelete } } });
    // cleanup invoices linked to the course to avoid FK errors
    await tx.invoice.deleteMany({ where: { courseId: { in: idsToDelete } } });
    try {
      await tx.courseRecommendation.deleteMany({ where: { courseId: { in: idsToDelete } } });
    } catch (error) {
      const message = (error as Error)?.message ?? "";
      const tableMissing = message.includes("CourseRecommendation") || message.includes("does not exist");
      if (!tableMissing) throw error;
    }
    await tx.course.deleteMany({ where: { id: { in: idsToDelete } } });
    if (course.recurrenceSeriesId) {
      await tx.courseRecurrenceSeries.deleteMany({
        where: { id: course.recurrenceSeriesId, courses: { none: {} } },
      });
    }
  });

  const dateLabel = course.date ? formatCourseDate(new Date(course.date)) : null;
  const studentIds = Array.from(
    new Set(
      attendancesWithCourse.map((a) => a.studentId).filter(Boolean) as string[]
    )
  );
  if (studentIds.length > 0) {
    await createNotifications(
      studentIds.map((studentId) => ({
        userId: studentId,
        kind: NotificationKind.COURSE_CANCELLED,
        title: "Cours annulé",
        body: `${course.title ?? "Cours"}${dateLabel ? ` — ${dateLabel}` : ""}`,
        link: "/student/courses",
        courseId: null,
      }))
    );
  }
  if (course.teacherId && course.teacherId !== session.user.id) {
    await createNotification({
      userId: course.teacherId,
      kind: NotificationKind.COURSE_CANCELLED,
      title: "Cours annulé",
      body: `${course.title ?? "Cours"}${dateLabel ? ` — ${dateLabel}` : ""}`,
      link: "/teacher/courses",
      courseId: null,
    });
  }
  const admins = await prisma.user.findMany({
    where: { schoolId: session.user.schoolId, role: "SCHOOL_ADMIN" },
    select: { id: true },
  });
  if (admins.length > 0) {
    await createNotifications(
      admins.map((admin) => ({
        userId: admin.id,
        kind: NotificationKind.ADMIN_COURSE_CANCELLED,
        title: "Cours annulé",
        body: `${course.title ?? "Cours"}${dateLabel ? ` — ${dateLabel}` : ""}`,
        link: "/teacher/courses",
        courseId: null,
      }))
    );
  }

  revalidatePath("/teacher/courses");
  redirect("/teacher/courses/agenda?view=month");
}

export async function removeCoursePositionAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.schoolId) {
    redirect("/access-denied");
  }
  if (session.user.role !== "TEACHER" && session.user.role !== "SCHOOL_ADMIN") {
    redirect("/access-denied");
  }

  const courseId = formData.get("courseId")?.toString();
  const positionId = formData.get("positionId")?.toString();
  if (!courseId || !positionId) {
    throw new Error("Form invalid");
  }

  const course = await prisma.course.findFirst({
    where: { id: courseId, schoolId: session.user.schoolId },
    select: { id: true, teacherId: true },
  });
  if (!course) {
    redirect("/access-denied");
  }
  if (session.user.role === "TEACHER" && course.teacherId !== session.user.id) {
    redirect("/access-denied");
  }

  await prisma.$transaction(async (tx) => {
    await tx.coursePosition.deleteMany({ where: { courseId, positionId } });
    try {
      await tx.courseRecommendation.updateMany({
        where: { courseId, positionId },
        data: { appliedAt: null },
      });
    } catch (error) {
      const message = (error as Error)?.message ?? "";
      const tableMissing = message.includes("CourseRecommendation") || message.includes("does not exist");
      if (!tableMissing) throw error;
    }
  });

  revalidatePath(`/teacher/courses/${courseId}`);
  revalidatePath("/teacher/courses");
}

export async function applySuggestedPositionsAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.schoolId) {
    redirect("/access-denied");
  }
  if (session.user.role !== "TEACHER" && session.user.role !== "SCHOOL_ADMIN") {
    redirect("/access-denied");
  }

  const parsed = applySuggestionsSchema.safeParse({
    courseId: formData.get("courseId"),
    positionIds: Array.from(formData.getAll("positionIds") ?? []).map((value) => value.toString()),
    suggestions: JSON.parse((formData.get("suggestions") as string) ?? "[]"),
    forcePositionIds: Array.from(formData.getAll("forcePositionIds") ?? []).map((value) => value.toString()),
  });
  if (!parsed.success) {
    throw new Error("Form invalid");
  }

  const course = await prisma.course.findFirst({
    where: { id: parsed.data.courseId, schoolId: session.user.schoolId },
    select: { id: true, schoolId: true, positions: { select: { positionId: true } } },
  });
  if (!course) {
    redirect("/access-denied");
  }

  const existingIds = course.positions.map((p) => p.positionId);
  const suggestionsList =
    parsed.data.suggestions.length > 0
      ? parsed.data.suggestions
      : await generateCourseSuggestions({
          courseId: course.id,
          schoolId: session.user.schoolId,
          studentIds: await prisma.courseAttendance
            .findMany({
              where: { courseId: course.id },
              select: { studentId: true },
            })
            .then((rows) => rows.map((r) => r.studentId)),
          existingPositionIds: existingIds,
        });

  const suggestionMap = new Map(suggestionsList.map((s) => [s.positionId, s]));
  const forcedSet = new Set(parsed.data.forcePositionIds ?? []);
  const toInsert: string[] = [];

  for (const id of parsed.data.positionIds) {
    const suggestion = suggestionMap.get(id);
    if (!suggestion) continue;
    if (suggestion.excludedForInjury && !forcedSet.has(id)) {
      continue;
    }
    toInsert.push(id);
  }

  if (toInsert.length === 0) {
    throw new Error("Aucune suggestion valide à appliquer (sélectionnez ou forcez une position).");
  }

  await prisma.$transaction(async (tx) => {
    await tx.coursePosition.createMany({
      data: toInsert.map((positionId) => ({
        courseId: course.id,
        positionId,
      })),
      skipDuplicates: true,
    });

    try {
      await tx.courseRecommendation.deleteMany({ where: { courseId: course.id } });
      if (suggestionsList.length > 0) {
        await tx.courseRecommendation.createMany({
          data: suggestionsList.map((s) => ({
            courseId: course.id,
            positionId: s.positionId,
            tag: s.tag,
            reason: buildReasonWithFlags(s, forcedSet.has(s.positionId)),
            appliedAt: toInsert.includes(s.positionId) ? new Date() : null,
            excludedForInjury: s.excludedForInjury ?? false,
            forced: forcedSet.has(s.positionId),
          })),
          skipDuplicates: true,
        });
      }
    } catch (error) {
      const message = (error as Error)?.message ?? "";
      const tableMissing = message.includes("CourseRecommendation") || message.includes("does not exist");
      if (!tableMissing) {
        throw error;
      }
      console.warn("[courseRecommendation] table missing, skipping persistence");
    }
  });

  revalidatePath(`/teacher/courses/${course.id}`);
  revalidatePath("/teacher/courses");
  redirect(`${baseUrlForCourse(course.id)}?applied=1`);
}

function baseUrlForCourse(courseId: string) {
  return `/teacher/courses/${courseId}`;
}

function buildReasonWithFlags(
  s: {
    reason?: string | null;
    excludedForInjury?: boolean;
    unsafeInjuries?: string[];
  },
  forced: boolean
) {
  const parts: string[] = [];
  if (s.reason) parts.push(s.reason);
  if (s.excludedForInjury && s.unsafeInjuries?.length) {
    parts.push(`Incompatible blessure: ${s.unsafeInjuries.join(", ")}`);
  }
  if (forced && s.excludedForInjury) {
    parts.push("Forcé malgré blessure");
  }
  return parts.length > 0 ? parts.join(" | ") : null;
}
