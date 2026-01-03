"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function toggleFavoriteAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }
  const positionId = formData.get("positionId")?.toString();
  const redirectTo = formData.get("redirectTo")?.toString() || (positionId ? `/positions/${positionId}` : "/positions");
  if (!positionId) {
    redirect(redirectTo);
  }

  const role = session.user.role;
  if (role === "STUDENT") {
    const existing = await prisma.studentFavoritePosition.findFirst({
      where: { studentId: session.user.id, positionId },
    });
    if (existing) {
      await prisma.studentFavoritePosition.delete({ where: { studentId_positionId: { studentId: session.user.id, positionId } } });
    } else {
      await prisma.studentFavoritePosition.create({
        data: { studentId: session.user.id, positionId },
      });
    }
  } else if (role === "TEACHER") {
    const existing = await prisma.teacherFavoritePosition.findFirst({
      where: { teacherId: session.user.id, positionId },
    });
    if (existing) {
      await prisma.teacherFavoritePosition.delete({ where: { teacherId_positionId: { teacherId: session.user.id, positionId } } });
    } else {
      await prisma.teacherFavoritePosition.create({
        data: { teacherId: session.user.id, positionId },
      });
    }
  }

  revalidatePath(redirectTo);
  redirect(redirectTo);
}
