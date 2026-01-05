import { redirect } from "next/navigation";

import { verifyToken } from "@/lib/emailVerification";
import { defaultHomeForRole } from "@/lib/rbac";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams?: Promise<{ token?: string }>;
}) {
  const resolved = await Promise.resolve(searchParams);
  const token = resolved?.token;
  if (!token) {
    redirect("/login?verify=missing");
  }

  const result = await verifyToken(token);
  if (!result.ok || !result.user) {
    const reason = result.ok ? "unknown" : result.reason;
    redirect(`/login?verify=error&reason=${encodeURIComponent(reason ?? "invalid")}`);
  }

  const role = result.user.role;
  redirect(defaultHomeForRole(role));
}
