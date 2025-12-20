"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { Prisma } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const purchaseSchema = z.object({
  courseId: z.string().cuid(),
});

export async function purchaseCourseAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    redirect("/access-denied");
  }

  const parsed = purchaseSchema.safeParse({ courseId: formData.get("courseId") });
  if (!parsed.success) {
    throw new Error("Formulaire invalide");
  }

  let course: {
    id: string;
    date: Date;
    durationMinutes: number | null;
    maxSeats?: number | null;
    costCredits?: number | null;
    _count: { attendances: number };
    attendances: { id: string }[];
  } | null = null;
  try {
    course = (await prisma.course.findUnique({
      where: { id: parsed.data.courseId, schoolId: session.user.schoolId ?? undefined },
      select: {
        id: true,
        date: true,
        durationMinutes: true,
        maxSeats: true,
        costCredits: true,
        _count: { select: { attendances: true } },
        attendances: { where: { studentId: session.user.id }, select: { id: true } },
      },
    })) as typeof course;
  } catch (error) {
    const isMissingColumn =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2022";
    const isValidation = error instanceof Prisma.PrismaClientValidationError;
    if (isMissingColumn || isValidation) {
      course = (await prisma.course.findUnique({
        where: { id: parsed.data.courseId, schoolId: session.user.schoolId ?? undefined },
        select: {
          id: true,
          date: true,
          durationMinutes: true,
          _count: { select: { attendances: true } },
          attendances: { where: { studentId: session.user.id }, select: { id: true } },
        },
      })) as typeof course;
    } else {
      throw error;
    }
  }

  if (!course) {
    throw new Error("Cours introuvable ou non accessible");
  }

  if (course.attendances.length > 0) {
    throw new Error("Déjà inscrit à ce cours");
  }

  const now = Date.now();
  const endTime =
    new Date(course.date).getTime() + (course.durationMinutes ?? 60) * 60_000;
  if (endTime <= now) {
    throw new Error("Cours déjà passé");
  }

  const remainingSeats = (course.maxSeats ?? 30) - (course._count.attendances ?? 0);
  if (remainingSeats <= 0) {
    throw new Error("Plus de places disponibles");
  }

  const cost = course.costCredits ?? 100;

  await prisma.$transaction(async (tx) => {
    const creditResult = await tx.user.updateMany({
      where: { id: session.user.id, credits: { gte: cost } },
      data: { credits: { decrement: cost } },
    });
    if (creditResult.count === 0) {
      throw new Error("Crédits insuffisants");
    }

    let latest:
      | {
          date: Date;
          durationMinutes: number | null;
          maxSeats?: number | null;
          _count: { attendances: number };
        }
      | null = null;
    try {
      latest = (await tx.course.findUnique({
        where: { id: course.id },
        select: {
          date: true,
          durationMinutes: true,
          maxSeats: true,
          _count: { select: { attendances: true } },
        },
      })) as typeof latest;
    } catch (error) {
      const isMissingColumn =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2022";
      const isValidation = error instanceof Prisma.PrismaClientValidationError;
      if (isMissingColumn || isValidation) {
        latest = (await tx.course.findUnique({
          where: { id: course.id },
          select: {
            date: true,
            durationMinutes: true,
            _count: { select: { attendances: true } },
          },
        })) as typeof latest;
      } else {
        throw error;
      }
    }
    if (!latest) {
      throw new Error("Cours introuvable");
    }
    const latestEnd =
      new Date(latest.date).getTime() + (latest.durationMinutes ?? 60) * 60_000;
    if (latestEnd <= Date.now()) {
      throw new Error("Cours déjà passé");
    }
    if ((latest._count.attendances ?? 0) >= (latest.maxSeats ?? 30)) {
      throw new Error("Plus de places disponibles");
    }

    await tx.courseAttendance.create({
      data: { courseId: course.id, studentId: session.user.id },
    });
  });

  revalidatePath("/app/student/courses");
  revalidatePath("/app/student/courses/agenda");
  revalidatePath(`/app/student/courses/${course.id}`);
}
