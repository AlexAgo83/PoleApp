import type { ReactNode } from "react";

import AppLayout from "../app-layout";

export default function TeacherLayout({ children }: { children: ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}
