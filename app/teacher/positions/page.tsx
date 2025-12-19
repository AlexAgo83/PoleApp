import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function TeacherPositionsPage() {
  // Unifie la vue positions : prof/admin utilisent désormais /positions.
  redirect("/positions");
}
