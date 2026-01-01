import type { ReactNode } from "react";

import AppLayout from "../app-layout";

export default function TeachersLayout({ children }: { children: ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}
