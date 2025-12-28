import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

import { NewCoursePageClient } from "./NewCoursePageClient";

export default async function NewCoursePage({
  searchParams,
}: {
  searchParams?: Promise<{ from?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const teacherId = session?.user?.id;
  const schoolId = session?.user?.schoolId;
  if (!teacherId || !schoolId) {
    redirect("/login");
  }
  if (session.user.role !== "TEACHER" && session.user.role !== "SCHOOL_ADMIN") {
    redirect("/login");
  }

  const resolvedSearch = (await searchParams) ?? {};
  const rawFrom = resolvedSearch.from;
  const safeFrom =
    rawFrom && rawFrom.startsWith("/") && !rawFrom.startsWith("//")
      ? rawFrom
      : "/app/teacher/courses/agenda?view=month";
  const formId = "new-course-form";

  return (
    <NewCoursePageClient
      formId={formId}
      safeFrom={safeFrom}
    />
  );
}
