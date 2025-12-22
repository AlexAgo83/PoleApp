"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateSchoolSchema = z.object({
  schoolId: z.string().cuid(),
  name: z.string().min(2, "Nom trop court"),
  website: z.string().trim().url({ message: "URL invalide" }).or(z.literal("")).optional(),
  photoUrl: z.string().trim().url({ message: "URL invalide" }).or(z.literal("")).optional(),
});

export async function updateSchoolAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SCHOOL_ADMIN" || !session.user.schoolId) {
    redirect("/access-denied");
  }

  const parsed = updateSchoolSchema.safeParse({
    schoolId: formData.get("schoolId"),
    name: formData.get("name"),
    website: (formData.get("website") ?? "") as string,
    photoUrl: (formData.get("photoUrl") ?? "") as string,
  });

  if (!parsed.success) {
    throw new Error("Formulaire invalide");
  }

  if (parsed.data.schoolId !== session.user.schoolId) {
    redirect("/access-denied");
  }

  const trimmedName = parsed.data.name.trim();
  const website =
    parsed.data.website && parsed.data.website.length > 0 ? parsed.data.website : null;
  const photoUrl =
    parsed.data.photoUrl && parsed.data.photoUrl.length > 0 ? parsed.data.photoUrl : null;

  try {
    await prisma.school.update({
      where: { id: parsed.data.schoolId },
      data: { name: trimmedName, website, photoUrl },
    });
  } catch (error) {
    const message = (error as Error)?.message ?? "";
    const isWebsiteUnsupported =
      message.includes("Unknown argument `website`") || message.toLowerCase().includes("website");
    const isPhotoUnsupported =
      message.includes("Unknown argument `photoUrl`") || message.toLowerCase().includes("photourl");

    if (!isWebsiteUnsupported && !isPhotoUnsupported) {
      throw error;
    }

    // Fallback if the schema/DB doesn't yet have the column.
    try {
      await prisma.$executeRaw`
        UPDATE "School" SET "name" = ${trimmedName}, "website" = ${website}::text, "photoUrl" = ${photoUrl}::text WHERE "id" = ${parsed.data.schoolId}
      `;
    } catch (rawError) {
      throw rawError;
    }
  }

  revalidatePath("/app/admin");
  revalidatePath("/app/admin/school");
}
