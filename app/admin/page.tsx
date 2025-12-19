import { redirect } from "next/navigation";

export default function AdminRedirectPage() {
  // legacy path, redirect to protected admin area
  redirect("/app/admin");
}
