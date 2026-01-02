"use server";

import { redirect } from "next/navigation";

export default async function AdminPresetsRedirect() {
  redirect("/teacher/presets");
}
