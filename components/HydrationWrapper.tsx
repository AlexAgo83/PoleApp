"use client";

import { useEffect, useState } from "react";

type Props = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

/**
 * Safe hydration boundary that renders a lightweight fallback on the server,
 * then swaps to the real content once the client is ready.
 */
export function HydrationWrapper({ children, fallback = null }: Props) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return (
      <div suppressHydrationWarning className="contents">
        {fallback}
      </div>
    );
  }

  return <>{children}</>;
}
