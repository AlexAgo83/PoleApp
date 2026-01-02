import { NotificationKind } from "@prisma/client";

import { prisma } from "./prisma";

export type NotificationInput = {
  userId: string;
  kind: NotificationKind;
  title: string;
  body?: string | null;
  link?: string | null;
  courseId?: string | null;
};

export async function createNotification(input: NotificationInput) {
  return prisma.$transaction(async (tx) => {
    if (input.courseId) {
      await tx.notification.deleteMany({
        where: { userId: input.userId, kind: input.kind, courseId: input.courseId },
      });
    }
    return tx.notification.create({
      data: {
        userId: input.userId,
        kind: input.kind,
        title: input.title,
        body: input.body ?? null,
        link: input.link ?? null,
        courseId: input.courseId ?? null,
      },
    });
  });
}

export async function createNotifications(inputs: NotificationInput[]) {
  if (!inputs.length) return;
  const keyed = inputs.map((n, idx) => ({
    key: n.courseId ? `${n.userId}-${n.kind}-${n.courseId}` : `free-${idx}`,
    input: n,
  }));
  const latestByKey = new Map<string, NotificationInput>();
  keyed.forEach(({ key, input }) => {
    latestByKey.set(key, input);
  });

  const toInsert = Array.from(latestByKey.values());
  const dedupeTargets = toInsert
    .filter((n) => n.courseId)
    .map((n) => ({ userId: n.userId, kind: n.kind, courseId: n.courseId }));

  await prisma.$transaction(async (tx) => {
    if (dedupeTargets.length > 0) {
      await tx.notification.deleteMany({
        where: { OR: dedupeTargets },
      });
    }
    await tx.notification.createMany({
      data: toInsert.map((n) => ({
        userId: n.userId,
        kind: n.kind,
        title: n.title,
        body: n.body ?? null,
        link: n.link ?? null,
        courseId: n.courseId ?? null,
      })),
      skipDuplicates: true,
    });
  });
}

export async function markNotificationsRead(userId: string, ids?: string[]) {
  const where = {
    userId,
    ...(ids && ids.length > 0 ? { id: { in: ids } } : { readAt: null as Date | null }),
  };
  await prisma.notification.updateMany({
    where,
    data: { readAt: new Date() },
  });
}

export async function fetchNotifications(userId: string, limit = 20) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function deleteNotifications(userId: string, ids: string[]) {
  if (!ids.length) return;
  await prisma.notification.deleteMany({
    where: { userId, id: { in: ids } },
  });
}
