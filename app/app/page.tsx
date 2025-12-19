import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { defaultHomeForRole } from "@/lib/rbac";

export default async function AppIndexPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role) {
    redirect("/login");
  }

  redirect(defaultHomeForRole(session.user.role));
}
