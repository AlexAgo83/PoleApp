"use server";

import { InvoiceStatus, LearningStatus, Prisma, RecurrenceFrequency } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeDefaultInvoiceAmountCents } from "@/lib/billing";

function parseJsonArray<T = unknown>(value: FormDataEntryValue | null): T[] {
  if (!value) return [];
  const raw = value.toString();
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseNumber(value: FormDataEntryValue | null, fallback: number) {
  if (value === null || value === undefined) return fallback;
  const asString = value.toString().trim();
  if (!asString) return fallback;
  const num = Number(asString);
  return Number.isFinite(num) ? num : fallback;
}

const courseSchema = z.object({
  title: z.string().trim().min(1, "Titre requis"),
  date: z.coerce.date(),
  studentIds: z.array(z.string().cuid()).default([]),
  positionIds: z.array(z.string().cuid()).default([]),
  teacherId: z.string().cuid().optional(),
  studioId: z.string().cuid(),
  photoUrl: z.string().trim().url("URL invalide").max(2048).optional(),
  disciplineId: z.string().trim().min(1),
  from: z.string().optional(),
  durationMinutes: z
    .number()
    .min(30)
    .refine((n) => n % 15 === 0, { message: "La durée doit être un multiple de 15 minutes" }),
  maxSeats: z.number().min(1).default(30),
  waitlistQuota: z.number().min(0).default(0),
  costCredits: z.number().min(0).default(100),
  isRecurring: z
    .preprocess((v) => (v === "true" || v === true ? true : false), z.boolean().optional())
    .default(false),
  recurrenceFrequency: z
    .preprocess((v) => {
      if (v === null || v === undefined) return undefined;
      const raw = v.toString().trim();
      if (!raw) return undefined;
      return raw.toUpperCase();
    }, z.enum(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"]).optional()),
  recurrenceUntil: z.preprocess((v) => {
    if (v === null || v === undefined) return undefined;
    const str = v.toString().trim();
    if (!str) return undefined;
    return str;
  }, z.coerce.date().optional()),
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

export async function createCourseAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.schoolId) {
    redirect("/access-denied");
  }
  if (session.user.role !== "TEACHER" && session.user.role !== "SCHOOL_ADMIN") {
    redirect("/access-denied");
  }

  const parsed = courseSchema.safeParse({
    title: formData.get("title") || undefined,
    date: formData.get("date"),
    studentIds: parseJsonArray(formData.get("studentIds")),
    positionIds: parseJsonArray(formData.get("positionIds")),
    teacherId: formData.get("teacherId") || undefined,
    studioId: formData.get("studioId"),
    photoUrl: formData.get("photoUrl")?.toString().trim() || undefined,
    disciplineId: formData.get("disciplineId")?.toString().trim() || formData.get("discipline")?.toString().trim(),
    durationMinutes: parseNumber(formData.get("durationMinutes"), 60),
    maxSeats: parseNumber(formData.get("maxSeats"), 30),
    waitlistQuota: parseNumber(formData.get("waitlistQuota"), 0),
    costCredits: parseNumber(formData.get("costCredits"), 100),
    notes: parseJsonArray(formData.get("notes")),
    from: formData.get("from")?.toString(),
    isRecurring: formData.get("isRecurring"),
    recurrenceFrequency: formData.get("recurrenceFrequency"),
    recurrenceUntil: formData.get("recurrenceUntil"),
  });

  if (!parsed.success) {
    console.error("[course-create] invalid form data", parsed.error.flatten());
    throw new Error("Form invalid");
  }

  const disciplineRecord = parsed.data.disciplineId
    ? await prisma.discipline.findFirst({
        where: { OR: [{ id: parsed.data.disciplineId }, { name: parsed.data.disciplineId }] },
        select: { id: true, name: true },
      })
    : null;
  const disciplineName = disciplineRecord?.name ?? null;
  const disciplineId = disciplineRecord?.id ?? parsed.data.disciplineId ?? null;

  const teacherId =
    session.user.role === "TEACHER"
      ? session.user.id
      : parsed.data.teacherId ?? null;

  if (session.user.role === "SCHOOL_ADMIN") {
    if (!teacherId) {
      redirect("/access-denied");
    }
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

  const studioValid = await prisma.studio.findFirst({
    where: { id: parsed.data.studioId, schoolId: session.user.schoolId },
    select: { id: true },
  });
  if (!studioValid) {
    redirect("/access-denied");
  }

  if (parsed.data.isRecurring) {
    if (!parsed.data.recurrenceFrequency) {
      throw new Error("Fréquence de récurrence requise");
    }
    if (!parsed.data.recurrenceUntil) {
      throw new Error("Date de fin de récurrence requise");
    }
    if (parsed.data.recurrenceUntil < parsed.data.date) {
      throw new Error("La date de fin de série doit être après la date de début");
    }
  }

  const recurrenceFrequency = parsed.data.recurrenceFrequency
    ? RecurrenceFrequency[
        parsed.data.recurrenceFrequency as keyof typeof RecurrenceFrequency
      ]
    : undefined;

  const occurrences =
    parsed.data.isRecurring && recurrenceFrequency && parsed.data.recurrenceUntil
      ? generateOccurrences(parsed.data.date, parsed.data.recurrenceUntil, recurrenceFrequency)
      : [parsed.data.date];

  const existing = await prisma.course.findMany({
    where: {
      studioId: parsed.data.studioId,
      date: {
        gte: occurrences[0],
        lte: parsed.data.recurrenceUntil ?? parsed.data.date,
      },
    },
    select: { id: true, date: true, durationMinutes: true },
  });
  const hasCollision = occurrences.some((start) => {
    const end = new Date(start.getTime() + (parsed.data.durationMinutes ?? 60) * 60_000);
    return existing.some((ex) => {
      const exEnd = new Date(ex.date.getTime() + (ex.durationMinutes ?? 60) * 60_000);
      return start < exEnd && ex.date < end;
    });
  });
  if (hasCollision) {
    const back = parsed.data.from && parsed.data.from.startsWith("/") ? parsed.data.from : "/teacher/courses/new";
    redirect(`${back}?error=collision`);
  }

  const courseId = await prisma.$transaction(async (tx) => {
    let recurrenceSeriesId: string | null = null;
    if (parsed.data.isRecurring && recurrenceFrequency && parsed.data.recurrenceUntil) {
      const series = await tx.courseRecurrenceSeries.create({
        data: {
          schoolId: session.user.schoolId!,
          teacherId: teacherId ?? session.user.id,
          frequency: recurrenceFrequency,
          until: parsed.data.recurrenceUntil,
        },
      });
      recurrenceSeriesId = series.id;
    }

    let course;
    try {
      course = await tx.course.create({
        data: {
          title: parsed.data.title || null,
          date: parsed.data.date,
          schoolId: session.user.schoolId!,
          teacherId: teacherId ?? session.user.id,
          studioId: parsed.data.studioId,
          discipline: disciplineName,
          disciplineId,
          durationMinutes: parsed.data.durationMinutes,
          maxSeats: parsed.data.maxSeats ?? 30,
          waitlistQuota: parsed.data.waitlistQuota ?? 0,
          costCredits: parsed.data.costCredits ?? 100,
          photoUrl: parsed.data.photoUrl ?? null,
          recurrenceSeriesId: recurrenceSeriesId ?? undefined,
          isVirtual: parsed.data.positionIds.length === 0,
        },
      });
    } catch (error) {
      const message = (error as Error)?.message ?? "";
      const missingColumns =
        message.includes("maxSeats") || message.includes("costCredits");
      if (!missingColumns) throw error;
      course = await tx.course.create({
        data: {
          title: parsed.data.title || null,
          date: parsed.data.date,
          schoolId: session.user.schoolId!,
          teacherId: teacherId ?? session.user.id,
          studioId: parsed.data.studioId,
          discipline: disciplineName,
          disciplineId,
          durationMinutes: parsed.data.durationMinutes,
          waitlistQuota: parsed.data.waitlistQuota ?? 0,
          photoUrl: parsed.data.photoUrl ?? null,
          recurrenceSeriesId: recurrenceSeriesId ?? undefined,
          isVirtual: parsed.data.positionIds.length === 0,
        },
      });
    }

    if (parsed.data.studentIds.length > 0) {
      await tx.courseAttendance.createMany({
        data: parsed.data.studentIds.map((studentId) => ({
          courseId: course.id,
          studentId,
        })),
      });
    }

    await tx.coursePosition.createMany({
      data: parsed.data.positionIds.map((positionId) => ({
        courseId: course.id,
        positionId,
      })),
    });

    if (parsed.data.notes && parsed.data.notes.length > 0) {
      await tx.courseNote.createMany({
        data: parsed.data.notes.map((n) => ({
          courseId: course.id,
          studentId: n.studentId,
          positionId: n.positionId,
          learningStatus: n.learningStatus ?? LearningStatus.NOT_STARTED,
          comment: n.comment || null,
        })),
      });

      await upsertProgressFromNotes(tx, parsed.data.notes, session.user.id);
    }

    const defaultAmountCents = computeDefaultInvoiceAmountCents(
      parsed.data.studentIds.length,
      parsed.data.maxSeats ?? 30
    );
    await tx.invoice.create({
      data: {
        courseId: course.id,
        amountCents: defaultAmountCents,
        currency: "EUR",
        status: InvoiceStatus.GENERATED,
        issuedAt: new Date(),
      },
    });

    if (recurrenceSeriesId && occurrences.length > 1) {
      const [, ...futureDates] = occurrences;
      for (const date of futureDates) {
        const occ = await tx.course.create({
          data: {
            title: parsed.data.title || null,
            date,
            schoolId: session.user.schoolId!,
            teacherId: teacherId ?? session.user.id,
            studioId: parsed.data.studioId,
            discipline: disciplineName,
            disciplineId,
            durationMinutes: parsed.data.durationMinutes,
            maxSeats: parsed.data.maxSeats ?? 30,
            waitlistQuota: parsed.data.waitlistQuota ?? 0,
            costCredits: parsed.data.costCredits ?? 100,
            photoUrl: parsed.data.photoUrl ?? null,
            recurrenceSeriesId,
            isVirtual: true,
          },
        });
        const occAmountCents = computeDefaultInvoiceAmountCents(0, parsed.data.maxSeats ?? 30);
        await tx.invoice.create({
          data: {
            courseId: occ.id,
            amountCents: occAmountCents,
            currency: "EUR",
            status: InvoiceStatus.GENERATED,
            issuedAt: new Date(),
          },
        });
      }
    }

    return course.id;
  });

  // Placeholder logging for future débit de crédits
  console.info("[credits] Inscription au cours", {
    courseId,
    studentCount: parsed.data.studentIds.length,
    durationMinutes: parsed.data.durationMinutes,
  });

  revalidatePath("/teacher/courses");
  const detailHref = `/teacher/courses/${courseId}`;
  redirect(detailHref);
}

function generateOccurrences(
  start: Date,
  until: Date,
  frequency: RecurrenceFrequency,
): Date[] {
  const occurrences: Date[] = [];
  let current = new Date(start);
  while (current <= until) {
    occurrences.push(new Date(current));
    if (frequency === RecurrenceFrequency.DAILY) {
      current = new Date(current.getTime() + 24 * 60 * 60_000);
    } else if (frequency === RecurrenceFrequency.WEEKLY) {
      current = new Date(current.getTime() + 7 * 24 * 60 * 60_000);
    } else if (frequency === RecurrenceFrequency.BIWEEKLY) {
      current = new Date(current.getTime() + 14 * 24 * 60 * 60_000);
    } else {
      const next = new Date(current);
      next.setMonth(next.getMonth() + 1);
      current = next;
    }
  }
  return occurrences;
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
