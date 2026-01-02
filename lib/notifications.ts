import { NotificationKind } from "@prisma/client";

import { prisma } from "./prisma";

export type NotificationInput = {
  userId: string;
  kind: NotificationKind;
  title: string;
  body?: string | null;
  link?: string | null;
};

export async function createNotification(input: NotificationInput) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      kind: input.kind,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
    },
  });
}

export async function createNotifications(inputs: NotificationInput[]) {
  if (!inputs.length) return;
  await prisma.notification.createMany({
    data: inputs.map((n) => ({
      userId: n.userId,
      kind: n.kind,
      title: n.title,
      body: n.body ?? null,
      link: n.link ?? null,
    })),
    skipDuplicates: true,
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
