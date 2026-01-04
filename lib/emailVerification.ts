import crypto from "crypto";

import { prisma } from "./prisma";

function verificationExpiresAt() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

export async function createVerificationToken(userId: string, createdById?: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = verificationExpiresAt();
  await prisma.emailVerificationToken.create({
    data: {
      userId,
      token,
      expiresAt,
      createdById,
    },
  });
  return { token, expiresAt };
}

export async function verifyToken(token: string) {
  const record = await prisma.emailVerificationToken.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!record) return { ok: false, reason: "token_not_found" as const };
  if (record.expiresAt.getTime() < Date.now()) {
    await prisma.emailVerificationToken.delete({ where: { token } });
    return { ok: false, reason: "token_expired" as const };
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { verifiedAt: now, forcedVerifiedById: null },
    }),
    prisma.emailVerificationToken.deleteMany({ where: { userId: record.userId } }),
    prisma.auditLog.create({
      data: {
        action: "user:verify-email",
        target: record.userId,
        details: { token },
      },
    }),
  ]);

  return { ok: true, user: record.user };
}

export async function canResendVerification(userId: string) {
  const latest = await prisma.emailVerificationToken.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (!latest) return true;
  const cooldownMs = 10 * 60 * 1000; // 10 minutes
  return Date.now() - latest.createdAt.getTime() > cooldownMs;
}
