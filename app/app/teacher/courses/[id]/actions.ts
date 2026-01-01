"use server";

import { LearningStatus, Prisma, SuggestionTag } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateCourseSuggestions } from "@/lib/courseGenerator";

const updateSchema = z.object({
  id: z.string().cuid(),
  title: z.string().optional(),
  date: z.coerce.date(),
  studentIds: z.array(z.string().cuid()).default([]),
  positionIds: z.array(z.string().cuid()).min(1),
  teacherId: z.string().cuid().optional(),
  studioId: z.string().cuid(),
  photoUrl: z.string().trim().url("URL invalide").max(2048).optional(),
  discipline: z.string().trim().min(1),
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
    photoUrl: formData.get("photoUrl")?.toString().trim() || undefined,
    discipline: formData.get("discipline")?.toString().trim(),
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
  const disciplineRecord = data.discipline
    ? await prisma.discipline.findFirst({
        where: { OR: [{ id: data.discipline }, { name: data.discipline }] },
        select: { id: true, name: true },
      })
    : null;
  const disciplineName = disciplineRecord?.name ?? data.discipline;
  const disciplineId = disciplineRecord?.id ?? null;

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
    redirect(`/app/teacher/courses/${data.id}/edit?error=collision`);
  }

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
          photoUrl: data.photoUrl ?? null,
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
          photoUrl: data.photoUrl ?? null,
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

      await upsertProgressFromNotes(tx, data.notes, session.user.id);
    }
  });

  console.info("[credits] Mise à jour du cours", {
    courseId: data.id,
    studentCount: data.studentIds.length,
    durationMinutes: data.durationMinutes,
  });

  revalidatePath("/app/teacher/courses");
  revalidatePath(`/app/teacher/courses/${data.id}`);
  redirect(`/app/teacher/courses/${data.id}`);
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
    select: { id: true, teacherId: true },
  });
  if (!course) {
    redirect("/access-denied");
  }
  if (session.user.role === "TEACHER" && course.teacherId !== session.user.id) {
    redirect("/access-denied");
  }

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
      await upsertProgressFromNotes(tx, parsedNotes, session.user.id);
    }
  });

  revalidatePath(`/app/teacher/courses/${courseId}`);
}

async function upsertProgressFromNotes(
  tx: Prisma.TransactionClient,
  notes: {
    studentId: string;
    positionId: string;
    learningStatus?: LearningStatus;
    comment?: string;
  }[],
  teacherId: string
) {
  for (const note of notes) {
    const learningStatus = note.learningStatus ?? LearningStatus.NOT_STARTED;

    await tx.studentPositionProgress.upsert({
      where: {
        studentId_positionId: {
          studentId: note.studentId,
          positionId: note.positionId,
        },
      },
      update: {
        learningStatus,
        comment: note.comment ?? null,
        lastUpdatedByUserId: teacherId,
      },
      create: {
        studentId: note.studentId,
        positionId: note.positionId,
        learningStatus,
        comment: note.comment ?? null,
        lastUpdatedByUserId: teacherId,
      },
    });
  }
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
    select: { id: true, recurrenceSeriesId: true },
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

  await prisma.$transaction(async (tx) => {
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

  revalidatePath("/app/teacher/courses");
  redirect("/app/teacher/courses/agenda?view=month");
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

  revalidatePath(`/app/teacher/courses/${courseId}`);
  revalidatePath("/app/teacher/courses");
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

  revalidatePath(`/app/teacher/courses/${course.id}`);
  revalidatePath("/app/teacher/courses");
  redirect(`${baseUrlForCourse(course.id)}?applied=1`);
}

function baseUrlForCourse(courseId: string) {
  return `/app/teacher/courses/${courseId}`;
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
