"use server";

import { redirect } from "next/navigation";

export default async function TeacherPresetsNewRedirect() {
  redirect("/presets/new");
}
