import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { AuditClient } from "./AuditClient";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function MediaAuditPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/access-denied");
  }

  return <AuditClient />;
}
