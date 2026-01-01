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

type CourseWithCounts = {
  id: string;
  date: Date;
  durationMinutes: number | null;
  maxSeats?: number | null;
  costCredits?: number | null;
  waitlistQuota?: number | null;
  isVirtual?: boolean;
  _count: { attendances: number; positions: number };
  attendances: { id: string; status: "CONFIRMED" | "WAITLIST"; waitlistRank: number | null }[];
};

  let course: CourseWithCounts | null = null;
  try {
    course = (await prisma.course.findUnique({
      where: { id: parsed.data.courseId, schoolId: session.user.schoolId ?? undefined },
      select: {
        id: true,
        date: true,
        durationMinutes: true,
        maxSeats: true,
        costCredits: true,
        waitlistQuota: true,
        isVirtual: true,
        _count: { select: { attendances: true, positions: true } },
        attendances: {
          where: { studentId: session.user.id },
          select: { id: true, status: true, waitlistRank: true },
        },
      },
    })) as CourseWithCounts | null;
  } catch (error) {
    const isMissingColumn =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2022";
    const isValidation = error instanceof Prisma.PrismaClientValidationError;
    if (isMissingColumn || isValidation) {
      const fallback = await prisma.course.findUnique({
        where: { id: parsed.data.courseId, schoolId: session.user.schoolId ?? undefined },
        select: {
          id: true,
          date: true,
          durationMinutes: true,
          maxSeats: true,
          costCredits: true,
          _count: { select: { attendances: true, positions: true } },
          attendances: {
            where: { studentId: session.user.id },
            select: { id: true, status: true, waitlistRank: true },
          },
        },
      });
      course = fallback ? { ...fallback, waitlistQuota: 0 } : null;
    } else {
      throw error;
    }
  }

  if (!course) {
    throw new Error("Cours introuvable ou non accessible");
  }

  if (course.isVirtual || course._count.positions === 0) {
    throw new Error("Inscription indisponible tant que les positions ne sont pas définies");
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

  const cost = course.costCredits ?? 100;

  await prisma.$transaction(async (tx) => {
    const creditResult = await tx.user.updateMany({
      where: { id: session.user.id, credits: { gte: cost } },
      data: { credits: { decrement: cost } },
    });
    if (creditResult.count === 0) {
      throw new Error("Crédits insuffisants");
    }

    type LatestCourse = {
      date: Date;
      durationMinutes: number | null;
      maxSeats?: number | null;
    };

    let latest: LatestCourse | null = null;
    try {
      latest = (await tx.course.findUnique({
        where: { id: course.id },
        select: {
          date: true,
          durationMinutes: true,
          maxSeats: true,
        },
      })) as LatestCourse | null;
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
            maxSeats: true,
          },
        })) as LatestCourse | null;
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

    const confirmedCount = await tx.courseAttendance.count({
      where: { courseId: course.id, status: "CONFIRMED" },
    });
    const waitlistCount = await tx.courseAttendance.count({
      where: { courseId: course.id, status: "WAITLIST" },
    });
    const capacity = latest.maxSeats ?? 30;
    const isFull = confirmedCount >= capacity;
    const quota = typeof course.waitlistQuota === "number" ? course.waitlistQuota : 0;
    const waitlistAvailable = !quota || waitlistCount < quota;
    if (isFull && !waitlistAvailable) {
      throw new Error("Liste d'attente complète pour ce cours");
    }
    const status: "CONFIRMED" | "WAITLIST" = isFull ? "WAITLIST" : "CONFIRMED";
    const waitlistRank = status === "WAITLIST" ? waitlistCount + 1 : null;

    await tx.courseAttendance.create({
      data: { courseId: course.id, studentId: session.user.id, status, waitlistRank },
    });
  });

  revalidatePath("/student/courses");
  revalidatePath("/student/courses/agenda");
  revalidatePath(`/student/courses/${course.id}`);
}
