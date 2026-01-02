"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { Prisma, NotificationKind } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification, createNotifications } from "@/lib/notifications";

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
  title?: string | null;
  date: Date;
  durationMinutes: number | null;
  maxSeats?: number | null;
  costCredits?: number | null;
  waitlistQuota?: number | null;
  isVirtual?: boolean;
  teacherId?: string | null;
  teacher?: { id: string; name: string | null; email: string | null } | null;
  _count: { attendances: number; positions: number };
  attendances: { id: string; status: "CONFIRMED" | "WAITLIST"; waitlistRank: number | null }[];
};

  let course: CourseWithCounts | null = null;
  try {
    course = (await prisma.course.findUnique({
      where: { id: parsed.data.courseId, schoolId: session.user.schoolId ?? undefined },
      select: {
        id: true,
        title: true,
        date: true,
        durationMinutes: true,
        maxSeats: true,
        costCredits: true,
        waitlistQuota: true,
        isVirtual: true,
        teacherId: true,
        teacher: { select: { id: true, name: true, email: true } },
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
          title: true,
          date: true,
          durationMinutes: true,
          maxSeats: true,
          costCredits: true,
          teacherId: true,
          teacher: { select: { id: true, name: true, email: true } },
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
  let finalStatus: "CONFIRMED" | "WAITLIST" = "CONFIRMED";
  let finalWaitlistRank: number | null = null;

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
    finalStatus = isFull ? "WAITLIST" : "CONFIRMED";
    finalWaitlistRank = finalStatus === "WAITLIST" ? waitlistCount + 1 : null;

    await tx.courseAttendance.create({
      data: { courseId: course.id, studentId: session.user.id, status: finalStatus, waitlistRank: finalWaitlistRank },
    });
  });

  const studentName = session.user.name ?? session.user.email ?? "Élève";
  if (course.teacherId) {
    const teacherNotification = {
      userId: course.teacherId,
      kind: NotificationKind.COURSE_SIGNUP,
      title: "Nouvelle inscription",
      body: `${studentName} s'est inscrit(e) à ${course.title ?? "un cours"} (${new Date(course.date).toLocaleString("fr-FR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })})`,
      link: `/teacher/courses/${course.id}`,
    };
    await createNotification(teacherNotification);
  }
  const admins = await prisma.user.findMany({
    where: { schoolId: session.user.schoolId ?? undefined, role: "SCHOOL_ADMIN" },
    select: { id: true },
  });
  if (admins.length > 0) {
    await createNotifications(
      admins.map((admin) => ({
        userId: admin.id,
        kind: NotificationKind.ADMIN_COURSE_SIGNUP,
        title: "Nouvelle inscription",
        body: `${studentName} → ${course.title ?? "Cours"} (${new Date(course.date).toLocaleString("fr-FR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })})`,
        link: course.teacherId ? `/teacher/courses/${course.id}` : undefined,
      }))
    );
  }
  if (finalStatus === "WAITLIST") {
    await createNotification({
      userId: session.user.id,
      kind: NotificationKind.WAITLIST,
      title: "Inscription en liste d'attente",
      body: `${course.title ?? "Cours"} — vous êtes en file d'attente (rang ${finalWaitlistRank ?? "?"})`,
      link: `/student/courses/${course.id}`,
    });
  }

  revalidatePath("/student/courses");
  revalidatePath("/student/courses/agenda");
  revalidatePath(`/student/courses/${course.id}`);
}
