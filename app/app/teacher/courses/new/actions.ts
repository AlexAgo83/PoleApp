"use server";

import { InvoiceStatus, LearningStatus, MasteryLevel, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeDefaultInvoiceAmountCents } from "@/lib/billing";

const courseSchema = z.object({
  title: z.string().optional(),
  date: z.coerce.date(),
  studentIds: z.array(z.string().cuid()).default([]),
  positionIds: z.array(z.string().cuid()).min(1),
  teacherId: z.string().cuid().optional(),
  studioId: z.string().cuid().optional().nullable(),
  photoUrl: z.string().trim().url("URL invalide").max(2048).optional(),
  durationMinutes: z
    .coerce.number()
    .min(30)
    .refine((n) => n % 15 === 0, { message: "La durée doit être un multiple de 15 minutes" }),
  maxSeats: z.coerce.number().min(1).default(30),
  costCredits: z.coerce.number().min(0).default(100),
  notes: z
    .array(
      z.object({
        studentId: z.string().cuid(),
        positionId: z.string().cuid(),
        masteryLevel: z.nativeEnum(MasteryLevel).optional(),
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
    studentIds: JSON.parse((formData.get("studentIds") as string) ?? "[]"),
    positionIds: JSON.parse((formData.get("positionIds") as string) ?? "[]"),
    teacherId: formData.get("teacherId") || undefined,
    studioId: formData.get("studioId") || null,
    photoUrl: formData.get("photoUrl")?.toString().trim() || undefined,
    durationMinutes: formData.get("durationMinutes") ?? 60,
    maxSeats: formData.get("maxSeats") ?? 30,
    costCredits: formData.get("costCredits") ?? 100,
    notes: JSON.parse((formData.get("notes") as string) ?? "[]"),
  });

  if (!parsed.success) {
    throw new Error("Form invalid");
  }

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

  if (parsed.data.studioId) {
    const studioValid = await prisma.studio.findFirst({
      where: { id: parsed.data.studioId, schoolId: session.user.schoolId },
      select: { id: true },
    });
    if (!studioValid) {
      redirect("/access-denied");
    }
  }

  const courseId = await prisma.$transaction(async (tx) => {
    let course;
    try {
      course = await tx.course.create({
        data: {
          title: parsed.data.title || null,
          date: parsed.data.date,
          schoolId: session.user.schoolId!,
          teacherId: teacherId ?? session.user.id,
          studioId: parsed.data.studioId ?? null,
          durationMinutes: parsed.data.durationMinutes,
          maxSeats: parsed.data.maxSeats ?? 30,
          costCredits: parsed.data.costCredits ?? 100,
          photoUrl: parsed.data.photoUrl ?? null,
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
          studioId: parsed.data.studioId ?? null,
          durationMinutes: parsed.data.durationMinutes,
          photoUrl: parsed.data.photoUrl ?? null,
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
          masteryLevel: n.masteryLevel ?? MasteryLevel.INITIATED,
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

    return course.id;
  });

  // Placeholder logging for future débit de crédits
  console.info("[credits] Inscription au cours", {
    courseId,
    studentCount: parsed.data.studentIds.length,
    durationMinutes: parsed.data.durationMinutes,
  });

  revalidatePath("/app/teacher/courses");
  redirect(`/app/teacher/courses`);
}

async function upsertProgressFromNotes(
  tx: Prisma.TransactionClient,
  notes: {
    studentId: string;
    positionId: string;
    masteryLevel?: MasteryLevel;
    comment?: string;
  }[],
  teacherId: string
) {
  for (const note of notes) {
    const learningStatus =
      note.masteryLevel === MasteryLevel.PASSED ||
      note.masteryLevel === MasteryLevel.FLUID ||
      note.masteryLevel === MasteryLevel.CHOREO
        ? LearningStatus.PASSED
        : LearningStatus.IN_PROGRESS;

    await tx.studentPositionProgress.upsert({
      where: {
        studentId_positionId: {
          studentId: note.studentId,
          positionId: note.positionId,
        },
      },
      update: {
        learningStatus,
        masteryLevel: note.masteryLevel ?? null,
        comment: note.comment ?? null,
        lastUpdatedByUserId: teacherId,
      },
      create: {
        studentId: note.studentId,
        positionId: note.positionId,
        learningStatus,
        masteryLevel: note.masteryLevel ?? null,
        comment: note.comment ?? null,
        lastUpdatedByUserId: teacherId,
      },
    });
  }
}
